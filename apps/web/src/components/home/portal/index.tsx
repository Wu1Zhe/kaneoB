import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus, Settings2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { PortalCard } from "./portal-card";
import { PortalForm } from "./portal-form";
import type { PortalLink, PortalScope } from "./types";
import { usePortal } from "./use-portal";
export function Portal({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<PortalScope>("shared");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PortalLink | "new" | null>(null);
  const [deleting, setDeleting] = useState<PortalLink | null>(null);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const { canManageSettings } = useWorkspacePermission();
  const canManage = scope === "personal" || canManageSettings();
  const { query, save, remove, reorder } = usePortal(workspaceId, scope);
  const links = query.data ?? [];
  const pending = save.isPending || remove.isPending || reorder.isPending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const shown = links.filter(
    (link) =>
      (!group || link.group === group) &&
      `${link.name} ${link.description} ${link.url}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-muted/15 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">
            {t("workspace:portal.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("workspace:portal.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {canManage && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={editing}
                onClick={() => setEditing(!editing)}
              >
                <Settings2 className="size-3.5" />
                {t(
                  editing ? "workspace:portal.done" : "workspace:portal.manage",
                )}
              </Button>
              <Button type="button" size="sm" onClick={() => setForm("new")}>
                <Plus className="size-3.5" />
                {t("workspace:portal.add")}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {(["shared", "personal"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={value === scope ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={value === scope}
              onClick={() => {
                setScope(value);
                setEditing(false);
                setGroup("");
                setSearch("");
              }}
            >
              {t(
                value === "shared"
                  ? "workspace:portal.shared"
                  : "workspace:portal.personal",
              )}
            </Button>
          ))}
        </div>
        {links.length > 0 && (
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("workspace:portal.search")}
              aria-label={t("workspace:portal.search")}
              className="ml-auto h-8 w-44"
            />
            <select
              aria-label={t("workspace:portal.group")}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="h-8 max-w-40 rounded-md border bg-background px-2 text-xs"
            >
              <option value="">{t("workspace:portal.allGroups")}</option>
              {[
                ...new Set(links.map((link) => link.group).filter(Boolean)),
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {query.isPending ? (
        <p className="py-5 text-center text-sm text-muted-foreground">
          {t("common:empty.loading")}
        </p>
      ) : query.isError ? (
        <div role="alert" className="py-4 text-sm text-destructive">
          {t("workspace:portal.loadError")}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void query.refetch()}
          >
            {t("common:error.tryAgain")}
          </Button>
        </div>
      ) : !shown.length ? (
        <p className="py-5 text-center text-sm text-muted-foreground">
          {t(
            links.length
              ? "workspace:portal.noMatches"
              : "workspace:portal.empty",
          )}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id || search || group || pending)
              return;
            const from = links.findIndex((link) => link.id === active.id),
              to = links.findIndex((link) => link.id === over.id);
            if (from >= 0 && to >= 0)
              reorder.mutate(arrayMove(links, from, to));
          }}
        >
          <SortableContext
            items={shown.map((link) => link.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {shown.map((link) => (
                <PortalCard
                  key={link.id}
                  link={link}
                  editing={canManage && editing}
                  disabled={pending}
                  sortable={!search && !group}
                  onEdit={() => setForm(link)}
                  onDelete={() => setDeleting(link)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {editing && (search || group) && (
        <p className="text-xs text-muted-foreground">
          {t("workspace:portal.sortHint")}
        </p>
      )}
      {form && (
        <PortalForm
          key={form === "new" ? "new" : form.id}
          scope={scope}
          existing={form === "new" ? undefined : form}
          pending={save.isPending}
          onClose={() => setForm(null)}
          onSave={async (input) => {
            try {
              await save.mutateAsync({
                input,
                existing: form === "new" ? undefined : form,
              });
              setForm(null);
            } catch {
              /* The mutation reports the error and preserves the form. */
            }
          }}
        />
      )}
      {deleting && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setDeleting(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("workspace:portal.delete")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("workspace:portal.deleteConfirm", { name: deleting.name })}
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={remove.isPending}
                onClick={() => setDeleting(null)}
              >
                {t("common:actions.cancel")}
              </Button>
              <Button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  void remove
                    .mutateAsync(deleting)
                    .then(() => setDeleting(null))
                    .catch(() => {});
                }}
              >
                {t("workspace:portal.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
