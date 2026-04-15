import { redirect } from "next/navigation";

/**
 * Discovery has moved into QC Chat → Discover → Broadcasts so there's a
 * single discovery surface. Anyone hitting /ecosystem/broadcasts directly
 * (deep links, bookmarks) gets routed there.
 */
export default function BroadcastsRedirectPage() {
  redirect("/ecosystem/chat?tab=discover&discoverTab=broadcasts");
}
