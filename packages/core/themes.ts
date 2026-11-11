/**
 * Why a member can't delete a theme, or null if they can. The delete
 * operation enforces it, and the themes list uses it to show the button
 * only where deleting would succeed.
 */
export function themeDeletionBlocker(
  theme: { submittedBy: string | null; timesUsed: number },
  member: { userId: string; isAdmin: boolean }
): string | null {
  if (theme.submittedBy !== member.userId && !member.isAdmin) {
    return "You can only delete themes you submitted or be an admin";
  }
  if (theme.timesUsed > 0) {
    return "Cannot delete theme that has been used in meetings";
  }
  return null;
}
