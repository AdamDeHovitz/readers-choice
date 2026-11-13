import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, CompassIcon, UsersIcon } from "lucide-react";
import { DeleteBookClubDialog } from "@/components/book-clubs/delete-book-club-dialog";
import { JOIN_POLICY_COPY } from "@/components/book-clubs/join-policy-copy";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { viewerIsSuperAdmin } from "@/server/authz";
import { getBrowsableBookClubs, type BrowsableBookClub } from "@/server/clubs";
import { getViewer } from "@/server/viewer";

export const metadata: Metadata = { title: "Browse book clubs" };

function ClubStatus({ club }: { club: BrowsableBookClub }) {
  if (club.isMember) return <Badge variant="outline">Member</Badge>;
  if (club.hasPendingRequest) return <Badge>Requested</Badge>;
  return (
    <Badge variant={club.joinPolicy === "open" ? "active" : "default"}>
      {JOIN_POLICY_COPY[club.joinPolicy].label}
    </Badge>
  );
}

export default async function BrowsePage() {
  const viewer = await getViewer();
  const isSuperAdmin = await viewerIsSuperAdmin(viewer);
  const bookClubs = await getBrowsableBookClubs(viewer, {
    includeUnlisted: isSuperAdmin,
  });

  return (
    <>
      <PageHeader
        title="Browse Book Clubs"
        description="Find a club to join. Invite-only clubs aren't listed."
      />

      {bookClubs.length === 0 ? (
        <EmptyState
          icon={<CompassIcon />}
          title="No clubs to browse yet"
          description="When a club opens up to new members, it shows up here."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {bookClubs.map((club) => (
            <li
              key={club.id}
              className="bg-card border-border flex flex-col rounded-2xl border shadow-xs"
            >
              <Link
                href={`/book-clubs/${club.id}`}
                className="active:bg-muted flex flex-1 items-center gap-3 rounded-2xl p-4"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-inria text-foreground truncate text-lg font-bold">
                    {club.name}
                  </h2>
                  {club.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {club.description}
                    </p>
                  )}
                  <div className="text-dark-500 mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="size-3.5" aria-hidden />
                      {club.memberCount}{" "}
                      {club.memberCount === 1 ? "member" : "members"}
                    </span>
                    <ClubStatus club={club} />
                  </div>
                </div>
                <ChevronRightIcon
                  className="text-dark-500 size-5 shrink-0"
                  aria-hidden
                />
              </Link>
              {isSuperAdmin && (
                <div className="border-border border-t px-4 py-3">
                  <DeleteBookClubDialog
                    bookClubId={club.id}
                    bookClubName={club.name}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
