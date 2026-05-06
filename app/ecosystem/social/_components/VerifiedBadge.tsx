import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import type { SocialProfile } from "@/lib/social-types";
import { isQcTeamHandle } from "@/lib/qc-team";

/** Whether the user currently has an active QC Pro membership */
export function isProActive(
  profile: Pick<SocialProfile, "proExpiresAt"> | null | undefined,
): boolean {
  if (!profile?.proExpiresAt) return false;
  return profile.proExpiresAt.toMillis() > Date.now();
}

/**
 * QC Social verified-badge predicate. True for active Pro members and for
 * core-team handles (always verified, no Pro subscription required).
 */
export function isVerifiedAuthor(args: {
  handle: string | null | undefined;
  isPro?: boolean | null | undefined;
}): boolean {
  if (args.isPro) return true;
  return isQcTeamHandle(args.handle);
}

interface Props {
  size?: number;
  className?: string;
}

/**
 * Pure-icon QC Pro verified badge — used wherever a Pro user's name is
 * rendered (profile header, leaderboard, chat). Pure icon by design system.
 */
export function VerifiedBadge({ size = 16, className }: Props) {
  return (
    <Icon
      icon="solar:verified-check-bold"
      width={size}
      height={size}
      className={cn("text-primary shrink-0", className)}
      aria-label="QC Pro"
    />
  );
}
