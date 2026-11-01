import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomFieldChip } from "@/components/custom-fields/custom-field-chip";
import { findMissingRequiredFields } from "@/components/custom-fields/missing-required-fields";
import type { CustomFieldDefinition } from "@/components/project/custom-fields/types";
import useGetCustomFieldsByProject from "@/hooks/queries/custom-field/use-get-custom-fields-by-project";
import { useConvertIdea, useIdea } from "@/hooks/queries/ideas/use-ideas";
import { HttpError } from "@/lib/http-error";
import { toast } from "@/lib/toast";
export function ConvertIdeaDialog({
  projectId,
  workspaceId,
  ideaId,
  onClose,
}: {
  projectId: string;
  workspaceId: string;
  ideaId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const idea = useIdea(projectId, ideaId);
  const custom = useGetCustomFieldsByProject(projectId);
  const conversion = useConvertIdea(projectId);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [showMissing, setShowMissing] = useState(false);
  const fields = (custom.data ?? []) as CustomFieldDefinition[];
  const values = Object.fromEntries(
    fields.map((field) => [
      field.id,
      inputs[field.id] ??
        field.defaultValue ??
        (field.type === "boolean" ? "false" : ""),
    ]),
  );
  const missing = findMissingRequiredFields(fields, values);
  const submit = async () => {
    if (
      !idea.data ||
      custom.isPending ||
      custom.isError ||
      conversion.isPending
    )
      return;
    if (missing.length) {
      setShowMissing(true);
      return;
    }
    try {
      const result = await conversion.mutateAsync({
        ideaId,
        input: {
          version: idea.data.version,
          customFields: fields.map((field) => ({
            fieldId: field.id,
            value: values[field.id]!,
          })),
        },
      });
      toast.success(
        t(result.existing ? "ideas:alreadyConverted" : "ideas:converted"),
      );
      onClose();
      await navigate({
        to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
        params: { workspaceId, projectId, taskId: result.taskId },
      });
    } catch (error) {
      toast.error(
        error instanceof HttpError && error.status === 409
          ? t("ideas:conversionConflict")
          : t("ideas:convertError"),
      );
    }
  };
  const failed = idea.isError || custom.isError;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !conversion.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={!conversion.isPending}>
        <DialogHeader>
          <DialogTitle>{t("ideas:adopt")}</DialogTitle>
          <DialogDescription>{t("ideas:convertHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          {failed ? (
            <div role="alert">
              <p>{t("ideas:loadError")}</p>
              <Button
                variant="outline"
                onClick={() => {
                  void idea.refetch();
                  void custom.refetch();
                }}
              >
                {t("ideas:retry")}
              </Button>
            </div>
          ) : idea.data ? (
            <>
              <p className="break-words font-medium">{idea.data.title}</p>
              {!!fields.length && (
                <div className="flex flex-wrap gap-2">
                  {fields.map((field) => (
                    <CustomFieldChip
                      key={field.id}
                      field={field}
                      value={values[field.id]!}
                      onChange={(value) =>
                        setInputs((previous) => ({
                          ...previous,
                          [field.id]: value,
                        }))
                      }
                      disabled={conversion.isPending}
                      invalid={
                        showMissing &&
                        missing.some((item) => item.id === field.id)
                      }
                    />
                  ))}
                </div>
              )}
              {showMissing && missing.length > 0 && (
                <p role="alert" className="text-xs text-destructive-foreground">
                  {t("tasks:customFields.missingRequired")}
                </p>
              )}
            </>
          ) : (
            <p role="status">{t("ideas:loading")}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={conversion.isPending}
            onClick={onClose}
          >
            {t("common:actions.cancel")}
          </Button>
          <Button
            disabled={!idea.data || custom.isPending || failed}
            loading={conversion.isPending}
            onClick={() => {
              void submit();
            }}
          >
            {t("ideas:confirmConvert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
