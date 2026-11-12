"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, Building02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ClientForm } from "../_components/client-form";
import { SettingsSection } from "@/app/(dashboard)/settings/general/_components/settings-section";

export default function NewClientPage() {
  const router = useRouter();
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col bg-white dark:bg-neutral-950">
      <div className="shrink-0 px-4 sm:px-8">
        <div className="max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-300 py-6 dark:border-neutral-700">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/clients" aria-label="Back to clients" />}
                  className="h-8 w-8 p-0"
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
                </Button>
                <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
                  Add Client Company
                </h1>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                Register a new client company to source candidates and post job requisitions.
              </p>
            </div>

            <div ref={setActionsSlot} className="shrink-0" />
          </header>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
        <div className="max-w-7xl pb-16">
          <div className="grid items-start gap-x-10 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0">
              <ClientForm
                isNew={true}
                actionsSlot={actionsSlot}
                onSuccess={(created) => router.push(`/clients/${created.id}`)}
              />
            </div>
            <aside className="border-t border-slate-300 xl:sticky xl:top-0 xl:border-t-0 xl:border-l xl:pl-10 dark:border-neutral-700">
              <SettingsSection
                title="Client Departments"
                description="Team structure for this client."
              >
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-neutral-800">
                  <HugeiconsIcon icon={Building02Icon} className="mx-auto size-8 text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                    Departments become available after creation
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                    Once you save this client company, you will be able to define client departments and assign jobs directly to them.
                  </p>
                </div>
              </SettingsSection>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
