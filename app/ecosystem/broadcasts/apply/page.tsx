"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { haptics } from "@/lib/haptics";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { verificationRequestSchema } from "@/lib/validations";
import { submitVerificationRequest } from "../actions";

export default function BroadcastApplyPage() {
  useTelegramBackButton("/ecosystem/chat?tab=discover&broadcastsView=explore&discoverTab=broadcasts");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      proposedHandle: "",
      proposedName: "",
      bio: "",
      contactTelegram: "",
      socials: "",
      reason: "",
    },
    validators: { onSubmit: verificationRequestSchema },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      haptics.medium();
      const res = await submitVerificationRequest(value);
      setSubmitting(false);
      if (res?.serverError) {
        toast.error(res.serverError);
        haptics.error();
        return;
      }
      if (res?.validationErrors) {
        toast.error("Please fix the errors and try again");
        return;
      }
      haptics.success();
      toast.success("Request submitted — we'll review it soon");
      router.replace("/ecosystem/chat?tab=discover&broadcastsView=explore&discoverTab=broadcasts");
    },
  });

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon
            icon="solar:verified-check-bold"
            className="w-6 h-6 text-primary"
          />
          <h1 className="text-2xl font-bold text-white">Apply for a broadcast</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          QC Broadcasts are verified one-way feeds. Tell us about yours and the
          team will review your request.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field name="proposedHandle">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Handle</FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                      )
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. quantumclub"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                  <FieldDescription>
                    Lowercase letters, numbers, and underscores only.
                  </FieldDescription>
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="proposedName">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Quantum Club"
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="bio">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
                <FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Short description shown on the channel page"
                    rows={3}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="contactTelegram">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  Telegram contact
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="@yourhandle"
                    autoComplete="off"
                  />
                  <FieldDescription>
                    So we can reach you for verification follow-ups.
                  </FieldDescription>
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="socials">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  Socials &amp; references
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Links to X, your Telegram channel, and project website…"
                    rows={3}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="reason">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  What will you broadcast?
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Topic, cadence, audience…"
                    rows={4}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-full font-semibold mt-2"
          >
            {submitting ? <ButtonLoader size="sm" /> : "Submit request"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
