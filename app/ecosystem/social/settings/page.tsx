"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
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
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useSocialProfile } from "@/app/(hooks)/queries/use-social";
import { editSocialProfileFormSchema } from "@/lib/validations";
import { updateSocialProfile } from "../actions";
import { CreatorEarnings } from "../_components/CreatorEarnings";
import { useEnsureSocialProfile } from "../_components/use-ensure-profile";

export default function SocialSettingsPage() {
  useTelegramBackButton("/ecosystem/social");
  const router = useRouter();

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;
  const { data: profile } = useSocialProfile(qcId);

  // Auto-onboard when settings is opened directly without a profile yet.
  const { missingQcUsername } = useEnsureSocialProfile(qcId, profile);

  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      displayName: profile?.displayName ?? "",
      bio: profile?.bio ?? "",
      website: profile?.website ?? "",
    },
    validators: { onSubmit: editSocialProfileFormSchema },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      haptics.medium();
      const res = await updateSocialProfile({
        displayName: value.displayName,
        bio: value.bio,
        website: value.website || null,
      });
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
      toast.success("Profile updated");
      if (profile) {
        router.replace(`/ecosystem/social/${profile.handle}` as Route);
      }
    },
  });

  if (currentUser && profile === null) {
    if (missingQcUsername) {
      return (
        <div className="min-h-screen flex items-center justify-center pb-28 px-6 text-center">
          <div className="space-y-4 max-w-xs">
            <Icon
              icon="solar:user-id-linear"
              className="w-14 h-14 text-muted-foreground mx-auto"
            />
            <div>
              <p className="font-semibold">Set up your QC profile first</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a QC username and add a photo. Your social profile will
                use them automatically.
              </p>
            </div>
            <Link href={"/home/profile" as Route}>
              <Button className="rounded-full">Open profile</Button>
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 pb-28 text-center">
        <ButtonLoader size="md" />
        <p className="text-sm text-muted-foreground">Setting up your profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Icon
            icon="solar:settings-linear"
            className="w-6 h-6 text-foreground"
          />
          <h1 className="text-2xl font-bold">Edit profile</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          @{profile?.handle ?? ""} — your handle is permanent.
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
                <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
                <FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    rows={3}
                    maxLength={200}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="website">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Website</FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="yoursite.com"
                    autoCapitalize="off"
                    autoCorrect="off"
                    maxLength={100}
                  />
                  <FieldDescription>Optional</FieldDescription>
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <Button
            type="submit"
            size="lg"
            className="rounded-full"
            disabled={submitting}
          >
            {submitting ? <ButtonLoader size="sm" /> : "Save"}
          </Button>
        </FieldGroup>
      </form>

      <div className="mt-8">
        <CreatorEarnings qcId={qcId} />
      </div>
    </div>
  );
}
