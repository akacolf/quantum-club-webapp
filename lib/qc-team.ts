/** QC core team usernames — shown with a verified badge in chats */
export const QC_TEAM_USERNAMES = new Set([
  "Colf",
  "enes",
]);

export function isQcTeamMember(username: string | undefined | null): boolean {
  if (!username) return false;
  return QC_TEAM_USERNAMES.has(username);
}
