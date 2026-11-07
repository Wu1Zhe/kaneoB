import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect } from "react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { ThemeToggleDropdown } from "@/components/theme-toggle-dropdown";
import { TrialCard } from "@/components/trial-card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { VersionDisplay } from "@/components/version-display";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar();
  const { t } = useTranslation();
  const pathname = useLocation({ select: (location) => location.pathname });

  // Navigation that doesn't start from a sidebar link (creating a project,
  // the command palette) must still dismiss the mobile drawer.
  useEffect(() => {
    if (pathname) setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="border-none"
      {...props}
    >
      <SidebarHeader className="pt-1 pb-1.5">
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto gap-1 py-1">
        <NavMain />
        <NavProjects />
        <NavProjects kind="requirement" />
      </SidebarContent>
      <SidebarFooter>
        <Link
          to="/dashboard/updates"
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <History className="size-4" />
          {t("workspace:updates.title")}
        </Link>
        <NavSecondary />
        <TrialCard />
        <div className="flex items-center justify-between">
          <VersionDisplay />
          <ThemeToggleDropdown />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
