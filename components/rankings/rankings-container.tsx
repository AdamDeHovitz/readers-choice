import { RankingInterface } from "./ranking-interface";
import { EmptyState } from "@/components/ui/empty-state";
import type { YearBook } from "@/server/rankings";

interface RankingsContainerProps {
  bookClubId: string;
  year: number;
  books: YearBook[];
}

/** The reader's drag-to-rank list for one year. */
export function RankingsContainer({
  bookClubId,
  year,
  books,
}: RankingsContainerProps) {
  if (books.length === 0) {
    return <EmptyState title={`No books were finalized for ${year}`} />;
  }
  return (
    <RankingInterface
      key={year} // Force remount when year changes
      bookClubId={bookClubId}
      year={year}
      initialBooks={books}
    />
  );
}
