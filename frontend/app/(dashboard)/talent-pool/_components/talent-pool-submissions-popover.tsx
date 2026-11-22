"use client";

import { useState } from "react";
import Link from "next/link";
import type { TalentPoolProfile, TalentPoolSubmission } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Building02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TalentPoolSubmissionsPopoverProps {
  profile: TalentPoolProfile;
  onSubmitToJob: (profile: TalentPoolProfile) => void;
}

function getStageBadgeClasses(status: string) {
  if (status === "hired") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  }
  if (status === "rejected") {
    return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
  }
  return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
}

export function TalentPoolSubmissionsPopover({
  profile,
  onSubmitToJob,
}: TalentPoolSubmissionsPopoverProps) {
  const [open, setOpen] = useState(false);
  const count = profile.submissionCount ?? 0;
  const submissions: TalentPoolSubmission[] = profile.submissions ?? [];

  if (count === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSubmitToJob(profile)}
        className="h-7 gap-1 px-2.5 text-xs font-normal text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full"
        title="Submit candidate to a job"
      >
        <HugeiconsIcon icon={Add01Icon} className="size-3" />
        Submit to Job
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-neutral-200 transition-colors cursor-pointer group"
        title="Click to view submitted jobs"
      >
        <span>
          {count} job{count === 1 ? "" : "s"}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn(
            "size-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-neutral-300 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-88 p-0 shadow-xl border border-slate-200 dark:border-neutral-800 rounded-lg overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/50 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
              Job Submissions
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate max-w-[200px]">
              {profile.firstName} {profile.lastName}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-white dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700">
            {count} {count === 1 ? "Role" : "Roles"}
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800">
          {submissions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-neutral-400">
              No submission details available.
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.applicationId}
                className="p-3.5 space-y-2 hover:bg-slate-50/60 dark:hover:bg-neutral-900/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/jobs/${sub.jobId}/pipeline`}
                    className="text-xs font-semibold text-slate-900 hover:text-blue-600 dark:text-neutral-100 dark:hover:text-blue-400 leading-tight transition-colors line-clamp-1"
                    title={`Go to ${sub.jobTitle} pipeline`}
                  >
                    {sub.jobTitle}
                  </Link>
                  {sub.stageName && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none capitalize",
                        getStageBadgeClasses(sub.status),
                      )}
                    >
                      {sub.stageName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                  {sub.clientName && (
                    <>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-neutral-300">
                        <HugeiconsIcon icon={Building02Icon} className="size-3 text-slate-400" />
                        {sub.clientName}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span>Submitted {formatDate(sub.appliedAt)}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {sub.totalScore != null ? (
                    <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                      Score: {Math.round(sub.totalScore)}%
                    </span>
                  ) : (
                    <span />
                  )}
                  <Link
                    href={`/candidates/${sub.applicationId}?from=talent-pool`}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    <span>View Application</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 p-2.5 bg-slate-50/50 dark:border-neutral-800 dark:bg-neutral-900/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false);
              onSubmitToJob(profile);
            }}
            className="w-full h-8 gap-1.5 text-xs font-medium"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
            Submit to another job
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
