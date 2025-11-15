"use client";

import { toggleMemberAdmin, removeMember } from "@/app/actions/book-clubs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Member {
  id: string;
  name: string;
  email: string;
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
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-100"
          >
            <div className="flex-shrink-0">
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-cream-200 flex items-center justify-center text-dark-600 font-medium font-inria">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium font-inria text-dark-900 truncate">
                  {member.name}
                  {isSelf && (
                    <span className="text-dark-500 font-normal"> (You)</span>
                  )}
                </p>
                {member.isAdmin && (
                  <span className="text-xs bg-cream-200 text-dark-600 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-500 truncate">{member.email}</p>

              {currentUserIsAdmin && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleToggleAdmin(member)}
                    disabled={isActioning}
                    className="text-xs text-dark-600 hover:text-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {member.isAdmin ? "Remove admin" : "Make admin"}
                  </button>
                  <span className="text-xs text-slate-300">•</span>
                  <button
                    onClick={() => handleRemoveMember(member)}
                    disabled={isActioning}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
