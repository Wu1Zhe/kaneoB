import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIdea } from "@/hooks/queries/ideas/use-ideas";
import { IdeaEditor } from "./idea-editor";
export function IdeaDialog({
  projectId,
  workspaceId,
  ideaId,
  initialTitle,
  onClose,
  onConvert,
}: {
  projectId: string;
  workspaceId: string;
  ideaId?: string;
  initialTitle?: string;
  onClose: () => void;
  onConvert: (ideaId: string) => void;
}) {
  const { t } = useTranslation();
  const query = useIdea(projectId, ideaId);
  if (!ideaId || query.data)
    return (
      <IdeaEditor
        key={ideaId ?? "new"}
        idea={query.data}
        projectId={projectId}
        workspaceId={workspaceId}
        initialTitle={initialTitle}
        onClose={onClose}
        onSaved={onClose}
        onConvert={() => {
          if (ideaId) onConvert(ideaId);
        }}
      />
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ideas:edit")}</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          {query.isError ? (
            <>
              <p role="alert">{t("ideas:loadError")}</p>
              <Button onClick={() => query.refetch()}>
                {t("ideas:retry")}
              </Button>
            </>
          ) : (
            <p role="status">{t("ideas:loading")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
