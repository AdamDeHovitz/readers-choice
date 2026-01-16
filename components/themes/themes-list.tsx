"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleThemeUpvote, deleteTheme } from "@/app/actions/themes";
import { Button } from "@/components/ui/button";
import {
  ArrowUpIcon,
  CheckCircle2Icon,
  Trash2Icon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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

export function ThemesList({
  themes,
  currentUserId,
  isAdmin,
}: ThemesListProps) {
  const router = useRouter();
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({});
  const [deletingStates, setDeletingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>(
    {}
  );
  const [filter, setFilter] = useState<FilterType>("unused");

  function toggleExpanded(themeId: string) {
    setExpandedThemes((prev) => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  }

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
      <div className="py-12 text-center">
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
      <div className="border-gold-600/20 flex gap-2 border-b pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`font-inria rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-gold-600 text-dark-900"
              : "text-dark-600 hover:bg-cream-200"
          }`}
        >
          All ({themes.length})
        </button>
        <button
          onClick={() => setFilter("unused")}
          className={`font-inria rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === "unused"
              ? "bg-gold-600 text-dark-900"
              : "text-dark-600 hover:bg-cream-200"
          }`}
        >
          Unused ({unusedCount})
        </button>
        <button
          onClick={() => setFilter("used")}
          className={`font-inria rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
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
        <div className="py-8 text-center">
          <p className="text-dark-600">
            No {filter === "all" ? "" : filter} themes found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sortedThemes.map((theme) => (
            <div
              key={theme.id}
              className="border-gold-600/20 flex items-center gap-3 rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm"
            >
              {/* Upvote section */}
              <div className="flex min-w-[44px] flex-col items-center gap-0.5">
                <Button
                  variant={theme.userHasUpvoted ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => handleUpvote(theme.id)}
                  disabled={votingStates[theme.id]}
                  className="h-7 w-7"
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                </Button>
                <span className="font-inria text-dark-600 text-xs font-medium">
                  {theme.upvoteCount}
                </span>
              </div>

              {/* Theme info */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start gap-2">
                  <h3
                    className={`font-inria text-dark-900 flex-1 text-base font-semibold select-none ${
                      expandedThemes[theme.id]
                        ? "break-words whitespace-normal"
                        : "truncate"
                    }`}
                    title={theme.name}
                  >
                    {theme.name}
                  </h3>

                  {/* Expand/Collapse Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(theme.id);
                    }}
                    className="text-gold-600 hover:text-gold-700 hover:bg-gold-50 h-6 w-6 shrink-0 p-0"
                    title={expandedThemes[theme.id] ? "Collapse" : "Expand"}
                  >
                    {expandedThemes[theme.id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {theme.timesUsed > 0 && (
                    <div className="text-rust-700 flex shrink-0 items-center gap-1 text-xs">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                      <span className="font-inria font-medium">
                        {theme.timesUsed}x
                      </span>
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
                        className="h-7 w-7 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
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
                      className="bg-gold-200 flex h-4 w-4 items-center justify-center rounded-full"
                      title={`Suggested by ${theme.submittedBy.name}`}
                    >
                      <span className="font-inria text-gold-700 text-[8px] font-bold">
                        {theme.submittedBy.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-dark-500 text-xs">
                    {theme.upvoteCount}{" "}
                    {theme.upvoteCount === 1 ? "vote" : "votes"}
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
