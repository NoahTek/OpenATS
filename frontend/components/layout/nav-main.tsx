"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonPress } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: IconSvgElement;
  isActive?: boolean;
  items?: { title: string; url: string }[];
};

function NavCollapsibleSection({
  item,
  onItemClick,
}: {
  item: NavItem & { items: { title: string; url: string }[] };
  onItemClick?: () => void;
}) {
  const { state, isMobile } = useSidebar();
  const [open, setOpen] = React.useState(() => Boolean(item.isActive));

  // Open when active, but can still collapse
  const [wasActive, setWasActive] = React.useState(item.isActive);
  if (item.isActive !== wasActive) {
    setWasActive(item.isActive);
    if (item.isActive) setOpen(true);
  }

  // When collapsed to icon rail on desktop, render as a dropdown menu
  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem className="group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                isActive={item.isActive}
                className={`h-9 text-[15px] rounded-sm p-0 pr-2 w-full cursor-pointer ${buttonPress} group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center`}
              >
                <div className="flex size-9 shrink-0 items-center justify-center">
                  <HugeiconsIcon icon={item.icon} className="!size-[18px] shrink-0" />
                </div>
                <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.title}</span>
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
              {item.items.map((subItem) => (
                <DropdownMenuItem
                  key={subItem.title}
                  render={<Link href={subItem.url} onClick={onItemClick} />}
                  className="cursor-pointer"
                >
                  <span>{subItem.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => setOpen(next)}
      className="group/collapsible w-full"
    >
      <SidebarMenuItem className="group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              isActive={item.isActive}
              tooltip={item.title}
              className={`h-9 text-[15px] rounded-sm p-0 pr-2 w-full cursor-pointer ${buttonPress} group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center">
                <HugeiconsIcon icon={item.icon} className="!size-[18px] shrink-0" />
              </div>
              <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.title}</span>
              <ChevronRight className="size-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-data-open/collapsible:-rotate-90 group-data-[collapsible=icon]:hidden mr-1" />
            </SidebarMenuButton>
          }
        />

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  className={`h-8 rounded-sm text-[13px] px-2 ${buttonPress}`}
                  render={<Link href={subItem.url} onClick={onItemClick} />}
                >
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleItemClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  return (
    <SidebarGroup className="px-1.5 py-2">
      <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
        {items.map((item) =>
          item.items?.length ? (
            <NavCollapsibleSection
              key={item.title}
              item={{ ...item, items: item.items }}
              onItemClick={handleItemClick}
            />
          ) : (
            <SidebarMenuItem
              key={item.title}
              className="group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
            >
              <SidebarMenuButton
                isActive={item.isActive}
                tooltip={item.title}
                className={`h-9 text-[15px] p-0 pr-2 rounded-sm ${buttonPress} group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center`}
                render={<Link href={item.url} onClick={handleItemClick} />}
              >
                <div className="flex size-9 shrink-0 items-center justify-center">
                  <HugeiconsIcon icon={item.icon} className="!size-[18px] shrink-0" />
                </div>
                <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
