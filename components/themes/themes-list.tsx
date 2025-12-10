"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleThemeUpvote, deleteTheme } from "@/app/actions/themes";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, CheckCircle2Icon, Trash2Icon } from "lucide-react";
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
  currentUserId: string;
  isAdmin: boolean;
}

type FilterType = "all" | "used" | "unused";

export function ThemesList({ themes, currentUserId, isAdmin }: ThemesListProps) {
  const router = useRouter();
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({});
  const [deletingStates, setDeletingStates] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<FilterType>("unused");

  async function handleUpvote(themeId: string) {
    setVotingStates((prev) => ({ ...prev, [themeId]: true }));

    const result = await toggleThemeUpvote(themeId);

    if (!result.error) {
      router.refresh();
    }

    setVotingStates((prev) => ({ ...prev, [themeId]: false }));
  }

  async function handleDelete(themeId: string, themeName: string) {
    if (!confirm(`Are you sure you want to delete the theme "${themeName}"?`)) {
      return;
    }

    setDeletingStates((prev) => ({ ...prev, [themeId]: true }));

    const result = await deleteTheme(themeId);

    if (result.error) {
      alert(`Error: ${result.error}`);
      setDeletingStates((prev) => ({ ...prev, [themeId]: false }));
    } else {
      router.refresh();
    }
  }

  // Filter themes based on selected filter
  const filteredThemes = themes.filter((theme) => {
    if (filter === "used") return theme.timesUsed > 0;
    if (filter === "unused") return theme.timesUsed === 0;
    return true;
  });

  // Sort themes by upvotes (descending), then by creation date (newest first)
  const sortedThemes = [...filteredThemes].sort((a, b) => {
    if (b.upvoteCount !== a.upvoteCount) {
      return b.upvoteCount - a.upvoteCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (themes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-600">
          No themes suggested yet. Be the first to suggest one!
        </p>
      </div>
    );
  }

  const usedCount = themes.filter((t) => t.timesUsed > 0).length;
  const unusedCount = themes.filter((t) => t.timesUsed === 0).length;

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gold-600/20 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-t-lg font-medium font-inria text-sm transition-colors ${
            filter === "all"
              ? "bg-gold-600 text-dark-900"
              : "text-dark-600 hover:bg-cream-200"
          }`}
        >
          All ({themes.length})
        </button>
        <button
          onClick={() => setFilter("unused")}
          className={`px-4 py-2 rounded-t-lg font-medium font-inria text-sm transition-colors ${
            filter === "unused"
              ? "bg-gold-600 text-dark-900"
              : "text-dark-600 hover:bg-cream-200"
          }`}
        >
          Unused ({unusedCount})
        </button>
        <button
          onClick={() => setFilter("used")}
          className={`px-4 py-2 rounded-t-lg font-medium font-inria text-sm transition-colors ${
            filter === "used"
              ? "bg-gold-600 text-dark-900"
              : "text-dark-600 hover:bg-cream-200"
          }`}
        >
          Used ({usedCount})
        </button>
      </div>

      {/* Compact Themes Grid */}
      {sortedThemes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-dark-600">
            No {filter === "all" ? "" : filter} themes found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedThemes.map((theme) => (
            <div
              key={theme.id}
              className="flex items-center gap-3 p-3 bg-white border border-gold-600/20 rounded-lg hover:shadow-sm transition-shadow"
            >
              {/* Upvote section */}
              <div className="flex flex-col items-center gap-0.5 min-w-[44px]">
                <Button
                  variant={theme.userHasUpvoted ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => handleUpvote(theme.id)}
                  disabled={votingStates[theme.id]}
                  className="h-7 w-7"
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium font-inria text-dark-600">
                  {theme.upvoteCount}
                </span>
              </div>

              {/* Theme info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold font-inria text-dark-900 truncate flex-1">
                    {theme.name}
                  </h3>
                  {theme.timesUsed > 0 && (
                    <div className="flex items-center gap-1 text-xs text-rust-700 shrink-0">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                      <span className="font-medium font-inria">{theme.timesUsed}x</span>
                    </div>
                  )}
                  {/* Show delete button if user is the submitter or an admin, and theme is unused */}
                  {(theme.submittedBy.id === currentUserId || isAdmin) &&
                    theme.timesUsed === 0 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(theme.id, theme.name)}
                        disabled={deletingStates[theme.id]}
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                        title="Delete theme"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                </div>

                {/* Submitter icon only */}
                <div className="flex items-center gap-1.5">
                  {theme.submittedBy.image ? (
                    <Image
                      src={theme.submittedBy.image}
                      alt={theme.submittedBy.name}
                      width={16}
                      height={16}
                      className="rounded-full"
                      title={`Suggested by ${theme.submittedBy.name}`}
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full bg-gold-200 flex items-center justify-center"
                      title={`Suggested by ${theme.submittedBy.name}`}
                    >
                      <span className="text-[8px] font-bold font-inria text-gold-700">
                        {theme.submittedBy.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-dark-500">
                    {theme.upvoteCount} {theme.upvoteCount === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
