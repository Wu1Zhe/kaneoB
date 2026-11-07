import { Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";

type Props = {
  projectId: string;
  workspaceId: string;
  ownerId: string | null;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};
export function CollaboratorSelect({
  projectId,
  workspaceId,
  ownerId,
  value,
  onChange,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const {
    data: members = [],
    isPending,
    isError,
  } = useGetProjectMembers({ workspaceId, projectId });
  const selected = members.filter(
    (m) => value.includes(m.id) && m.id !== ownerId,
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isPending || isError}
          className="max-w-full justify-start gap-2 px-2 font-normal"
        >
          <Users className="size-4 shrink-0" />
          <span className="truncate">
            {selected.length
              ? selected.map((m) => m.name ?? m.id).join("、")
              : t("tasks:collaboration.add")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <Input
          aria-label={t("tasks:collaboration.search")}
          placeholder={t("tasks:collaboration.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-2 max-h-64 overflow-auto">
          {members
            .filter(
              (m) =>
                m.id !== ownerId &&
                m.name?.toLowerCase().includes(search.toLowerCase()),
            )
            .map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={value.includes(m.id)}
                disabled={disabled}
                onClick={() =>
                  onChange(
                    value.includes(m.id)
                      ? value.filter((id) => id !== m.id)
                      : [...value, m.id],
                  )
                }
                className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <span>{m.name}</span>
                <span>{value.includes(m.id) ? "✓" : ""}</span>
              </button>
            ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("tasks:collaboration.hint")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
