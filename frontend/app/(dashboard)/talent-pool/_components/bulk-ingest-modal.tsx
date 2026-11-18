"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  FileUploadIcon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Cancel01Icon,
  Delete02Icon,
  FolderOpenIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useBulkCreateTalentPoolProfiles, type BulkCandidateInput } from "@/hooks/queries/use-talent-pool";

export interface ParsedBulkItem {
  id: string;
  fileName: string;
  uploadId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  status: "ready" | "duplicate" | "missing_email" | "error";
  errorMessage?: string;
  selected: boolean;
  updateIfDuplicate: boolean;
}

interface BulkIngestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Array<{ id: number; title: string; clientName?: string | null; clientId: number | null }>;
  clients: Array<{ id: number; name: string }>;
}

export function BulkIngestModal({ open, onOpenChange, jobs, clients }: BulkIngestModalProps) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [source, setSource] = useState("Bulk Sourcing");
  const [destinationType, setDestinationType] = useState<"talent-pool" | "job">("talent-pool");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<{ total: number; filename: string } | null>(null);
  const [items, setItems] = useState<ParsedBulkItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const bulkCreateMutation = useBulkCreateTalentPoolProfiles();

  const availableJobs = useMemo(() => {
    if (selectedClientId === "all") return jobs;
    const cId = parseInt(selectedClientId, 10);
    return jobs.filter((j) => j.clientId === cId);
  }, [jobs, selectedClientId]);

  const handleFilesChosen = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (fileList.length > 50) {
      toast.error("Please upload up to 50 files or a .zip archive per batch");
      return;
    }

    setIsParsing(true);
    setParseProgress({ total: fileList.length, filename: fileList[0]?.name ?? "" });

    try {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append("files", file);
      }

      const res = await fetch("/api/proxy/talent-pool/bulk-parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Upload failed with status ${res.status}`);
      }

      const { data } = await res.json();
      const parsedItems: ParsedBulkItem[] = (data || []).map((row: any) => ({
        ...row,
        selected: row.status === "ready",
        updateIfDuplicate: false,
      }));

      setItems(parsedItems);
      setStep("review");
      toast.success(`Successfully parsed ${parsedItems.length} resumes`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse uploaded resumes");
    } finally {
      setIsParsing(false);
      setParseProgress(null);
    }
  };

  const handleItemChange = (id: string, field: keyof ParsedBulkItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "email") {
          const emailVal = String(value).trim();
          if (emailVal.includes("@") && emailVal.includes(".")) {
            if (updated.status === "missing_email") {
              updated.status = "ready";
              updated.selected = true;
            }
          }
        }
        return updated;
      }),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleSelectAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const selectedCount = items.filter((i) => i.selected).length;
  const readyCount = items.filter((i) => i.status === "ready").length;
  const duplicateCount = items.filter((i) => i.status === "duplicate").length;
  const missingEmailCount = items.filter((i) => i.status === "missing_email").length;

  const handleConfirmIngest = async () => {
    const toIngest = items.filter((i) => i.selected);
    if (toIngest.length === 0) {
      toast.error("Please select at least one candidate to ingest");
      return;
    }

    // Validate that all selected have valid emails
    const invalidEmail = toIngest.find((i) => !i.email || !i.email.includes("@"));
    if (invalidEmail) {
      toast.error(`Candidate "${invalidEmail.firstName}" is missing a valid email address`);
      return;
    }

    if (destinationType === "job" && !selectedJobId) {
      toast.error("Please select a target job for submission");
      return;
    }

    try {
      const payload: BulkCandidateInput[] = toIngest.map((item) => ({
        firstName: item.firstName.trim() || "Candidate",
        lastName: item.lastName.trim(),
        email: item.email.trim().toLowerCase(),
        phone: item.phone.trim() || null,
        linkedinUrl: item.linkedinUrl.trim() || null,
        source: source.trim() || null,
        notes: `Bulk ingested from ${item.fileName}`,
        resumeUploadId: item.uploadId,
        updateIfDuplicate: item.updateIfDuplicate,
      }));

      const res = await bulkCreateMutation.mutateAsync({
        profiles: payload,
        jobId: destinationType === "job" ? parseInt(selectedJobId, 10) : null,
      });

      toast.success(res.message);
      onOpenChange(false);
      resetState();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to bulk ingest candidates");
    }
  };

  const resetState = () => {
    setStep("upload");
    setItems([]);
    setSelectedJobId("");
    setSelectedClientId("all");
    setDestinationType("talent-pool");
    setIsDragging(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className={cn(
          "max-w-[calc(100%-2rem)] flex flex-col p-6 max-h-[92vh] transition-all duration-200",
          step === "review"
            ? "w-[96vw] sm:max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px]"
            : "w-full sm:max-w-2xl lg:sm:max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-medium">Bulk Ingest Resumes</DialogTitle>
          <DialogDescription>
            Upload multiple resumes (PDF, DOC, DOCX) or a .ZIP archive to extract candidate profiles and ingest in bulk.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-5 py-4">
            {/* Configuration row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg bg-slate-50 dark:bg-neutral-900/50 p-4 border border-slate-200 dark:border-neutral-800">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Candidate Source
                </label>
                <Input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Naukri, LinkedIn, Bulk Upload"
                  className="mt-1.5 bg-white dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  Destination
                </label>
                <div className="mt-2 flex items-center gap-4 text-xs font-medium text-slate-800 dark:text-neutral-200">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="destination"
                      checked={destinationType === "talent-pool"}
                      onChange={() => setDestinationType("talent-pool")}
                      className="accent-theme"
                    />
                    Talent Pool only
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="destination"
                      checked={destinationType === "job"}
                      onChange={() => setDestinationType("job")}
                      className="accent-theme"
                    />
                    Submit to Client Job
                  </label>
                </div>
              </div>

              {destinationType === "job" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                      Filter Job by Client
                    </label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger className="mt-1.5 bg-white dark:bg-neutral-800">
                        <SelectValue placeholder="All Clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                      Target Job *
                    </label>
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="mt-1.5 bg-white dark:bg-neutral-800">
                        <SelectValue placeholder="Select target job" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobs.map((j) => (
                          <SelectItem key={j.id} value={j.id.toString()}>
                            {j.title} {j.clientName ? `(${j.clientName})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleFilesChosen(e.dataTransfer.files);
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20 scale-[1.01]"
                  : "border-slate-300 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-600 hover:bg-slate-50/50 dark:hover:bg-neutral-900/30"
              )}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.zip,application/pdf,application/zip,application/x-zip-compressed,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files) handleFilesChosen(e.target.files);
                }}
                disabled={isParsing}
              />
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="size-8 animate-spin text-theme" />
                  <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                    Extracting & parsing resumes...
                  </p>
                  <p className="text-xs text-slate-500">
                    Extracting contact details and checking duplicates
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800 mb-3 text-slate-600 dark:text-neutral-300">
                    <HugeiconsIcon icon={FileUploadIcon} className="size-7" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                    Drop resume files or a .ZIP archive here
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400 max-w-sm">
                    Supports <strong>PDF, DOCX, DOC</strong>, and <strong>ZIP</strong> archives up to 50 files per batch.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 pointer-events-none gap-2">
                    <HugeiconsIcon icon={FolderOpenIcon} className="size-4" />
                    Browse Files
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 py-2 space-y-3">
            {/* Summary badges and controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-neutral-900/60 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-neutral-300">
                  {items.length} Files Parsed:
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 font-medium">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
                  {readyCount} Ready
                </span>
                {duplicateCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 font-medium">
                    <HugeiconsIcon icon={Alert02Icon} className="size-3.5" />
                    {duplicateCount} Duplicates
                  </span>
                )}
                {missingEmailCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 font-medium">
                    <HugeiconsIcon icon={InformationCircleIcon} className="size-3.5" />
                    {missingEmailCount} Needs Email
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSelectAll(true)}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((i) => ({ ...i, selected: i.status === "ready" })),
                    )
                  }
                  className="h-7 text-xs"
                >
                  Select Ready Only
                </Button>
              </div>
            </div>

            {/* Editable Review Table */}
            <div className="flex-1 min-h-[300px] max-h-[500px] overflow-auto rounded-md border border-slate-200 dark:border-neutral-800">
              <Table className="w-full min-w-[1100px]">
                <TableHeader className="sticky top-0 bg-slate-50 dark:bg-neutral-900 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCount === items.length && items.length > 0}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="accent-theme rounded"
                      />
                    </TableHead>
                    <TableHead className="w-48 text-xs font-medium">File Name</TableHead>
                    <TableHead className="w-36 text-xs font-medium">First Name *</TableHead>
                    <TableHead className="w-36 text-xs font-medium">Last Name</TableHead>
                    <TableHead className="w-52 text-xs font-medium">Email *</TableHead>
                    <TableHead className="w-36 text-xs font-medium">Phone</TableHead>
                    <TableHead className="w-44 text-xs font-medium">LinkedIn</TableHead>
                    <TableHead className="w-28 text-xs font-medium">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isDuplicate = item.status === "duplicate";
                    const isMissingEmail = item.status === "missing_email";
                    const isError = item.status === "error";

                    return (
                      <TableRow
                        key={item.id}
                        className={
                          !item.selected
                            ? "opacity-60 bg-slate-50/40 dark:bg-neutral-900/20"
                            : isDuplicate
                              ? "bg-amber-50/30 dark:bg-amber-950/10"
                              : isMissingEmail
                                ? "bg-rose-50/30 dark:bg-rose-950/10"
                                : ""
                        }
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={isError}
                            onChange={(e) =>
                              handleItemChange(item.id, "selected", e.target.checked)
                            }
                            className="accent-theme rounded"
                          />
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px]" title={item.fileName}>
                          <span className="font-medium text-slate-800 dark:text-neutral-200 truncate block">
                            {item.fileName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.firstName}
                            onChange={(e) =>
                              handleItemChange(item.id, "firstName", e.target.value)
                            }
                            placeholder="First Name"
                            className="h-8 text-xs py-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.lastName}
                            onChange={(e) =>
                              handleItemChange(item.id, "lastName", e.target.value)
                            }
                            placeholder="Last Name"
                            className="h-8 text-xs py-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.email}
                            onChange={(e) =>
                              handleItemChange(item.id, "email", e.target.value)
                            }
                            placeholder="Email address"
                            className={`h-8 text-xs py-1 ${
                              isMissingEmail || !item.email
                                ? "border-rose-400 focus-visible:ring-rose-400 bg-rose-50/20"
                                : ""
                            }`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.phone}
                            onChange={(e) =>
                              handleItemChange(item.id, "phone", e.target.value)
                            }
                            placeholder="Phone number"
                            className="h-8 text-xs py-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.linkedinUrl}
                            onChange={(e) =>
                              handleItemChange(item.id, "linkedinUrl", e.target.value)
                            }
                            placeholder="LinkedIn URL"
                            className="h-8 text-xs py-1"
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          {isDuplicate ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                <HugeiconsIcon icon={Alert02Icon} className="size-3" />
                                In Pool
                              </span>
                              <label className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-neutral-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.updateIfDuplicate}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.id,
                                      "updateIfDuplicate",
                                      e.target.checked,
                                    )
                                  }
                                  className="accent-theme rounded size-3"
                                />
                                Update CV
                              </label>
                            </div>
                          ) : isMissingEmail ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                              <HugeiconsIcon icon={InformationCircleIcon} className="size-3" />
                              Missing Email
                            </span>
                          ) : isError ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
                              Ready
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                            title="Remove row"
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 flex items-center justify-between border-t border-slate-200 dark:border-neutral-800 pt-4 mt-2">
          {step === "review" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={bulkCreateMutation.isPending}
              >
                Back to Upload
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenChange(false);
                    resetState();
                  }}
                  disabled={bulkCreateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmIngest}
                  disabled={selectedCount === 0 || bulkCreateMutation.isPending}
                  className="gap-2"
                >
                  {bulkCreateMutation.isPending && (
                    <Spinner className="size-4 animate-spin text-white" />
                  )}
                  Confirm Ingest ({selectedCount})
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
