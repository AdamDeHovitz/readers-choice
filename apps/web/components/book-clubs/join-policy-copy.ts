import type { JoinPolicy } from "@readers-choice/core/join-policy";

/** How each join policy reads to people: one place, so every screen agrees. */
export const JOIN_POLICY_COPY: Record<
  JoinPolicy,
  { label: string; description: string }
> = {
  invite_only: {
    label: "Invite only",
    description: "Hidden from Browse. People join with an invite link.",
  },
  request: {
    label: "Approval required",
    description:
      "Listed in Browse. Anyone can ask to join, and an admin approves.",
  },
  open: {
    label: "Open",
    description: "Listed in Browse. Anyone can join right away.",
  },
};
