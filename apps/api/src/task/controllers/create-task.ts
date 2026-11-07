import {
  normalizeCollaborators,
  validateCollaborators,
} from "../collaboration";
import { setParentInTransaction } from "../../task-relation/parent";
import { requirementAttachmentTable } from "../../database/schema";
import {
  normalizeRequirementData,
  validateRequirementContent,
} from "../requirement-rules";
import { extractAssetIds } from "../../storage/cleanup-assets";
import { and, eq, inArray, isNull, gt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  assetTable,
  columnTable,
  customFieldDefinitionTable,
  customFieldValueTable,
  taskTable,
  projectTable,
  userTable,
} from "../../database/schema";
import {
  findNewHiddenPicks,
  isChoiceType,
  readHiddenOptions,
  readOptions,
} from "../../custom-field/choice-options";
import { publishEvent } from "../../events";
import {
  assertAssignableUser,
  getProjectWorkspaceId,
} from "../../utils/assert-assignable-user";
import type { TaskRecurrence } from "../recurrence/schema";
import {
  assertRequiredCustomFields,
  assertValidTaskStatus,
  isCustomFieldValueEmpty,
} from "../validate-task-fields";
import { claimTaskNumber } from "./claim-task-numbers";
import { nextTaskPosition } from "./next-task-position";

type CustomFieldInput = {
  fieldId: string;
  value: string;
};

function deduplicateCustomFields(
  customFields?: CustomFieldInput[],
): CustomFieldInput[] | undefined {
  if (!customFields) {
    return undefined;
  }

  const fieldsById = new Map<string, CustomFieldInput>();

  for (const customField of customFields) {
    fieldsById.set(customField.fieldId, customField);
  }

  return Array.from(fieldsById.values());
}

type TaskDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createTask(
  {
    projectId,
    currentUserId,
    userId,
    title,
    status,
    startDate,
    dueDate,
    description,
    priority,
    recurrence,
    customFields,
    draftAssetIds,
    requirementData,
    expectedWorkspaceId,
    collaboratorIds,
    parentTaskId,
    requirementAttachmentIds,
  }: {
    projectId: string;
    expectedWorkspaceId?: string;
    currentUserId: string;
    userId?: string;
    collaboratorIds?: string[];
    parentTaskId?: string;
    requirementAttachmentIds?: string[];
    title: string;
    status: string;
    startDate?: Date;
    dueDate?: Date;
    description?: string;
    priority?: string;
    recurrence?: TaskRecurrence;
    customFields?: CustomFieldInput[];
    draftAssetIds?: string[];
    requirementData?: Record<string, string | null>;
  },
  options?: { database?: TaskDatabase; deferEvent?: boolean },
) {
  const database = options?.database ?? db;
  const container = await database.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });
  if (expectedWorkspaceId && container?.workspaceId !== expectedWorkspaceId)
    throw new HTTPException(409, { message: "Project moved; reload" });
  if (container?.kind === "requirement")
    validateRequirementContent(title, description, requirementData?.type);
  const normalizedRequirementData =
    container?.kind === "requirement"
      ? normalizeRequirementData({
          ...requirementData,
          ...(dueDate !== undefined
            ? { prodPlannedAt: dueDate.toISOString() }
            : {}),
          ...(startDate !== undefined
            ? { designStartPlannedAt: startDate.toISOString() }
            : {}),
        })
      : null;
  const resolvedStatus =
    status || (container?.kind === "requirement" ? "backlog" : "to-do");
  const resolvedPriority = priority || "no-priority";
  const normalizedCustomFields = deduplicateCustomFields(customFields);

  let normalizedUserId = userId?.trim() || undefined;
  if (parentTaskId && container?.kind === "requirement")
    throw new HTTPException(400, {
      message: "Requirements cannot have parents",
    });
  const normalizedCollaborators = normalizeCollaborators(
    collaboratorIds ?? [],
    normalizedUserId ?? null,
  );
  await validateCollaborators(normalizedCollaborators, projectId);

  await assertValidTaskStatus(resolvedStatus, projectId);

  const allFields = await db
    .select()
    .from(customFieldDefinitionTable)
    .where(eq(customFieldDefinitionTable.projectId, projectId));

  for (const input of normalizedCustomFields ?? []) {
    const field = allFields.find((candidate) => candidate.id === input.fieldId);
    if (!field || !isChoiceType(field.type)) continue;
    const hidden = readHiddenOptions(
      field.hiddenOptions,
      readOptions(field.options),
    );
    if (findNewHiddenPicks(input.value, null, field.type, hidden).length > 0) {
      throw new HTTPException(400, {
        message: `Custom field "${field.name}" has a hidden option selected.`,
      });
    }
  }

  const mergedCustomFields: CustomFieldInput[] = normalizedCustomFields ?? [];
  const providedFieldIds = new Set(mergedCustomFields.map((f) => f.fieldId));

  for (const field of allFields) {
    if (
      !providedFieldIds.has(field.id) &&
      field.required &&
      field.defaultValue != null &&
      !isCustomFieldValueEmpty(
        field.defaultValue,
        field.type as
          | "number"
          | "boolean"
          | "date"
          | "dropdown"
          | "multiselect",
      )
    ) {
      mergedCustomFields.push({
        fieldId: field.id,
        value: field.defaultValue,
      });
    }
  }

  await assertRequiredCustomFields(projectId, mergedCustomFields);

  let assignee: { name: string } | undefined;

  if (normalizedUserId) {
    await assertAssignableUser(
      normalizedUserId,
      await getProjectWorkspaceId(projectId),
      projectId,
    );

    [assignee] = await db
      .select({ name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, normalizedUserId));
  }

  const column = await database.query.columnTable.findFirst({
    where: and(
      eq(columnTable.projectId, projectId),
      eq(columnTable.slug, resolvedStatus),
    ),
  });
  // A rule would never fire on a task that starts out completed.
  if (recurrence && column?.isFinal)
    throw new HTTPException(400, {
      message: "Create the task in an open column to make it repeat",
    });

  const createdTask = await database.transaction(async (tx) => {
    const taskNumber = await claimTaskNumber(projectId, tx);
    const lockedProject = await tx.query.projectTable.findFirst({
      where: eq(projectTable.id, projectId),
    });
    if (!lockedProject || lockedProject.workspaceId !== container?.workspaceId)
      throw new HTTPException(409, {
        message: "Project moved; retry creation",
      });
    const nextPosition = await nextTaskPosition(
      tx,
      projectId,
      resolvedStatus,
      column?.id ?? null,
    );

    if (parentTaskId && userId === undefined) {
      const parent = await tx.query.taskTable.findFirst({
        where: and(
          eq(taskTable.id, parentTaskId),
          eq(taskTable.projectId, projectId),
        ),
      });
      if (!parent)
        throw new HTTPException(400, {
          message: "Parent task not found in this project",
        });
      normalizedUserId = parent.userId ?? undefined;
      if (normalizedUserId)
        await assertAssignableUser(
          normalizedUserId,
          await getProjectWorkspaceId(projectId, tx),
          projectId,
          tx,
        );
    }
    const [task] = await tx
      .insert(taskTable)
      .values({
        projectId,
        userId: normalizedUserId ?? null,
        collaboratorIds: normalizeCollaborators(
          normalizedCollaborators,
          normalizedUserId ?? null,
        ),
        createdBy: currentUserId,
        updatedBy: currentUserId,
        requirementData:
          container?.kind === "requirement"
            ? {
                ...normalizedRequirementData,
                reference:
                  normalizedRequirementData?.reference ||
                  `${container.slug}-${taskNumber}`,
              }
            : null,
        title: title || "",
        status: resolvedStatus,
        columnId: column?.id ?? null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        description: description || "",
        priority: resolvedPriority,
        recurrence: recurrence ?? null,
        number: taskNumber,
        position: nextPosition,
      })
      .returning();

    if (task && parentTaskId)
      await setParentInTransaction(tx, task.id, parentTaskId, projectId);
    if (task && requirementAttachmentIds?.length) {
      if (container?.kind !== "requirement")
        throw new HTTPException(400, {
          message: "Excel attachments are for requirements",
        });
      const ids = [...new Set(requirementAttachmentIds)];
      const claimed = await tx
        .update(requirementAttachmentTable)
        .set({ taskId: task.id })
        .where(
          and(
            inArray(requirementAttachmentTable.id, ids),
            eq(requirementAttachmentTable.projectId, projectId),
            eq(requirementAttachmentTable.createdBy, currentUserId),
            gt(
              requirementAttachmentTable.createdAt,
              new Date(Date.now() - 86400000),
            ),
            isNull(requirementAttachmentTable.taskId),
          ),
        )
        .returning({ id: requirementAttachmentTable.id });
      if (claimed.length !== ids.length)
        throw new HTTPException(400, {
          message:
            "Some Excel attachments are unavailable or belong to another uploader",
        });
    }

    if (task && draftAssetIds?.length) {
      const referenced = extractAssetIds(description);
      const ids = [...new Set(draftAssetIds)].filter((id) =>
        referenced.has(id),
      );
      if (ids.length) {
        // claimTaskNumber already holds the project row lock in this transaction.
        const project = await tx.query.projectTable.findFirst({
          columns: { workspaceId: true },
          where: eq(projectTable.id, projectId),
        });
        if (!project)
          throw new HTTPException(404, { message: "Project not found" });
        const claimed = await tx
          .update(assetTable)
          .set({
            taskId: task.id,
            surface: "description",
            workspaceId: project.workspaceId,
          })
          .where(
            and(
              inArray(assetTable.id, ids),
              eq(assetTable.projectId, projectId),
              eq(assetTable.createdBy, currentUserId),
              eq(assetTable.surface, "draft"),
              isNull(assetTable.taskId),
            ),
          )
          .returning({ id: assetTable.id });
        if (claimed.length !== ids.length)
          throw new HTTPException(400, {
            message:
              "Some staged uploads are unavailable or belong to another owner/project",
          });
      }
    }

    if (task && mergedCustomFields.length) {
      await tx.insert(customFieldValueTable).values(
        mergedCustomFields.map(({ fieldId, value }) => ({
          taskId: task.id,
          fieldId,
          value: value.trim(),
        })),
      );
    }

    return task;
  });

  if (!createdTask) {
    throw new HTTPException(500, {
      message: "Failed to create task",
    });
  }

  if (!options?.deferEvent)
    await publishTaskCreated(createdTask, currentUserId);

  return {
    ...createdTask,
    assigneeName: assignee?.name,
  };
}

export async function publishTaskCreated(
  createdTask: typeof taskTable.$inferSelect,
  currentUserId: string,
) {
  await publishEvent("task.created", {
    ...createdTask,
    taskId: createdTask.id,
    userId: createdTask.userId ?? "",
    currentUserId: currentUserId,
    type: "created",
    content: null,
  });
  if (createdTask.collaboratorIds.length)
    await publishEvent("task.collaboration_changed", {
      userIds: createdTask.collaboratorIds,
      projectId: createdTask.projectId,
    });
}

export default createTask;
