"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/job-labels";
import type { Client, Department, Job } from "@/types";

interface JobBasicInfoProps {
  title: string;
  onTitleChange: (value: string) => void;
  clientId: number | null;
  onClientChange: (id: number | null) => void;
  departmentId: number | null;
  onDepartmentChange: (id: number | null) => void;
  employmentType: Job["employmentType"] | null;
  onEmploymentTypeChange: (type: Job["employmentType"] | null) => void;
  clients: Client[];
  departments: Department[];
}

export function JobBasicInfo({
  title,
  onTitleChange,
  clientId,
  onClientChange,
  departmentId,
  onDepartmentChange,
  employmentType,
  onEmploymentTypeChange,
  clients,
  departments,
}: JobBasicInfoProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Job Title
        </Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Senior Software Engineer - Backend"
          className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Client Company
          </Label>
          <Select
            value={clientId?.toString() ?? "none"}
            onValueChange={(val) => {
              onClientChange(val === "none" ? null : Number(val));
              onDepartmentChange(null);
            }}
          >
            <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-800 dark:text-neutral-200 focus:ring-0">
              <SelectValue placeholder="Select client company">
                {clientId
                  ? (clients.find((c) => c.id === clientId)?.name ?? null)
                  : "Select client company"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <SelectItem value="none">None (Internal)</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Department <span className="text-xs font-normal text-slate-400 dark:text-neutral-500">(Optional)</span>
          </Label>
          <Select
            value={departmentId?.toString() ?? "none"}
            onValueChange={(val) => onDepartmentChange(val === "none" ? null : Number(val))}
          >
            <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-800 dark:text-neutral-200 focus:ring-0">
              <SelectValue placeholder="No department">
                {departmentId
                  ? (departments.find((d) => d.id === departmentId)?.name ?? null)
                  : "No department"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <SelectItem value="none">No department</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Employment Type
          </Label>
          <Select
            value={employmentType ?? ""}
            onValueChange={(val) =>
              onEmploymentTypeChange(val as Job["employmentType"])
            }
          >
            <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-800 dark:text-neutral-200 focus:ring-0">
              <SelectValue placeholder="Select">
                {employmentType ? EMPLOYMENT_TYPE_LABELS[employmentType] : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              {(
                Object.keys(EMPLOYMENT_TYPE_LABELS) as Job["employmentType"][]
              ).map((value) => (
                <SelectItem key={value} value={value}>
                  {EMPLOYMENT_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
