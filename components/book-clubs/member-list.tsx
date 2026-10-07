"use client";

import { toggleMemberAdmin, removeMember } from "@/app/actions/book-clubs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Member {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  joinedAt: string;
}

interface MemberListProps {
  members: Member[];
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

  async function handleToggleAdmin(member: Member) {
    setActioningMemberId(member.id);

    const result = await toggleMemberAdmin(
      bookClubId,
      member.id,
      !member.isAdmin
    );

    if (result.error) {
      alert(result.error);
    }

    setActioningMemberId(null);
    router.refresh();
  }

  async function handleRemoveMember(member: Member) {
    const isSelf = member.id === currentUserId;
    const confirmMessage = isSelf
      ? "Are you sure you want to leave this book club?"
      : `Remove ${member.name} from the book club?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setActioningMemberId(member.id);

    const result = await removeMember(bookClubId, member.id);

    if (result.error) {
      alert(result.error);
      setActioningMemberId(null);
    } else if (isSelf) {
      // Redirect to dashboard if user removed themselves
      router.push("/dashboard");
    } else {
      setActioningMemberId(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isSelf = member.id === currentUserId;
        const isActioning = actioningMemberId === member.id;

        return (
          <div
            key={member.id}
            className="hover:bg-cream-100 flex items-start gap-3 rounded-lg p-3"
          >
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
                <div className="bg-cream-200 text-dark-600 font-inria flex h-10 w-10 items-center justify-center rounded-full font-medium">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-inria text-dark-900 truncate text-sm font-medium">
                  {member.name}
                  {isSelf && (
                    <span className="text-dark-500 font-normal"> (You)</span>
                  )}
                </p>
                {member.isAdmin && (
                  <span className="bg-cream-200 text-dark-600 rounded-full px-2 py-0.5 text-xs">
                    Admin
                  </span>
                )}
              </div>
              {member.email && (
                <p className="text-dark-500 truncate text-xs">{member.email}</p>
              )}

              {currentUserIsAdmin && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleToggleAdmin(member)}
                    disabled={isActioning}
                    className="text-dark-600 hover:text-dark-900 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {member.isAdmin ? "Remove admin" : "Make admin"}
                  </button>
                  <span className="text-gold-300 text-xs">•</span>
                  <button
                    onClick={() => handleRemoveMember(member)}
                    disabled={isActioning}
                    className="text-xs text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSelf ? "Leave club" : "Remove"}
                  </button>
                </div>
              )}

              {!currentUserIsAdmin && isSelf && (
                <div className="mt-2">
                  <button
                    onClick={() => handleRemoveMember(member)}
                    disabled={isActioning}
                    className="text-xs text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Leave club
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
