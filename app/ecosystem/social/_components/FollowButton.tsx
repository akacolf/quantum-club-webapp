"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useIsFollowing } from "@/app/(hooks)/queries/use-social";
import { followSocialUser, unfollowSocialUser } from "../actions";

interface Props {
  qcId: string | null;
  targetQcId: string;
  className?: string;
  size?: "sm" | "default";
}

export function FollowButton({
  qcId,
  targetQcId,
  className,
  size = "sm",
}: Props) {
  const isSelf = qcId === targetQcId;
  const { data: following } = useIsFollowing(qcId, targetQcId);
  const [pending, setPending] = useState(false);

  if (isSelf) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!qcId) {
      toast.error("Set up your social profile first");
      return;
    }
    if (pending) return;
    setPending(true);
    haptics.medium();
    const res = following
      ? await unfollowSocialUser({ targetQcId })
      : await followSocialUser({ targetQcId });
    if (res?.serverError) toast.error(res.serverError);
    setPending(false);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending}
      size={size}
      variant={following ? "secondary" : "default"}
      className={cn(
        "rounded-full font-semibold",
        size === "sm" && "h-8 px-4 text-xs",
        className,
      )}
    >
      {pending ? <ButtonLoader size="sm" /> : following ? "Following" : "Follow"}
    </Button>
  );
}
