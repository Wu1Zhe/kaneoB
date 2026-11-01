import { PropertyRow } from "@/components/task/properties/property-row";
import { useTranslation } from "react-i18next";
import type Task from "@/types/task";
import { RequirementDateField } from "./requirement-date-field";
import { requirementStages, stageTiming } from "./requirement-fields";
import { RequirementTextField } from "./requirement-text-field";

export function RequirementProperties({ task }: { task: Task }) {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("tasks:requirement.nodeTimes")}
      className="flex flex-col gap-0.5"
    >
      <RequirementTextField
        key={`${task.id}:department`}
        task={task}
        field="department"
        compact
      />
      <RequirementTextField
        key={`${task.id}:contact`}
        task={task}
        field="contact"
        compact
      />
      <PropertyRow label={t("tasks:requirement.fields.planProvidedAt")}>
        <RequirementDateField
          task={task}
          field="planProvidedAt"
          label={t("tasks:requirement.fields.planProvidedAt")}
        />
      </PropertyRow>
      <p className="mt-3 px-2 text-[11px] text-muted-foreground">
        {t("tasks:requirement.mappingHint")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <caption className="mb-2 text-left font-medium">
            {t("tasks:requirement.nodeTimes")}
          </caption>
          <thead className="text-muted-foreground">
            <tr>
              <th className="w-14 text-left font-normal">
                {t("tasks:requirement.stage")}
              </th>
              <th className="font-normal">
                {t("tasks:requirement.planColumn")}
              </th>
              <th className="font-normal">
                {t("tasks:requirement.actualColumn")}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <th className="py-2 text-left font-normal">
                Design
                <br />
                {t("tasks:requirement.start")}
              </th>
              <td>
                <RequirementDateField
                  task={task}
                  field="designStartPlannedAt"
                  label={t("tasks:requirement.fields.designStartPlannedAt")}
                />
              </td>
              <td>
                <RequirementDateField
                  task={task}
                  field="designStartActualAt"
                  label={t("tasks:requirement.fields.designStartActualAt")}
                />
              </td>
            </tr>
            {requirementStages.map((stage) => {
              const timing = stageTiming(
                task.requirementData?.[stage.planned],
                task.requirementData?.[stage.actual],
              );
              return (
                <tr key={stage.id} className="border-t align-top">
                  <th className="py-2 text-left font-normal">
                    {stage.label}
                    {stage.id === "design" && (
                      <>
                        <br />
                        {t("tasks:requirement.finish")}
                      </>
                    )}
                  </th>
                  <td>
                    <RequirementDateField
                      task={task}
                      field={stage.planned}
                      label={`${stage.label} ${t("tasks:requirement.planned")}`}
                    />
                  </td>
                  <td>
                    <RequirementDateField
                      task={task}
                      field={stage.actual}
                      label={`${stage.label} ${t("tasks:requirement.actual")}`}
                    />
                    {["late", "onTime", "overdue"].includes(timing) && (
                      <p
                        className={
                          timing === "onTime"
                            ? "px-1 pb-1 text-success-foreground"
                            : "px-1 pb-1 text-destructive-foreground"
                        }
                      >
                        {t(`tasks:requirement.timing.${timing}`)}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t("tasks:requirement.manualHint")}
      </p>
    </section>
  );
}
