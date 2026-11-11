import { PageHeader } from "@/components/ui/page-header";
import { SegmentedNav } from "@/components/ui/segmented-nav";

/**
 * Shared header for the two rankings views (the reader's own ranking and the
 * club's combined one), with a switch between them and a year picker.
 */
export function RankingsHeader({
  bookClubId,
  view,
  years,
  year,
  description,
}: {
  bookClubId: string;
  view: "mine" | "club";
  years: number[];
  year: number;
  description: string;
}) {
  const base = `/book-clubs/${bookClubId}`;
  const viewPath =
    view === "mine" ? `${base}/rankings` : `${base}/global-rankings`;
  return (
    <>
      <PageHeader title="Rankings" description={description} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegmentedNav
          label="Rankings view"
          className="mx-0 px-0"
          items={[
            {
              label: "My ranking",
              href: `${base}/rankings`,
              active: view === "mine",
            },
            {
              label: "Club ranking",
              href: `${base}/global-rankings`,
              active: view === "club",
            },
          ]}
        />
        {years.length > 1 && (
          <SegmentedNav
            label="Year"
            className="mx-0 px-0"
            items={years.map((y) => ({
              label: String(y),
              href: `${viewPath}?year=${y}`,
              active: y === year,
            }))}
          />
        )}
      </div>
    </>
  );
}
