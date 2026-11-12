"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  Edit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import {
  useClientDepartments,
  useCreateClientDepartment,
  useUpdateClientDepartment,
  useDeleteClientDepartment,
} from "@/hooks/queries/use-clients";
import type { Department } from "@/types";
import { DepartmentNameDialog } from "@/app/(dashboard)/settings/general/_components/department-name-dialog";
import { SettingsSection } from "@/app/(dashboard)/settings/general/_components/settings-section";

const iconButton =
  "size-8 cursor-pointer rounded-md p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

export function ClientDepartmentsPanel({
  clientId,
  readOnly = false,
}: {
  clientId: number;
  readOnly?: boolean;
}) {
  const { data, isPending } = useClientDepartments(clientId);
  const createDept = useCreateClientDepartment(clientId);
  const updateDept = useUpdateClientDepartment(clientId);
  const deleteDept = useDeleteClientDepartment(clientId);

  const departments = data?.data ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const handleAdd = (name: string) =>
    createDept.mutate(name, {
      onSuccess: () => {
        setAddOpen(false);
        toast.success("Department added");
      },
      onError: () => toast.error("Failed to add department"),
    });

  const handleEdit = (name: string) => {
    if (!editTarget) return;
    updateDept.mutate(
      { deptId: editTarget.id, name },
      {
        onSuccess: () => {
          setEditTarget(null);
          toast.success("Department updated");
        },
        onError: () => toast.error("Failed to update department"),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteDept.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast.success("Department deleted");
      },
      onError: () => toast.error("Failed to delete department"),
    });
  };

  return (
    <>
      <SettingsSection
        title="Client Departments"
        description={
          departments.length > 0
            ? `${departments.length} ${departments.length === 1 ? "department" : "departments"} at this company. Jobs can be assigned to these teams.`
            : "Departments at this client company. Jobs can be assigned to these teams."
        }
        action={
          !isPending && !readOnly ? (
            <Button
              variant="cancel"
              onClick={() => setAddOpen(true)}
              className="h-8 shrink-0 cursor-pointer gap-1.5 px-3 text-sm"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
              Add
            </Button>
          ) : undefined
        }
      >
        {isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-md bg-slate-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-neutral-800">
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              No departments added for this client yet.
            </p>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
                className="mt-3 gap-1.5"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                Add Department
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-neutral-800 dark:border-neutral-800">
            {departments.map((dept) => (
              <li
                key={dept.id}
                className="flex items-center justify-between py-2.5 pl-3 pr-1 text-sm font-medium text-slate-900 dark:text-neutral-100"
              >
                <span>{dept.name}</span>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTarget(dept)}
                      className={iconButton}
                      aria-label={`Rename ${dept.name}`}
                    >
                      <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(dept)}
                      className={iconButton}
                      aria-label={`Delete ${dept.name}`}
                    >
                      <HugeiconsIcon icon={Delete01Icon} className="size-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <DepartmentNameDialog
        open={addOpen}
        title="Add department"
        submitLabel="Add"
        pendingLabel="Adding..."
        isPending={createDept.isPending}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />

      <DepartmentNameDialog
        open={!!editTarget}
        title="Rename department"
        submitLabel="Save"
        pendingLabel="Saving..."
        initialName={editTarget?.name}
        isPending={updateDept.isPending}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete department?"
        description={
          <>
            Delete <ConfirmDeleteName>{deleteTarget?.name}</ConfirmDeleteName>? Jobs in this
            department will be unassigned from it.
          </>
        }
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        isPending={deleteDept.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
