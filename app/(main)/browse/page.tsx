import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRightIcon,
  CompassIcon,
  LockIcon,
  UsersIcon,
} from "lucide-react";
import { DeleteBookClubDialog } from "@/components/book-clubs/delete-book-club-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { viewerIsSuperAdmin } from "@/server/authz";
import { getAllBookClubs } from "@/server/clubs";
import { getViewer } from "@/server/viewer";

export const metadata: Metadata = { title: "Browse book clubs" };

export default async function BrowsePage() {
  const viewer = await getViewer();
  const [bookClubs, isSuperAdmin] = await Promise.all([
    getAllBookClubs(viewer),
    viewerIsSuperAdmin(viewer),
  ]);

  return (
    <>
      <PageHeader
        title="Browse Book Clubs"
        description="Clubs are invite-only. Ask a club admin for an invite link to join."
      />

      {bookClubs.length === 0 ? (
        <EmptyState icon={<CompassIcon />} title="No book clubs yet" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {bookClubs.map((club) => {
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <h2 className="font-inria text-foreground truncate text-lg font-bold">
                    {club.name}
                  </h2>
                  {club.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {club.description}
                    </p>
                  )}
                  <p className="text-dark-500 mt-2 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="size-3.5" aria-hidden />
                      {club.memberCount}{" "}
                      {club.memberCount === 1 ? "member" : "members"}
                    </span>
                    {!club.isMember && (
                      <span className="flex items-center gap-1">
                        <LockIcon className="size-3.5" aria-hidden />
                        Invite only
                      </span>
                    )}
                  </p>
                </div>
                {club.isMember && (
                  <ChevronRightIcon
                    className="text-dark-500 size-5 shrink-0"
                    aria-hidden
                  />
                )}
              </>
            );
            return (
              <li
                key={club.id}
                className="bg-card border-border flex flex-col rounded-2xl border shadow-xs"
              >
                {club.isMember ? (
                  <Link
                    href={`/book-clubs/${club.id}`}
                    className="active:bg-muted flex flex-1 items-center gap-3 rounded-2xl p-4"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex flex-1 items-center gap-3 p-4">
                    {body}
                  </div>
                )}
                {isSuperAdmin && (
                  <div className="border-border border-t px-4 py-3">
                    <DeleteBookClubDialog
                      bookClubId={club.id}
                      bookClubName={club.name}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
