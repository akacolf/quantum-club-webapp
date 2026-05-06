"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm, useStore } from "@tanstack/react-form";
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
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useHandleAvailability } from "@/app/(hooks)/queries/use-social";
import { claimSocialHandleSchema } from "@/lib/validations";
import { claimSocialHandle } from "../actions";

export default function SocialOnboardingPage() {
  useTelegramBackButton("/ecosystem/social");
  const router = useRouter();
  const { qcUsername } = useUserContext();
  const [submitting, setSubmitting] = useState(false);

  // Prefill from the user's existing QC username so onboarding is one tap for
  // most users. We sanitize to the social handle alphabet (lowercase + _ only)
  // and trim trailing/leading underscores so it passes validation.
  const prefilledHandle = (qcUsername ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  const form = useForm({
    defaultValues: {
      handle: prefilledHandle,
      displayName: qcUsername ?? "",
      bio: "",
    },
    validators: { onSubmit: claimSocialHandleSchema },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      haptics.medium();
      const res = await claimSocialHandle(value);
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
      toast.success("You're on QC Social");
      router.replace(`/ecosystem/social/${value.handle}` as Route);
    },
  });

  const handleValue = useStore(form.store, (s) => s.values.handle);
  const debouncedHandle = handleValue.length >= 3 ? handleValue : null;
  const { data: availability } = useHandleAvailability(debouncedHandle);

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon
            icon="solar:user-circle-bold"
            className="w-7 h-7 text-primary"
          />
          <h1 className="text-2xl font-bold">Claim your handle</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick a username — this is how people find you across QC Social.
          You can change your name and bio later, but the handle is forever.
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
          <form.Field name="handle">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Handle</FieldLabel>
                <FieldContent>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      @
                    </span>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        )
                      }
                      onBlur={field.handleBlur}
                      placeholder="yourname"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      className="pl-7"
                    />
                  </div>
                  <FieldDescription>
                    {availability === "taken"
                      ? "This handle is taken"
                      : availability === "available"
                        ? "Available"
                        : "Lowercase letters, numbers, and underscores only."}
                  </FieldDescription>
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="displayName">
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
                    placeholder="What people will see"
                    maxLength={40}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="bio">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Bio (optional)</FieldLabel>
                <FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="A line about you"
                    rows={3}
                    maxLength={200}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <Button
            type="submit"
            size="lg"
            className="rounded-full"
            disabled={submitting || availability === "taken"}
          >
            {submitting ? <ButtonLoader size="sm" /> : "Continue"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
