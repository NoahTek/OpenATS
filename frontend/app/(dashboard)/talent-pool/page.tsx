"use client";

import { useState } from "react";
import {
  useTalentPool,
  useCreateTalentPoolProfile,
  useUpdateTalentPoolProfile,
  useSubmitProfileToJob,
  useDeleteTalentPoolProfile,
} from "@/hooks/queries/use-talent-pool";
import { useJobs } from "@/hooks/queries/use-jobs";
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
  BriefcaseBusinessIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

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

  const profiles = data?.data ?? [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const [editingProfile, setEditingProfile] = useState<TalentPoolProfile | null>(null);

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
    setIsAddOpen(true);
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
        });
        toast.success("Candidate added to talent pool");
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
                Central Talent Pool
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                Source candidates centrally and submit them across multiple client jobs.
              </p>
            </div>
            <Button onClick={handleOpenAdd} className="gap-2">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Source Candidate
            </Button>
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
            <p className="text-sm text-slate-500">Searching talent pool...</p>
          ) : profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-neutral-800">
              <h3 className="text-lg font-medium text-slate-900 dark:text-neutral-100">
                No candidates found in talent pool
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                {search ? "Try adjusting your search query." : "Source your first candidate into the agency pool."}
              </p>
              <Button onClick={handleOpenAdd} className="mt-4 gap-2">
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Source Candidate
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
                    <TableHead>Submissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        {profile.notes && (
                          <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-0.5">
                            {profile.notes}
                          </p>
                        )}
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
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-neutral-800 dark:text-neutral-200">
                          {profile.submissionCount} job{profile.submissionCount === 1 ? "" : "s"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSubmitProfile(profile);
                            setSelectedJobId("");
                            setSubmissionNotes("");
                          }}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <HugeiconsIcon icon={BriefcaseBusinessIcon} className="size-3.5" />
                          Submit to Job
                        </Button>
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

      {/* Source Candidate Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Edit Candidate Profile" : "Source Candidate into Talent Pool"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? "Update candidate profile details, contact information, and recruiter notes."
                : "Add candidate details to your agency&apos;s central bench. You can submit them to client jobs anytime."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
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
        onOpenChange={(open) => !open && setSubmitProfile(null)}
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
                Select Client Job *
              </label>
              <Select
                value={selectedJobId}
                onValueChange={(val) => setSelectedJobId(val ?? "")}
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose an active requisition..." />
                </SelectTrigger>
                <SelectContent>
                  {publishedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.title}
                    </SelectItem>
                  ))}
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
                onClick={() => setSubmitProfile(null)}
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
    </div>
  );
}
