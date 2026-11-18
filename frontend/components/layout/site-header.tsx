"use client";

import Link from "next/link";
import Image from "next/image";

import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { SidebarUserMenu } from "@/components/layout/sidebar-user-menu";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function SiteHeader() {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <header className="bg-sidebar sticky top-0 z-50 flex w-full items-center border-b border-sidebar-border">
      <div className="flex h-(--header-height) w-full items-center justify-between gap-4 pr-4 sm:pr-6">
        <div className="flex items-center gap-2">
          <div className="flex size-12 shrink-0 items-center justify-center">
            <SidebarTrigger className="size-9 rounded-sm" />
          </div>
          <Link
            href="/"
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
            className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight text-black dark:text-white select-none"
          >
            <Image
              src="/assets/openats-logo.png"
              alt="OpenATS"
              width={32}
              height={32}
              className="size-8 object-contain dark:brightness-0 dark:invert"
            />
            OpenATS
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationsPanel />
          <SidebarUserMenu variant="header" />
        </div>
      </div>
    </header>
  );
}
