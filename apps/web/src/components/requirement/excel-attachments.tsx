import { client } from "@kaneo/libs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { HttpError } from "@/lib/http-error";
import { toast } from "@/lib/toast";
export type ExcelAttachment = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  taskId: string | null;
};
type Props = {
  projectId: string;
  taskId?: string;
  value?: ExcelAttachment[];
  onChange?: (files: ExcelAttachment[]) => void;
  onUploadingChange?: (pending: boolean) => void;
  disabled?: boolean;
};
export function ExcelAttachments({
  projectId,
  taskId,
  value = [],
  onChange,
  onUploadingChange,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const queryClient = useQueryClient();
  const { canUpdateTasks } = useWorkspacePermission();
  const query = useQuery({
    queryKey: ["requirement-attachments", projectId, taskId],
    enabled: Boolean(taskId),
    queryFn: async () => {
      const response = await client["requirement-attachments"][
        ":projectId"
      ].task[":id"].$get({ param: { projectId, id: taskId! } });
      if (!response.ok) throw await HttpError.fromResponse(response);
      return response.json();
    },
  });
  const files = taskId ? (query.data ?? []) : value;
  const upload = async (input: HTMLInputElement) => {
    const picked = Array.from(input.files ?? []);
    input.value = "";
    if (!picked.length) return;
    if (files.length + picked.length > 20) {
      toast.error(t("tasks:excel.tooMany"));
      return;
    }
    setPending(true);
    onUploadingChange?.(true);
    let next = [...files];
    try {
      for (const file of picked) {
        if (
          !/\.(xlsx|xls)$/i.test(file.name) ||
          !file.size ||
          file.size > 10 * 1024 * 1024
        )
          throw new Error(t("tasks:excel.invalid"));
        const response = await client["requirement-attachments"][
          ":projectId"
        ].draft.$post({ param: { projectId }, form: { file } });
        if (!response.ok) throw await HttpError.fromResponse(response);
        const saved = await response.json();
        if (!active.current) return;
        next = [...next, saved];
        onChange?.(next);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("tasks:excel.failed"),
      );
    } finally {
      if (active.current) {
        setPending(false);
        onUploadingChange?.(false);
      }
    }
  };
  const remove = async (file: ExcelAttachment) => {
    setPending(true);
    onUploadingChange?.(true);
    try {
      const response = await client["requirement-attachments"][
        ":projectId"
      ].file[":id"].$delete({ param: { projectId, id: file.id } });
      if (!response.ok) throw await HttpError.fromResponse(response);
      if (taskId)
        await queryClient.invalidateQueries({
          queryKey: ["requirement-attachments", projectId, taskId],
        });
      else onChange?.(files.filter((f) => f.id !== file.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("tasks:excel.failed"),
      );
    } finally {
      if (active.current) {
        setPending(false);
        onUploadingChange?.(false);
      }
    }
  };
  return (
    <section className="my-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t("tasks:excel.title")}</h3>
        {!taskId && (
          <label className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent">
            <Upload className="size-3.5" />
            {pending ? t("tasks:excel.uploading") : t("tasks:excel.upload")}
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              disabled={pending || disabled || !projectId}
              className="sr-only"
              onChange={(e) => void upload(e.currentTarget)}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("tasks:excel.hint")}</p>
      {query.isError && taskId && (
        <p role="alert" className="text-sm text-destructive">
          {t("tasks:excel.failed")}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void query.refetch()}
          >
            {t("common:error.tryAgain")}
          </Button>
        </p>
      )}
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <FileSpreadsheet className="size-4 shrink-0 text-green-600" />
          <a
            href={client["requirement-attachments"][":projectId"].file[":id"]
              .$url({ param: { projectId, id: file.id } })
              .toString()}
            className="min-w-0 flex-1 truncate hover:underline"
            title={file.filename}
          >
            {file.filename}
          </a>
          <span className="shrink-0 text-xs text-muted-foreground">
            {Math.ceil(file.size / 1024)} KB
          </span>
          {(!taskId || canUpdateTasks()) && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={pending || disabled}
              aria-label={t("tasks:excel.remove", { name: file.filename })}
              onClick={() => void remove(file)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}
