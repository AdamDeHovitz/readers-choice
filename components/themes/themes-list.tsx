"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleThemeUpvote } from "@/app/actions/themes";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon } from "lucide-react";
import Image from "next/image";

interface Theme {
  id: string;
  name: string;
  createdAt: string;
  submittedBy: {
    id: string;
    name: string;
    image: string | null;
  };
  upvoteCount: number;
  userHasUpvoted: boolean;
  timesUsed: number;
  meetings: {
    id: string;
    meetingDate: string;
    isFinalized: boolean;
  }[];
}

interface ThemesListProps {
  themes: Theme[];
}

export function ThemesList({ themes }: ThemesListProps) {
  const router = useRouter();
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>(
    {}
  );

  async function handleUpvote(themeId: string) {
    setVotingStates((prev) => ({ ...prev, [themeId]: true }));

    const result = await toggleThemeUpvote(themeId);

    if (!result.error) {
      router.refresh();
    }

    setVotingStates((prev) => ({ ...prev, [themeId]: false }));
  }

  // Sort themes by upvotes (descending), then by creation date (newest first)
  const sortedThemes = [...themes].sort((a, b) => {
    if (b.upvoteCount !== a.upvoteCount) {
      return b.upvoteCount - a.upvoteCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (themes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">
          No themes suggested yet. Be the first to suggest one!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedThemes.map((theme) => (
        <div
          key={theme.id}
          className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
        >
          {/* Upvote button */}
          <div className="flex flex-col items-center gap-1 min-w-[48px]">
            <Button
              variant={theme.userHasUpvoted ? "default" : "outline"}
              size="sm"
              onClick={() => handleUpvote(theme.id)}
              disabled={votingStates[theme.id]}
              className="h-8 w-12 px-2"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700">
              {theme.upvoteCount}
            </span>
          </div>

          {/* Theme details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {theme.name}
              </h3>
              {theme.timesUsed > 0 && (
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium shrink-0">
                  Used {theme.timesUsed}x
                </span>
              )}
            </div>

            {/* Submitted by */}
            <div className="flex items-center gap-2 mb-2">
              {theme.submittedBy.image && (
                <Image
                  src={theme.submittedBy.image}
                  alt={theme.submittedBy.name}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <p className="text-sm text-slate-600">
                Suggested by {theme.submittedBy.name}
              </p>
              <span className="text-slate-400">•</span>
              <p className="text-sm text-slate-500">
                {new Date(theme.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Meetings using this theme */}
            {theme.meetings.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Used in meetings:</p>
                <div className="flex flex-wrap gap-1">
                  {theme.meetings
                    .sort(
                      (a, b) =>
                        new Date(b.meetingDate).getTime() -
                        new Date(a.meetingDate).getTime()
                    )
                    .map((meeting) => (
                      <a
                        key={meeting.id}
                        href={`/meetings/${meeting.id}`}
                        className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                      >
                        {new Date(meeting.meetingDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
