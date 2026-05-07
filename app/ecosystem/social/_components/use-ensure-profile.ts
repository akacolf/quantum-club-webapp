"use client";

import { useEffect, useRef, useState } from "react";
import type { SocialProfile } from "@/lib/social-types";
import { ensureSocialProfile } from "../actions";

interface State {
  /** True once we've confirmed the user has no QC username yet — render a
   * CTA pointing them to /home/profile to set one up. */
  missingQcUsername: boolean;
}

/**
 * Fires `ensureSocialProfile` once when the user is signed in and has no
 * social profile yet, and exposes the "needs to pick a QC username" branch
 * so the caller can render a fallback CTA. Idempotent — the action itself
 * is safe to retry.
 */
export function useEnsureSocialProfile(
  qcId: string | null,
  profile: SocialProfile | null | undefined,
): State {
  const ranRef = useRef(false);
  const [missingQcUsername, setMissingQcUsername] = useState(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (!qcId || profile !== null) return;
    ranRef.current = true;
    ensureSocialProfile({})
      .then((res) => {
        if (res?.data && "missingQcUsername" in res.data) {
          setMissingQcUsername(Boolean(res.data.missingQcUsername));
        }
      })
      .catch((err) => {
        console.error("[social] auto-onboard failed:", err);
        ranRef.current = false;
      });
  }, [qcId, profile]);

  return { missingQcUsername };
}
