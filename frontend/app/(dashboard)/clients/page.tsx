"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClients, useDeleteClient } from "@/hooks/queries/use-clients";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Add01Icon,
  Delete02Icon,
  GlobeIcon,
  Mail01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function ClientsPage() {
  const router = useRouter();
  const { data, isLoading } = useClients();
  const clients = data?.data ?? [];
  const deleteClientMutation = useDeleteClient();

  const handleDelete = async (e: React.MouseEvent, id: number, clientName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${clientName}? This will unlink any jobs associated with this client.`)) {
      return;
    }
    try {
      await deleteClientMutation.mutateAsync(id);
      toast.success("Client deleted successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete client");
    }
  };

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col bg-white dark:bg-neutral-950">
      <div className="shrink-0 px-4 sm:px-8">
        <div className="max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-300 py-6 dark:border-neutral-700">
            <div className="min-w-0">
              <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
                Clients
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                Manage client companies and track departments your agency sources candidates for.
              </p>
            </div>
            <Button render={<Link href="/clients/new" />} className="gap-2">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Add Client Company
            </Button>
          </header>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
        <div className="max-w-7xl py-6">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading client companies...</p>
          ) : clients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-neutral-800">
              <h3 className="text-lg font-medium text-slate-900 dark:text-neutral-100">
                No client companies added yet
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Add your first client company to manage its departments and post job requisitions.
              </p>
              <Button render={<Link href="/clients/new" />} className="mt-4 gap-2">
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Add Client Company
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact / Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-900"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                        <span className="hover:underline font-semibold">{client.name}</span>
                        {client.description && (
                          <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-0.5">
                            {client.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400">
                            <HugeiconsIcon icon={Mail01Icon} className="size-3.5" />
                            {client.email}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.website ? (
                          <a
                            href={client.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <HugeiconsIcon icon={GlobeIcon} className="size-3.5" />
                            {client.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/clients/${client.id}`} />}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
                          Configure & Departments
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(e, client.id, client.name)}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
