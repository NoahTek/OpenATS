"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  useTalentPool,
  useCreateTalentPoolProfile,
  useUpdateTalentPoolProfile,
  useSubmitProfileToJob,
  useDeleteTalentPoolProfile,
} from "@/hooks/queries/use-talent-pool";
import { useJobs } from "@/hooks/queries/use-jobs";
import { useClients } from "@/hooks/queries/use-clients";
import type { TalentPoolProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Add01Icon,
  Search01Icon,
  Delete02Icon,
  Edit02Icon,
  Mail01Icon,
  CallIcon,
  Link01Icon,
  FileUploadIcon,
  Cancel01Icon,
  Tick02Icon,
  FolderUploadIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Spinner } from "@/components/ui/spinner";
import { splitSnippet } from "../candidates/_lib/candidate-utils";
import { BulkIngestModal } from "./_components/bulk-ingest-modal";
import { TalentPoolCvSheet } from "./_components/talent-pool-cv-sheet";
import { TalentPoolSubmissionsPopover } from "./_components/talent-pool-submissions-popover";

export default function TalentPoolPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTalentPool({
    search: search.trim() || undefined,
    page,
    limit: 20,
  });

  const { data: jobsData } = useJobs();
  const publishedJobs = (jobsData?.data ?? []).filter(
    (j) => j.status === "published",
  );

  const sortedPublishedJobs = useMemo(() => {
    return [...publishedJobs].sort((a, b) => {
      const clientA = a.clientName?.trim() || "Unassigned Client";
      const clientB = b.clientName?.trim() || "Unassigned Client";
      const clientCmp = clientA.localeCompare(clientB);
      if (clientCmp !== 0) return clientCmp;
      return a.title.localeCompare(b.title);
    });
  }, [publishedJobs]);

  const { data: clientsData } = useClients();
  const clients = useMemo(() => clientsData?.data ?? [], [clientsData?.data]);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const [selectedClientId, setSelectedClientId] = useState<string>("all");

  const availableJobs = useMemo(() => {
    if (selectedClientId === "all") return sortedPublishedJobs;
    const cId = parseInt(selectedClientId, 10);
    return sortedPublishedJobs.filter((j) => j.clientId === cId);
  }, [sortedPublishedJobs, selectedClientId]);

  const profiles = data?.data ?? [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkIngestOpen, setIsBulkIngestOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeUploadId, setResumeUploadId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isDraggingResume, setIsDraggingResume] = useState(false);

  const [editingProfile, setEditingProfile] = useState<TalentPoolProfile | null>(null);
  const [viewCvProfile, setViewCvProfile] = useState<TalentPoolProfile | null>(null);
  const [isCvOpen, setIsCvOpen] = useState(false);

  const [submitProfile, setSubmitProfile] = useState<TalentPoolProfile | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [submissionNotes, setSubmissionNotes] = useState("");

  const createProfileMutation = useCreateTalentPoolProfile();
  const updateProfileMutation = useUpdateTalentPoolProfile();
  const submitToJobMutation = useSubmitProfileToJob();
  const deleteProfileMutation = useDeleteTalentPoolProfile();

  const handleOpenAdd = () => {
    setEditingProfile(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setLinkedinUrl("");
    setSource("");
    setNotes("");
    setResumeUploadId(null);
    setUploadedFileName(null);
    setIsDraggingResume(false);
    setIsAddOpen(true);
  };

  const processResumeFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx") && !name.endsWith(".doc")) {
      toast.error("Please upload a PDF or Word document (.docx, .doc)");
      return;
    }

    setIsParsingResume(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resume", file);

      const res = await fetch("/api/proxy/talent-pool/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `HTTP ${res.status}`);
      }

      const { data: parsed } = await res.json();
      setResumeUploadId(parsed.uploadId);
      setUploadedFileName(file.name);

      if (parsed.firstName) setFirstName(parsed.firstName);
      if (parsed.lastName) setLastName(parsed.lastName);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.linkedinUrl) setLinkedinUrl(parsed.linkedinUrl);

      toast.success("Resume parsed and details auto-filled");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse resume");
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processResumeFile(file);
    }
    e.target.value = "";
  };

  const handleOpenEdit = (profile: TalentPoolProfile) => {
    setEditingProfile(profile);
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
    setPhone(profile.phone ?? "");
    setLinkedinUrl(profile.linkedinUrl ?? "");
    setSource(profile.source ?? "");
    setNotes(profile.notes ?? "");
    setIsDraggingResume(false);
    setIsAddOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      if (editingProfile) {
        await updateProfileMutation.mutateAsync({
          id: editingProfile.id,
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            linkedinUrl: linkedinUrl.trim() || null,
            source: source.trim() || null,
            notes: notes.trim() || null,
          },
        });
        toast.success("Candidate updated successfully");
      } else {
        await createProfileMutation.mutateAsync({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          source: source.trim() || null,
          notes: notes.trim() || null,
          resumeUploadId: resumeUploadId || null,
        });
        toast.success("Candidate added successfully");
      }
      setIsAddOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save candidate");
    }
  };

  const handleSubmitToJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitProfile || !selectedJobId) {
      toast.error("Please select a job");
      return;
    }

    try {
      await submitToJobMutation.mutateAsync({
        profileId: submitProfile.id,
        jobId: parseInt(selectedJobId, 10),
        notes: submissionNotes.trim() || null,
      });
      toast.success(`Successfully submitted ${submitProfile.firstName} to job`);
      setSubmitProfile(null);
      setSelectedClientId("all");
      setSelectedJobId("");
      setSubmissionNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit candidate to job");
    }
  };

  const handleDeleteProfile = async (profile: TalentPoolProfile) => {
    if (
      !confirm(
        `Are you sure you want to remove ${profile.firstName} ${profile.lastName} from the talent pool?`,
      )
    ) {
      return;
    }

    try {
      await deleteProfileMutation.mutateAsync(profile.id);
      toast.success("Candidate removed from talent pool");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete candidate");
    }
  };

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-8">
        <div className="max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-300 py-6 dark:border-neutral-700">
            <div className="min-w-0">
              <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
                Talent Pool
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                Manage your agency&apos;s candidate bench, parse resumes with auto-fill, and submit candidates across client jobs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsBulkIngestOpen(true)}
                className="gap-2"
              >
                <HugeiconsIcon icon={FolderUploadIcon} className="size-4" />
                Bulk Ingest
              </Button>
              <Button onClick={handleOpenAdd} className="gap-2">
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Add Candidate
              </Button>
            </div>
          </header>

          {/* Search bar */}
          <div className="py-4">
            <div className="relative max-w-md">
              <HugeiconsIcon
                icon={Search01Icon}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
              />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search candidates by name, email, or CV content..."
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
        <div className="max-w-7xl pb-16">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading candidates...</p>
          ) : profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-neutral-800">
              <h3 className="text-lg font-medium text-slate-900 dark:text-neutral-100">
                No candidates found
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                {search ? "Try adjusting your search query." : "Add your first candidate to the agency bench."}
              </p>
              <Button onClick={handleOpenAdd} className="mt-4 gap-2">
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Add Candidate
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                        <div>
                          {profile.firstName} {profile.lastName}
                          {profile.linkedinUrl && (
                            <a
                              href={profile.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center text-xs text-blue-600 hover:underline"
                            >
                              <HugeiconsIcon icon={Link01Icon} className="size-3" />
                            </a>
                          )}
                        </div>
                        {profile.cvSnippet ? (
                          <p
                            className="mt-0.5 max-w-md truncate text-xs font-normal text-slate-500 dark:text-neutral-400"
                            title="Found in the CV"
                          >
                            {splitSnippet(profile.cvSnippet).map((part, index) =>
                              part.match ? (
                                <mark
                                  key={index}
                                  className="rounded-sm bg-amber-100 px-0.5 text-slate-900 dark:bg-amber-900/50 dark:text-neutral-100"
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                <span key={index}>{part.text}</span>
                              ),
                            )}
                          </p>
                        ) : profile.notes ? (
                          <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-0.5">
                            {profile.notes}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400">
                            <HugeiconsIcon icon={Mail01Icon} className="size-3" />
                            {profile.email}
                          </div>
                          {profile.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <HugeiconsIcon icon={CallIcon} className="size-3" />
                              {profile.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600 dark:text-neutral-400">
                          {profile.source || "Direct Sourcing"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <TalentPoolSubmissionsPopover
                          profile={profile}
                          onSubmitToJob={(p) => {
                            setSubmitProfile(p);
                            setSelectedClientId("all");
                            setSelectedJobId("");
                            setSubmissionNotes("");
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center space-x-2">
                        {profile.hasResume ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewCvProfile(profile);
                              setIsCvOpen(true);
                            }}
                            className="h-8 gap-1.5 text-xs text-slate-700 dark:text-neutral-300 hover:text-slate-900"
                            title="View candidate CV"
                          >
                            <HugeiconsIcon icon={File01Icon} className="size-3.5" />
                            View CV
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="h-8 gap-1.5 text-xs text-slate-400 opacity-60 cursor-not-allowed"
                            title="No CV uploaded"
                          >
                            <HugeiconsIcon icon={File01Icon} className="size-3.5" />
                            No CV
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(profile)}
                          className="h-8 px-2"
                        >
                          <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProfile(profile)}
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

      {/* Source / Add Candidate Modal */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) setIsDraggingResume(false);
          setIsAddOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Edit Candidate Profile" : "Add Candidate"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? "Update candidate profile details, contact information, and recruiter notes."
                : "Upload or drag & drop a resume to instantly auto-fill details, or enter them manually."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            {!editingProfile && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingResume(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setIsDraggingResume(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingResume(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    await processResumeFile(file);
                  }
                }}
                className={cn(
                  "relative rounded-lg border-2 border-dashed p-3 transition-all",
                  isDraggingResume
                    ? "border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20 scale-[1.01]"
                    : "border-slate-300 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <HugeiconsIcon icon={FileUploadIcon} className="size-4 text-theme" />
                    Resume / CV (PDF, Word)
                  </label>
                  {uploadedFileName && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <HugeiconsIcon icon={Tick02Icon} className="size-3" />
                      Auto-filled from CV
                    </span>
                  )}
                </div>

                {isParsingResume ? (
                  <div className="mt-2 flex items-center justify-center gap-2 py-4 text-xs text-slate-600 dark:text-neutral-400">
                    <Spinner className="size-4 animate-spin text-theme" />
                    <span>Parsing resume & extracting contact details...</span>
                  </div>
                ) : isDraggingResume ? (
                  <div className="mt-2 flex flex-col items-center justify-center rounded-md border border-primary/40 bg-white/80 dark:bg-neutral-800/80 p-4 text-center">
                    <HugeiconsIcon icon={FileUploadIcon} className="size-6 text-primary mb-1 animate-bounce" />
                    <span className="text-xs font-medium text-primary">
                      Drop resume here to auto-fill details
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      Supports PDF, DOCX, DOC
                    </span>
                  </div>
                ) : uploadedFileName ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between rounded-md bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <HugeiconsIcon icon={FileUploadIcon} className="size-4 text-slate-500 shrink-0" />
                        <span className="truncate font-medium text-slate-800 dark:text-neutral-200">
                          {uploadedFileName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeUploadId(null);
                          setUploadedFileName(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 ml-2"
                        title="Remove attached resume"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">
                      Drag & drop another resume here to replace
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 p-3.5 text-center hover:bg-slate-50 dark:hover:bg-neutral-800 hover:border-slate-300 dark:hover:border-neutral-600 transition">
                      <HugeiconsIcon icon={FileUploadIcon} className="size-5 text-slate-400 mb-1" />
                      <span className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                        Drag & drop resume here, or <span className="text-primary underline underline-offset-2">browse</span>
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Upload PDF or Word (.docx, .doc) to auto-fill contact details
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleResumeFileSelect}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  First Name *
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Last Name *
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Email *
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  LinkedIn URL
                </label>
                <Input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/janedoe"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Source Channel
                </label>
                <Input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. LinkedIn, Referral"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                Recruiter Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Candidate skills, expectations, availability..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createProfileMutation.isPending || updateProfileMutation.isPending
                }
              >
                {editingProfile ? "Save Changes" : "Save Candidate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit to Client Job Modal */}
      <Dialog
        open={Boolean(submitProfile)}
        onOpenChange={(open) => {
          if (!open) {
            setSubmitProfile(null);
            setSelectedClientId("all");
            setSelectedJobId("");
            setSubmissionNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Candidate to Job</DialogTitle>
            <DialogDescription>
              Submit {submitProfile?.firstName} {submitProfile?.lastName} into a client&apos;s active hiring pipeline.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitToJob} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                Filter by Client
              </label>
              <Select
                value={selectedClientId}
                onValueChange={(val) => {
                  const nextClient = val ?? "all";
                  setSelectedClientId(nextClient);
                  if (nextClient !== "all") {
                    const cId = parseInt(nextClient, 10);
                    const currentJob = publishedJobs.find(
                      (j) => j.id.toString() === selectedJobId,
                    );
                    if (currentJob && currentJob.clientId !== cId) {
                      setSelectedJobId("");
                    }
                  }
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All Clients">
                    {selectedClientId === "all"
                      ? "All Clients"
                      : clients.find((c) => c.id.toString() === selectedClientId)?.name ?? "All Clients"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-md w-full">
                  <SelectItem value="all">All Clients</SelectItem>
                  {sortedClients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                Select Client Job *
              </label>
              <Select
                value={selectedJobId}
                onValueChange={(val) => setSelectedJobId(val ?? "")}
                required
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Choose an active requisition...">
                    {(() => {
                      const sel = availableJobs.find((j) => j.id.toString() === selectedJobId);
                      return sel ? (sel.clientName ? `${sel.clientName} — ${sel.title}` : sel.title) : null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-md w-full">
                  {availableJobs.length === 0 ? (
                    <div className="py-2 px-3 text-center text-xs text-slate-500">
                      {selectedClientId === "all"
                        ? "No published jobs available"
                        : "No published jobs available for this client"}
                    </div>
                  ) : (
                    availableJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.clientName ? `${job.clientName} — ${job.title}` : job.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                Submission Notes (Optional)
              </label>
              <Textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Why is this candidate a good fit for this role?"
                className="mt-1 resize-none"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSubmitProfile(null);
                  setSelectedClientId("all");
                  setSelectedJobId("");
                  setSubmissionNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedJobId || submitToJobMutation.isPending}
              >
                Submit Candidate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Ingest Modal */}
      <BulkIngestModal
        open={isBulkIngestOpen}
        onOpenChange={setIsBulkIngestOpen}
        jobs={sortedPublishedJobs}
        clients={sortedClients}
      />

      {/* View CV Sheet */}
      <TalentPoolCvSheet
        open={isCvOpen}
        onOpenChange={setIsCvOpen}
        profile={viewCvProfile}
      />
    </div>
  );
}
