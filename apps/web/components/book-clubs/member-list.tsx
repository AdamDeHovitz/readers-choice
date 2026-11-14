"use client";

import { setMemberAdmin, removeMember } from "@/app/actions/book-clubs";
import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import type { ClubMember } from "@/server/clubs";

interface MemberListProps {
  members: ClubMember[];
  currentUserId: string;
  currentUserIsAdmin: boolean;
  bookClubId: string;
}

export function MemberList({
  members,
  currentUserId,
  currentUserIsAdmin,
  bookClubId,
}: MemberListProps) {
  const router = useRouter();
  const [actioningMemberId, setActioningMemberId] = useState<string | null>(
    null
  );
  const toggleAdmin = useAction(setMemberAdmin);
  const remove = useAction(removeMember, { refresh: false });
  const busy = toggleAdmin.pending || remove.pending;
  const error = toggleAdmin.error ?? remove.error;

  async function handleToggleAdmin(member: ClubMember) {
    setActioningMemberId(member.id);
    remove.reset();
    await toggleAdmin.run({
      bookClubId,
      userId: member.id,
      isAdmin: !member.isAdmin,
    });
  }

  async function handleRemoveMember(member: ClubMember) {
    const isSelf = member.id === currentUserId;
    const confirmMessage = isSelf
      ? "Are you sure you want to leave this book club?"
      : `Remove ${member.name} from the book club?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setActioningMemberId(member.id);
    toggleAdmin.reset();
    const result = await remove.run({ bookClubId, userId: member.id });
    if (!result.success) return;
    if (isSelf) router.push("/dashboard");
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <ul className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border shadow-xs">
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          const isActioning = busy && actioningMemberId === member.id;

          return (
            <li key={member.id} className="flex items-start gap-3 p-3 sm:p-4">
              <div className="flex-shrink-0">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="bg-sage-200 text-sage-800 font-inria flex h-10 w-10 items-center justify-center rounded-full font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-inria text-foreground truncate font-bold">
                    {member.name}
                    {isSelf && (
                      <span className="text-dark-500 font-normal"> (You)</span>
                    )}
                  </p>
                  {member.isAdmin && <Badge>Admin</Badge>}
                </div>
                {member.email && (
                  <p className="text-dark-500 truncate text-xs">
                    {member.email}
                  </p>
                )}

                {currentUserIsAdmin && (
                  <div className="mt-1 -ml-2 flex gap-1">
                    <button
                      onClick={() => handleToggleAdmin(member)}
                      disabled={isActioning}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 rounded-lg px-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {member.isAdmin ? "Remove admin" : "Make admin"}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={isActioning}
                      className="h-9 rounded-lg px-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSelf ? "Leave club" : "Remove"}
                    </button>
                  </div>
                )}

                {!currentUserIsAdmin && isSelf && (
                  <div className="mt-1 -ml-2">
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={isActioning}
                      className="h-9 rounded-lg px-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Leave club
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
