"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClient, useUpdateClient } from "@/hooks/queries/use-clients";
import type { Client } from "@/types";
import { FormField, inputCls } from "@/components/form/form-field";
import { SettingsSection } from "@/app/(dashboard)/settings/general/_components/settings-section";
import { TimeZoneSelect } from "@/app/(dashboard)/settings/general/_components/time-zone-select";

const DESCRIPTION_MAX = 500;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Values = {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  description: string;
  timeZone: string;
};

const toValues = (c?: Client | null): Values => ({
  name: c?.name ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  website: c?.website ?? "",
  address: c?.address ?? "",
  description: c?.description ?? "",
  timeZone: c?.timeZone || "UTC",
});

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function ClientForm({
  client,
  isNew = false,
  onSuccess,
  actionsSlot,
}: {
  client?: Client | null;
  isNew?: boolean;
  onSuccess?: (savedClient: Client) => void;
  actionsSlot?: HTMLElement | null;
}) {
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();

  const [values, setValues] = useState<Values>(() =>
    isNew ? { ...toValues(client), timeZone: browserTimeZone() } : toValues(client),
  );
  const [showErrors, setShowErrors] = useState(false);

  const baseline = toValues(client);
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const isDirty = (Object.keys(values) as (keyof Values)[]).some(
    (k) => (values[k] ?? "") !== (baseline[k] ?? ""),
  );

  const errors = {
    name: values.name.trim() ? null : "Client company name is required.",
    email: values.email.trim() && !EMAIL_RE.test(values.email.trim())
      ? "Enter a valid email address."
      : null,
  };
  const hasErrors = Boolean(errors.name || errors.email);

  const handleDiscard = () => {
    setValues(baseline);
    setShowErrors(false);
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (hasErrors) return;

    try {
      if (isNew || !client?.id) {
        const result = await createClientMutation.mutateAsync({
          name: values.name.trim(),
          email: values.email.trim() || null,
          website: values.website.trim() || null,
          phone: values.phone.trim() || null,
          address: values.address.trim() || null,
          description: values.description.trim() || null,
          timeZone: values.timeZone,
        });
        toast.success("Client company created");
        setShowErrors(false);
        if (onSuccess && result.data) onSuccess(result.data);
      } else {
        const result = await updateClientMutation.mutateAsync({
          id: client.id,
          data: {
            name: values.name.trim(),
            email: values.email.trim() || null,
            website: values.website.trim() || null,
            phone: values.phone.trim() || null,
            address: values.address.trim() || null,
            description: values.description.trim() || null,
            timeZone: values.timeZone,
          },
        });
        toast.success("Client company updated");
        setShowErrors(false);
        if (onSuccess && result.data) onSuccess(result.data);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save client");
    }
  };

  const isPending = createClientMutation.isPending || updateClientMutation.isPending;

  const buttons = (
    <div className="flex items-center gap-2">
      {isDirty && (
        <Button
          type="button"
          variant="cancel"
          onClick={handleDiscard}
          disabled={isPending}
          className="h-9 px-4 text-sm"
        >
          Discard
        </Button>
      )}
      <Button
        type="button"
        onClick={handleSave}
        disabled={isPending || (!isDirty && !isNew)}
        className="h-9 px-4 text-sm"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" />
            Saving...
          </span>
        ) : isNew ? (
          "Create Client"
        ) : (
          "Save changes"
        )}
      </Button>
    </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
      {/* If actionsSlot is provided, portal buttons there; otherwise render at top */}
      {actionsSlot ? createPortal(buttons, actionsSlot) : null}

      <SettingsSection
        title="Company details"
        description="Core contact information and public identity of this client company."
      >
        <div className="space-y-4">
          <FormField
            label="Company name"
            htmlFor="client-name"
            error={showErrors ? errors.name : null}
            required
          >
            <Input
              id="client-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Acme Corporation"
              className={inputCls}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Contact email"
              htmlFor="client-email"
              error={showErrors ? errors.email : null}
            >
              <Input
                id="client-email"
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="hiring@acme.com"
                className={inputCls}
              />
            </FormField>

            <FormField label="Phone" htmlFor="client-phone">
              <Input
                id="client-phone"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 555-0123"
                className={inputCls}
              />
            </FormField>
          </div>

          <FormField label="Website" htmlFor="client-website">
            <Input
              id="client-website"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://acme.com"
              className={inputCls}
            />
          </FormField>

          <FormField label="Office address" htmlFor="client-address">
            <Input
              id="client-address"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 Market St, San Francisco, CA"
              className={inputCls}
            />
          </FormField>

          <FormField label="Notes & description" htmlFor="client-description">
            <Textarea
              id="client-description"
              value={values.description}
              onChange={(e) => set("description", e.target.value.slice(0, DESCRIPTION_MAX))}
              placeholder="Company culture, hiring guidelines, agreed recruiter commission rates, or special requirements..."
              rows={3}
              className={inputCls}
            />
          </FormField>

          <FormField
            label="Time zone"
            htmlFor="client-timezone"
          >
            <TimeZoneSelect
              id="client-timezone"
              value={values.timeZone}
              onChange={(zone) => set("timeZone", zone)}
            />
          </FormField>
        </div>
      </SettingsSection>

      {!actionsSlot && <div className="pt-2">{buttons}</div>}
    </form>
  );
}
