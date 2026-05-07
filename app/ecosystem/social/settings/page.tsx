"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { storage } from "@/app/(firebase)/client";
import { haptics } from "@/lib/haptics";
import { resizeToAspectJpeg } from "@/lib/image-resize";
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
  const [pendingBanner, setPendingBanner] = useState<Blob | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    };
  }, [bannerPreviewUrl]);

  const form = useForm({
    defaultValues: {
      displayName: profile?.displayName ?? "",
      bio: profile?.bio ?? "",
      website: profile?.website ?? "",
    },
    validators: { onSubmit: editSocialProfileFormSchema },
    onSubmit: async ({ value }) => {
      if (!qcId) return;
      setSubmitting(true);
      haptics.medium();

      let bannerUrl: string | undefined;
      if (pendingBanner) {
        try {
          const path = `social-posts/${qcId}/banner/${Date.now()}.jpg`;
          const ref = storageRef(storage, path);
          await uploadBytes(ref, pendingBanner, {
            contentType: "image/jpeg",
          });
          bannerUrl = await getDownloadURL(ref);
        } catch (err) {
          console.error("[social settings] banner upload failed:", err);
          toast.error("Couldn't upload your banner");
          haptics.error();
          setSubmitting(false);
          return;
        }
      }

      const res = await updateSocialProfile({
        displayName: value.displayName,
        bio: value.bio,
        website: value.website || null,
        ...(bannerUrl ? { banner: bannerUrl } : {}),
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
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
      setPendingBanner(null);
      setBannerPreviewUrl(null);
      haptics.success();
      toast.success("Profile updated");
      if (profile) {
        router.replace(`/ecosystem/social/${profile.handle}` as Route);
      }
    },
  });

  const handleBannerSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (bannerInputRef.current) bannerInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    try {
      const blob = await resizeToAspectJpeg(file, 1200, 400);
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
      setPendingBanner(blob);
      setBannerPreviewUrl(URL.createObjectURL(blob));
      haptics.light();
    } catch (err) {
      console.error("[social settings] banner resize failed:", err);
      toast.error("Couldn't process that image");
    }
  };

  const displayedBanner = bannerPreviewUrl ?? profile?.banner ?? null;

  if (currentUser && profile === null) {
    if (missingQcUsername) {
      return (
        <div className="min-h-screen flex items-center justify-center pb-28 px-6 text-center">
          <div className="space-y-4 max-w-xs">
            <Icon
              icon="lucide:user-cog"
              className="w-12 h-12 text-muted-foreground mx-auto"
            />
            <div>
              <p className="font-semibold">Set up your QC profile first</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a QC username and add a photo. Your QC Social profile
                will use them automatically.
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

      <section className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-semibold">Banner</p>
          {pendingBanner && (
            <Badge className="h-4 px-1.5 text-[9px] font-semibold bg-primary/15 text-primary border-0 leading-none">
              Unsaved
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/70 tabular-nums">
            1200 × 400
          </span>
        </div>
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          disabled={submitting}
          className="relative block w-full aspect-[3/1] rounded-2xl overflow-hidden bg-secondary disabled:opacity-60"
        >
          {displayedBanner ? (
            <Image
              src={displayedBanner}
              alt=""
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Icon icon="solar:gallery-add-linear" className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold gap-1.5">
            <Icon icon="solar:upload-linear" className="w-4 h-4" />
            {displayedBanner ? "Change banner" : "Upload banner"}
          </div>
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerSelect}
          className="hidden"
        />
      </section>

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
