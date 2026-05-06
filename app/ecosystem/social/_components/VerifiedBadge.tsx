import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import type { SocialProfile } from "@/lib/social-types";

/** Whether the user currently has an active QC Pro membership */
export function isProActive(
  profile: Pick<SocialProfile, "proExpiresAt"> | null | undefined,
): boolean {
  if (!profile?.proExpiresAt) return false;
  return profile.proExpiresAt.toMillis() > Date.now();
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
