import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/books/book-cover";
import { BookMeta } from "@/components/books/book-meta";
import { sanitizeDescription } from "@/lib/sanitize-description";
import { NominationNote } from "@/components/nominations/nomination-note";
import { EditBookOptionMetadataDialog } from "./edit-book-option-metadata-dialog";
import type { MeetingBookOptionWithVotes } from "./types";

const LONG_DESCRIPTION_LENGTH = 150;

interface BookOptionCardProps {
  option: MeetingBookOptionWithVotes;
  /** Position in the vote-sorted list (0-based). */
  index: number;
  isFinalized: boolean;
  isWinner: boolean;
  showVoteCounts: boolean;
  canVote: boolean;
  isApprovalVoting: boolean;
  currentUserIsAdmin: boolean;
  isVoting: boolean;
  isFinalizing: boolean;
  isExpanded: boolean;
  onToggleDescription: (bookOptionId: string) => void;
  onVote: (bookOptionId: string) => void;
  onFinalize: (bookId: string) => void;
}

/** A single book option on the approval-voting / finalized meeting view. */
export function BookOptionCard({
  option,
  index,
  isFinalized,
  isWinner,
  showVoteCounts,
  canVote,
  isApprovalVoting,
  currentUserIsAdmin,
  isVoting,
  isFinalizing,
  isExpanded,
  onToggleDescription,
  onVote,
  onFinalize,
}: BookOptionCardProps) {
  const hasLongDescription =
    option.book.description &&
    option.book.description.length > LONG_DESCRIPTION_LENGTH;

  return (
    <Card className={`${isWinner ? "bg-rust-50 ring-rust-600 ring-2" : ""}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Rank Badge - only show when votes are visible and not finalized */}
          {showVoteCounts && !isFinalized && (
            <div className="flex-shrink-0">
              <div
                className={`font-inria flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                  index === 0
                    ? "bg-gold-100 text-dark-900"
                    : "bg-cream-200 text-dark-600"
                }`}
              >
                #{index + 1}
              </div>
            </div>
          )}

          <div className="flex-shrink-0">
            <BookCover
              coverUrl={option.book.coverUrl}
              title={option.book.title}
              size="md"
            />
          </div>

          {/* Book Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-inria text-dark-900 mb-1 font-semibold">
                  {option.book.title}
                </h3>
                <p className="text-dark-600 mb-1 text-sm">
                  by {option.book.author}
                </p>
                <BookMeta
                  pageCount={option.book.pageCount}
                  publishedYear={option.book.publishedYear}
                  className="text-dark-500 text-xs"
                />
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isWinner && (
                  <span className="bg-rust-600 text-cream-100 font-inria rounded-full px-3 py-1 text-sm font-medium">
                    Selected
                  </span>
                )}
                {currentUserIsAdmin && (
                  <EditBookOptionMetadataDialog
                    bookOptionId={option.id}
                    bookTitle={option.book.title}
                    currentDescription={option.book.description}
                    currentPageCount={option.book.pageCount}
                  />
                )}
              </div>
            </div>

            <NominationNote
              note={option.nominationNote}
              nominatorName={option.nominatorName}
              className="mb-3"
            />

            {option.book.description && (
              <div className="mb-3">
                <div
                  className={`text-dark-600 text-sm ${isExpanded ? "" : "line-clamp-2"}`}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeDescription(option.book.description),
                  }}
                />
                {hasLongDescription && (
                  <button
                    onClick={() => onToggleDescription(option.id)}
                    className="text-gold-700 hover:text-gold-800 mt-1 text-xs font-medium"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Vote Count - only show when votes are visible */}
              {showVoteCounts && (
                <div className="flex items-center gap-2">
                  <svg
                    className="text-dark-500 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                  </svg>
                  <span className="font-inria text-dark-600 text-sm font-medium">
                    {option.voteCount}{" "}
                    {option.voteCount === 1 ? "vote" : "votes"}
                  </span>
                </div>
              )}

              {/* Your vote indicator during voting */}
              {canVote && option.userHasVoted && (
                <span className="text-rust-700 text-xs font-medium">
                  Your vote
                </span>
              )}

              {/* Vote Button - only during active voting with approval method */}
              {canVote && isApprovalVoting && (
                <Button
                  size="sm"
                  variant={option.userHasVoted ? "default" : "outline"}
                  onClick={() => onVote(option.id)}
                  disabled={isVoting}
                >
                  {isVoting
                    ? "..."
                    : option.userHasVoted
                      ? "Remove Vote"
                      : "Vote"}
                </Button>
              )}

              {/* Finalize Button (Admin Only) */}
              {!isFinalized && currentUserIsAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFinalize(option.book.id)}
                  disabled={isFinalizing}
                  className="ml-auto"
                >
                  {isFinalizing ? "Finalizing..." : "Select This Book"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
