"use client";

import * as React from "react";
import {
  Home01Icon,
  BriefcaseBusinessIcon,
  Building02Icon,
  UserSearch01Icon,
  UserGroupIcon,
  Settings02Icon,
  Layout03Icon,
  Quiz03Icon,
  Agreement02Icon,
  Calendar02Icon,
  SidebarLeftIcon,
  SidebarRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { usePathname } from "next/navigation";

import { NavMain } from "@/components/layout/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRole } from "@/hooks/use-role";

const navMainData = [
  {
    title: "Overview",
    url: "/",
    icon: Home01Icon,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Building02Icon,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: BriefcaseBusinessIcon,
  },
  {
    title: "Candidates",
    url: "/candidates",
    icon: UserGroupIcon,
  },
  {
    title: "Talent Pool",
    url: "/talent-pool",
    icon: UserSearch01Icon,
  },
  {
    title: "Interviews",
    url: "/interviews",
    icon: Calendar02Icon,
  },
  {
    title: "Assessments",
    url: "/assessments",
    icon: Quiz03Icon,
  },
  {
    title: "Manage Offers",
    url: "/offers",
    icon: Agreement02Icon,
  },
  {
    title: "Templates",
    url: "/templates",
    icon: Layout03Icon,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings02Icon,
    items: [
      {
        title: "General",
        url: "/settings/general",
      },
      {
        title: "Profile",
        url: "/settings/profile",
      },
      {
        title: "Careers Page",
        url: "/settings/careers-page",
      },
      {
        title: "User Management",
        url: "/settings/user-management",
      },
      {
        title: "Integrations",
        url: "/settings/integrations",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isSuperAdmin, isManager } = useRole();
  const { state, collapseMode, toggleSidebar, isMobile, setOpenMobile } =
    useSidebar();

  // Close mobile sidebar on route change
  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const items = navMainData
    .filter((item) => {
      if (item.url === "/offers") return isManager;
      return true;
    })
    .map((item) => {
      if (item.items) {
        return {
          ...item,
          items: item.items.filter((sub) => {
            if (sub.url === "/settings/user-management") return isSuperAdmin;
            if (sub.url === "/settings/careers-page") return isManager;
            return true;
          }),
        };
      }
      return item;
    })
    .map((item) => ({
      ...item,
      isActive:
        item.url === "/"
          ? pathname === "/"
          : pathname === item.url || pathname.startsWith(item.url + "/"),
    }));

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarContent className="pt-4">
        <NavMain items={items} />
      </SidebarContent>
      {!isMobile && (
        <SidebarFooter className="border-t border-sidebar-border px-1.5 py-2">
          <SidebarMenu>
            <SidebarMenuItem className="group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <SidebarMenuButton
                tooltip={
                  state === "expanded"
                    ? collapseMode === "icon"
                      ? "Collapse to icon rail"
                      : "Collapse sidebar"
                    : "Expand sidebar"
                }
                onClick={toggleSidebar}
                className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-0 pr-2 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
              >
                <div className="flex size-9 shrink-0 items-center justify-center">
                  <HugeiconsIcon
                    icon={state === "expanded" ? SidebarLeftIcon : SidebarRight01Icon}
                    className="!size-4 shrink-0"
                  />
                </div>
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  {state === "expanded"
                    ? collapseMode === "icon"
                      ? "Collapse to icons"
                      : "Collapse sidebar"
                    : "Expand"}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
