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
import {
  PORTAL_COLORS,
  PORTAL_ICONS,
  type PortalInput,
  type PortalLink,
  type PortalScope,
} from "./types";
type Props = {
  scope: PortalScope;
  existing?: PortalLink;
  pending: boolean;
  onClose: () => void;
  onSave: (input: PortalInput) => Promise<void>;
};
export function PortalForm({
  scope,
  existing,
  pending,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const iconLabels = {
    Globe: t("workspace:portal.icons.Globe"),
    Building2: t("workspace:portal.icons.Building2"),
    BookOpen: t("workspace:portal.icons.BookOpen"),
    Code: t("workspace:portal.icons.Code"),
    Mail: t("workspace:portal.icons.Mail"),
    Monitor: t("workspace:portal.icons.Monitor"),
    Folder: t("workspace:portal.icons.Folder"),
    ChartColumn: t("workspace:portal.icons.ChartColumn"),
  };
  const colorLabels = {
    blue: t("workspace:portal.colors.blue"),
    green: t("workspace:portal.colors.green"),
    orange: t("workspace:portal.colors.orange"),
    purple: t("workspace:portal.colors.purple"),
    slate: t("workspace:portal.colors.slate"),
    rose: t("workspace:portal.colors.rose"),
  };
  const [input, setInput] = useState<PortalInput>({
    scope,
    name: existing?.name ?? "",
    url: existing?.url ?? "",
    description: existing?.description ?? "",
    group: existing?.group ?? "",
    icon: PORTAL_ICONS.find((value) => value === existing?.icon) ?? "Globe",
    color: PORTAL_COLORS.find((value) => value === existing?.color) ?? "blue",
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(existing ? "workspace:portal.edit" : "workspace:portal.add")}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave(input);
          }}
          className="space-y-4"
        >
          <label className="block space-y-1 text-sm">
            <span>{t("workspace:portal.name")} *</span>
            <Input
              required
              maxLength={80}
              value={input.name}
              onChange={(e) => setInput({ ...input, name: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("workspace:portal.url")} *</span>
            <Input
              required
              type="url"
              maxLength={2048}
              placeholder="https://"
              value={input.url}
              onChange={(e) => setInput({ ...input, url: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("workspace:portal.description")}</span>
            <Input
              maxLength={200}
              value={input.description}
              onChange={(e) =>
                setInput({ ...input, description: e.target.value })
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("workspace:portal.group")}</span>
            <Input
              maxLength={60}
              value={input.group}
              onChange={(e) => setInput({ ...input, group: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span>{t("workspace:portal.icon")}</span>
              <select
                value={input.icon}
                onChange={(e) =>
                  setInput({
                    ...input,
                    icon: e.target.value as PortalInput["icon"],
                  })
                }
                className="h-9 w-full rounded-md border bg-background px-2"
              >
                {PORTAL_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {iconLabels[icon]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>{t("workspace:portal.color")}</span>
              <select
                value={input.color}
                onChange={(e) =>
                  setInput({
                    ...input,
                    color: e.target.value as PortalInput["color"],
                  })
                }
                className="h-9 w-full rounded-md border bg-background px-2"
              >
                {PORTAL_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {colorLabels[color]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              scope === "shared"
                ? "workspace:portal.sharedHint"
                : "workspace:portal.personalHint",
            )}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("common:actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
