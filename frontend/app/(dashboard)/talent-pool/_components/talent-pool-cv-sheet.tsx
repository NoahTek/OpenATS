"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  File01Icon,
  TextAlignLeftIcon,
  BriefcaseBusinessIcon,
  Add01Icon,
  Edit02Icon,
  Building02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useTalentPoolProfile } from "@/hooks/queries/use-talent-pool";
import { CvTextSection } from "../../candidates/[id]/_components/sections/cv-text-section";
import type { TalentPoolProfile } from "@/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TalentPoolCvSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: TalentPoolProfile | null;
  onSubmitToJob?: (profile: TalentPoolProfile) => void;
  onEdit?: (profile: TalentPoolProfile) => void;
}

type TabType = "summary" | "cv" | "submissions";

function getStageBadgeClasses(status: string) {
  if (status === "hired") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  }
  if (status === "rejected") {
    return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
  }
  return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
}

export function TalentPoolCvSheet({
  open,
  onOpenChange,
  profile,
  onSubmitToJob,
  onEdit,
}: TalentPoolCvSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>("summary");

  const { data: detailData, isLoading } = useTalentPoolProfile(profile?.id);
  const detail = detailData?.data;

  if (!profile) return null;

  const resumeUrl = `/api/talent-pool/${profile.id}/resume`;
  const submissions = detail?.submissions ?? profile.submissions ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 border-slate-200 p-0 data-[side=right]:w-[min(880px,100vw)] sm:max-w-none dark:border-neutral-800 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-neutral-800">
          <div className="min-w-0">
            <SheetTitle className="truncate text-base font-semibold text-slate-900 dark:text-neutral-100">
              {profile.firstName} {profile.lastName}
            </SheetTitle>
            <p className="truncate text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              {profile.email}
              {profile.phone ? ` • ${profile.phone}` : ""}
              {profile.source ? ` • ${profile.source}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onSubmitToJob && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onSubmitToJob(profile);
                }}
                className="h-8 gap-1.5 text-xs"
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                Submit to Job
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(profile);
                }}
                className="h-8 px-2 text-slate-600 dark:text-neutral-400"
                title="Edit profile"
              >
                <HugeiconsIcon icon={Edit02Icon} className="size-4" />
              </Button>
            )}
            {profile.hasResume && activeTab === "cv" && (
              <Button
                render={
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                className="h-8 border-none bg-theme px-3 text-xs font-semibold text-white hover:bg-theme-hover"
              >
                Open in new tab
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              aria-label="Close"
              title="Close"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 border-b border-slate-200 px-5 bg-slate-50/50 dark:border-neutral-800 dark:bg-neutral-900/40">
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={cn(
              "flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer",
              activeTab === "summary"
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            <HugeiconsIcon icon={TextAlignLeftIcon} className="size-4" />
            <span>CV Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cv")}
            className={cn(
              "flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer",
              activeTab === "cv"
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            <HugeiconsIcon icon={File01Icon} className="size-4" />
            <span>Original CV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className={cn(
              "flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer",
              activeTab === "submissions"
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            <HugeiconsIcon icon={BriefcaseBusinessIcon} className="size-4" />
            <span>Submissions ({submissions.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-neutral-950">
          {activeTab === "summary" && (
            isLoading ? (
              <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
                <Spinner className="size-4" />
                <span>Loading CV Summary...</span>
              </div>
            ) : (
              <CvTextSection
                cvText={detail?.cvText ?? null}
                hasResume={profile.hasResume}
              />
            )
          )}

          {activeTab === "cv" && (
            profile.hasResume ? (
              <div className="size-full bg-slate-100 dark:bg-neutral-900 flex flex-col">
                <iframe
                  src={`${resumeUrl}#zoom=100`}
                  title={`${profile.firstName} ${profile.lastName} CV preview`}
                  className="size-full flex-1 border-0"
                />
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex size-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-800">
                  <HugeiconsIcon
                    icon={File01Icon}
                    className="size-6 text-slate-400 dark:text-neutral-600"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
                    No CV uploaded
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">
                    Upload a resume from edit candidate or bulk ingest.
                  </p>
                </div>
              </div>
            )
          )}

          {activeTab === "submissions" && (
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                    Job Submissions
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                    Roles this candidate has been submitted to across clients.
                  </p>
                </div>
                {onSubmitToJob && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onSubmitToJob(profile);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                    Submit to Job
                  </Button>
                )}
              </div>

              {submissions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-neutral-800">
                  <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">
                    No submissions yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-neutral-500">
                    Submit this candidate to an open client job.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-neutral-800 overflow-hidden divide-y divide-slate-100 dark:divide-neutral-800">
                  {submissions.map((sub) => (
                    <div
                      key={sub.applicationId}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/jobs/${sub.jobId}/pipeline`}
                            className="text-sm font-semibold text-slate-900 hover:text-blue-600 dark:text-neutral-100 dark:hover:text-blue-400 transition-colors truncate"
                          >
                            {sub.jobTitle}
                          </Link>
                          {sub.stageName && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium leading-none capitalize",
                                getStageBadgeClasses(sub.status),
                              )}
                            >
                              {sub.stageName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                          {sub.clientName && (
                            <>
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-neutral-300">
                                <HugeiconsIcon icon={Building02Icon} className="size-3 text-slate-400" />
                                {sub.clientName}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span>Applied {formatDate(sub.appliedAt)}</span>
                          {sub.totalScore != null && (
                            <>
                              <span>•</span>
                              <span>Score: {Math.round(sub.totalScore)}%</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/candidates/${sub.applicationId}?from=talent-pool`}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        <span>View Application</span>
                        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
