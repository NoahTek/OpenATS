"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, ArrowUpRight01Icon, Delete02Icon, GlobeIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useClient, useDeleteClient } from "@/hooks/queries/use-clients";
import { ClientForm } from "../_components/client-form";
import { ClientDepartmentsPanel } from "../_components/client-departments-panel";
import { toast } from "sonner";

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clientId = parseInt(resolvedParams.id, 10);

  const { data, isLoading } = useClient(clientId);
  const deleteClientMutation = useDeleteClient();
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

  const client = data?.data;

  const handleDelete = async () => {
    if (!client) return;
    if (
      !confirm(
        `Are you sure you want to delete ${client.name}? This will unlink any jobs associated with this client.`,
      )
    ) {
      return;
    }
    try {
      await deleteClientMutation.mutateAsync(client.id);
      toast.success("Client company deleted");
      router.push("/clients");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete client");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12 text-slate-500">
        Loading client details...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-medium text-slate-900 dark:text-neutral-100">
          Client not found
        </h2>
        <Button render={<Link href="/clients" />} className="mt-4" variant="outline">
          Return to Clients
        </Button>
      </div>
    );
  }

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
                  {client.name}
                </h1>
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <HugeiconsIcon icon={GlobeIcon} className="size-3.5" />
                    Visit Website
                  </a>
                )}
                {client.slug && (
                  <Link
                    href={`/careers/clients/${client.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
                    Public Careers Page
                  </Link>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                Manage company details and departments for {client.name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div ref={setActionsSlot} className="shrink-0" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-9 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4 mr-1.5" />
                Delete
              </Button>
            </div>
          </header>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
        <div className="max-w-7xl pb-16">
          <div className="grid items-start gap-x-10 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0">
              <ClientForm
                key={client.id}
                client={client}
                isNew={false}
                actionsSlot={actionsSlot}
              />
            </div>
            <aside className="border-t border-slate-300 xl:sticky xl:top-0 xl:border-t-0 xl:border-l xl:pl-10 dark:border-neutral-700">
              <ClientDepartmentsPanel clientId={client.id} />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
