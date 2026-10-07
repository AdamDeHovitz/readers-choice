/**
 * Builds Hybrid IRV ballots from raw meeting vote rows.
 */

import type { ApprovalBallot, RankedBallot } from "./voting-algorithm";

export type VotingMethod = "approval" | "ranked";

export interface MeetingVoteRows {
  approvalVotes: readonly { user_id: string; book_option_id: string }[];
  rankedVotes: readonly {
    user_id: string;
    book_option_id: string;
    rank: number;
  }[];
  preferences: readonly { user_id: string; voting_method: VotingMethod }[];
  /** Current club members; votes from anyone else are ignored */
  memberIds: ReadonlySet<string>;
}

/**
 * Split votes into approval and ranked ballots so each current member is
 * counted in exactly one pool.
 *
 * A member's pool is their saved voting preference. Without a preference,
 * a member with ranked votes is treated as ranked, otherwise approval.
 * Ballots are returned sorted by user id so results are reproducible.
 */
export function buildMeetingBallots(rows: MeetingVoteRows): {
  approvalBallots: ApprovalBallot[];
  rankedBallots: RankedBallot[];
} {
  const preference = new Map<string, VotingMethod>();
  for (const p of rows.preferences) preference.set(p.user_id, p.voting_method);

  const approvals = new Map<string, string[]>();
  for (const v of rows.approvalVotes) {
    if (!rows.memberIds.has(v.user_id)) continue;
    const list = approvals.get(v.user_id) ?? [];
    list.push(v.book_option_id);
    approvals.set(v.user_id, list);
  }

  const rankings = new Map<string, { bookId: string; rank: number }[]>();
  for (const v of rows.rankedVotes) {
    if (!rows.memberIds.has(v.user_id)) continue;
    const list = rankings.get(v.user_id) ?? [];
    list.push({ bookId: v.book_option_id, rank: v.rank });
    rankings.set(v.user_id, list);
  }

  const methodFor = (userId: string): VotingMethod =>
    preference.get(userId) ?? (rankings.has(userId) ? "ranked" : "approval");

  const approvalBallots: ApprovalBallot[] = [...approvals.entries()]
    .filter(([userId]) => methodFor(userId) === "approval")
    .map(([odId, approvedBookIds]) => ({
      odId,
      approvedBookIds: [...approvedBookIds].sort(),
    }))
    .sort((a, b) => compareStrings(a.odId, b.odId));

  const rankedBallots: RankedBallot[] = [...rankings.entries()]
    .filter(([userId]) => methodFor(userId) === "ranked")
    .map(([odId, r]) => ({
      odId,
      rankings: [...r].sort((a, b) => a.rank - b.rank),
    }))
    .sort((a, b) => compareStrings(a.odId, b.odId));

  return { approvalBallots, rankedBallots };
}

/**
 * Derive a stable non-negative 31-bit seed from a string (FNV-1a), so a
 * meeting's random tie-break always resolves the same way.
 */
export function seedFromString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 2147483648;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
