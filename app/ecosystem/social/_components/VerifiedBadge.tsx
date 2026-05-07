import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import type { SocialProfile } from "@/lib/social-types";
import { isQcTeamHandle } from "@/lib/qc-team";

/**
 * Whether the user currently has QC Pro perks. Team handles are treated as
 * permanently Pro — they never need to subscribe.
 */
export function isProActive(
  profile: Pick<SocialProfile, "proExpiresAt" | "handle"> | null | undefined,
): boolean {
  if (!profile) return false;
  if (isQcTeamHandle(profile.handle)) return true;
  if (!profile.proExpiresAt) return false;
  return profile.proExpiresAt.toMillis() > Date.now();
}

export type VerificationKind = "team" | "pro";

/**
 * Returns which kind of verified badge (if any) a user is entitled to.
 * Team always wins over Pro so a team member who *also* subscribed still
 * displays as team.
 */
export function getVerificationKind(args: {
  handle: string | null | undefined;
  isPro?: boolean | null | undefined;
}): VerificationKind | null {
  if (isQcTeamHandle(args.handle)) return "team";
  if (args.isPro) return "pro";
  return null;
}

/** Boolean shorthand of {@link getVerificationKind}. */
export function isVerifiedAuthor(args: {
  handle: string | null | undefined;
  isPro?: boolean | null | undefined;
}): boolean {
  return getVerificationKind(args) !== null;
}

interface Props {
  size?: number;
  className?: string;
  /**
   * `"team"` renders a white checkmark (QC core team), `"pro"` renders a
   * primary-blue checkmark (Pro subscribers). Defaults to `"pro"`.
   */
  tone?: VerificationKind;
}

/**
 * Verified-badge icon. Pure icon by design system. Color differentiates
 * team (white) from Pro subscribers (primary blue).
 */
export function VerifiedBadge({ size = 16, className, tone = "pro" }: Props) {
  return (
    <Icon
      icon="solar:verified-check-bold"
      width={size}
      height={size}
      className={cn(
        tone === "team" ? "text-white" : "text-primary",
        "shrink-0",
        className,
      )}
      aria-label={tone === "team" ? "QC team" : "QC Pro"}
    />
  );
}
