/** QC core team usernames — shown with a verified badge in chats */
export const QC_TEAM_USERNAMES = new Set([
  "Colf",
  "enes",
]);

export function isQcTeamMember(username: string | undefined | null): boolean {
  if (!username) return false;
  return QC_TEAM_USERNAMES.has(username);
}

/**
 * Lowercased view of {@link QC_TEAM_USERNAMES} for matching against QC Social
 * handles, which are always lowercased + sanitized at claim time.
 */
export const QC_TEAM_HANDLES = new Set(
  [...QC_TEAM_USERNAMES].map((u) => u.toLowerCase()),
);

export function isQcTeamHandle(handle: string | undefined | null): boolean {
  if (!handle) return false;
  return QC_TEAM_HANDLES.has(handle.toLowerCase());
}
