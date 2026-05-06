"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import type { SocialProfile } from "@/lib/social-types";
import { Avatar } from "./Avatar";
import { FollowButton } from "./FollowButton";
import { formatCount } from "./format";
import { VerifiedBadge, isProActive } from "./VerifiedBadge";

interface Props {
  profile: SocialProfile;
  qcId: string | null;
}

export function ProfileHeader({ profile, qcId }: Props) {
  const isSelf = profile.id === qcId;

  return (
    <div>
      <div className="relative w-full aspect-[3/1] bg-secondary">
        {profile.banner && (
          <Image
            src={profile.banner}
            alt=""
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      <div className="px-4 -mt-10 relative">
        <div className="flex items-end justify-between">
          <Avatar
            src={profile.avatar}
            name={profile.displayName}
            size={80}
            className="ring-4 ring-background"
          />
          <div className="pb-2 flex items-center gap-2">
            {isSelf ? (
              <Link
                href={"/ecosystem/social/settings" as Route}
                className="h-8 px-4 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold flex items-center"
              >
                Edit profile
              </Link>
            ) : (
              <FollowButton qcId={qcId} targetQcId={profile.id} />
            )}
          </div>
        </div>

        <div className="mt-2">
          <h1 className="text-xl font-bold leading-tight flex items-center gap-1.5">
            <span>{profile.displayName}</span>
            {isProActive(profile) && <VerifiedBadge size={18} />}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.handle}</p>
        </div>

        {profile.bio && (
          <p className="mt-3 text-sm whitespace-pre-wrap">{profile.bio}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {profile.website && (
            <a
              href={
                profile.website.startsWith("http")
                  ? profile.website
                  : `https://${profile.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
            >
              <Icon icon="solar:link-linear" className="w-3.5 h-3.5" />
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {profile.linkedBroadcastHandle && (
            <Link
              href={
                `/ecosystem/broadcasts/${profile.linkedBroadcastHandle}` as Route
              }
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Icon
                icon="solar:radio-minimalistic-linear"
                className="w-3.5 h-3.5 text-primary"
              />
              broadcast
            </Link>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <Link
            href={`/ecosystem/social/${profile.handle}/following` as Route}
            className="hover:underline underline-offset-2"
          >
            <span className="font-semibold">
              {formatCount(profile.followingCount)}
            </span>{" "}
            <span className="text-muted-foreground">Following</span>
          </Link>
          <Link
            href={`/ecosystem/social/${profile.handle}/followers` as Route}
            className="hover:underline underline-offset-2"
          >
            <span className="font-semibold">
              {formatCount(profile.followerCount)}
            </span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
