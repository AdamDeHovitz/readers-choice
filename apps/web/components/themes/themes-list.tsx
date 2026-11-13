"use client";

import { useState } from "react";
import { toggleThemeUpvote, deleteTheme } from "@/app/actions/themes";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  ArrowUpIcon,
  CheckCircle2Icon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import type { ClubTheme } from "@readers-choice/contract/themes";
import {
  countThemes,
  themesToShow,
  type ThemeFilter,
} from "@readers-choice/core/themes";
import { useAction } from "@/hooks/use-action";

interface ThemesListProps {
  themes: ClubTheme[];
}

export function ThemesList({ themes }: ThemesListProps) {
  const upvote = useAction(toggleThemeUpvote);
  const remove = useAction(deleteTheme);
  // Which theme the in-flight request is for, to disable its button.
  const [target, setTarget] = useState<string | null>(null);
  const isUpvoting = (themeId: string) => upvote.pending && target === themeId;
  const isDeleting = (themeId: string) => remove.pending && target === themeId;
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>(
    {}
  );
  const [filter, setFilter] = useState<ThemeFilter>("unused");

  function toggleExpanded(themeId: string) {
    setExpandedThemes((prev) => ({
      ...prev,
      [themeId]: !prev[themeId],
    }));
  }

  async function handleUpvote(themeId: string) {
    setTarget(themeId);
    const result = await upvote.run({ themeId });
    if (!result.success) alert(`Error: ${result.error}`);
  }

  async function handleDelete(themeId: string, themeName: string) {
    if (!confirm(`Are you sure you want to delete the theme "${themeName}"?`)) {
      return;
    }
    setTarget(themeId);
    const result = await remove.run({ themeId });
    if (!result.success) alert(`Error: ${result.error}`);
  }

  const sortedThemes = themesToShow(themes, filter);

  if (themes.length === 0) {
    return (
      <EmptyState
        icon={<SparklesIcon />}
        title="No themes yet"
        description="Suggest the first one. Members upvote the themes they'd like to read next."
      />
    );
  }

  const counts = countThemes(themes);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div
        role="group"
        aria-label="Filter themes"
        className="bg-sage-100 inline-flex gap-1 rounded-xl p-1"
      >
        <button
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`font-inria h-9 rounded-lg px-3 text-sm font-bold transition-colors ${
            filter === "all"
              ? "bg-sage-600 text-dark-900 shadow-sm"
              : "text-sage-800 hover:bg-sage-200"
          }`}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => setFilter("unused")}
          aria-pressed={filter === "unused"}
          className={`font-inria h-9 rounded-lg px-3 text-sm font-bold transition-colors ${
            filter === "unused"
              ? "bg-sage-600 text-dark-900 shadow-sm"
              : "text-sage-800 hover:bg-sage-200"
          }`}
        >
          Unused ({counts.unused})
        </button>
        <button
          onClick={() => setFilter("used")}
          aria-pressed={filter === "used"}
          className={`font-inria h-9 rounded-lg px-3 text-sm font-bold transition-colors ${
            filter === "used"
              ? "bg-sage-600 text-dark-900 shadow-sm"
              : "text-sage-800 hover:bg-sage-200"
          }`}
        >
          Used ({counts.used})
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
              className="border-border bg-card flex items-center gap-3 rounded-2xl border p-3 shadow-xs"
            >
              {/* Upvote section */}
              <div className="flex min-w-[44px] flex-col items-center gap-0.5">
                <Button
                  variant={theme.userHasUpvoted ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => handleUpvote(theme.id)}
                  disabled={isUpvoting(theme.id)}
                  className="size-10 rounded-full"
                  aria-label={
                    theme.userHasUpvoted
                      ? `Remove upvote from ${theme.name}`
                      : `Upvote ${theme.name}`
                  }
                  aria-pressed={theme.userHasUpvoted}
                >
                  <ArrowUpIcon className="size-4" />
                </Button>
                <span className="font-inria text-dark-600 text-xs font-medium">
                  {theme.upvoteCount}
                </span>
              </div>

              {/* Theme info */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start gap-2">
                  <h3
                    className={`font-inria text-dark-900 hover:text-rust-700 flex-1 cursor-pointer text-base font-semibold transition-colors select-none ${
                      expandedThemes[theme.id]
                        ? "break-words whitespace-normal"
                        : "truncate"
                    }`}
                    onClick={() => toggleExpanded(theme.id)}
                    title={
                      expandedThemes[theme.id]
                        ? "Click to collapse"
                        : "Click to expand"
                    }
                  >
                    {theme.name}
                  </h3>
                  {theme.timesUsed > 0 && (
                    <div className="text-rust-700 flex shrink-0 items-center gap-1 text-xs">
                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                      <span className="font-inria font-medium">
                        {theme.timesUsed}x
                      </span>
                    </div>
                  )}
                  {/* Show delete button if user is the submitter or an admin, and theme is unused */}
                  {theme.canDelete && theme.timesUsed === 0 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(theme.id, theme.name)}
                      disabled={isDeleting(theme.id)}
                      className="size-9 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${theme.name}`}
                      title="Delete theme"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>

                {/* Submitter icon only */}
                <div className="flex items-center gap-1.5">
                  {theme.submittedBy?.image ? (
                    <Image
                      src={theme.submittedBy.image}
                      alt={theme.submittedBy.name}
                      width={16}
                      height={16}
                      className="rounded-full"
                      title={`Suggested by ${theme.submittedBy.name}`}
                    />
                  ) : theme.submittedBy ? (
                    <div
                      className="bg-sage-200 flex h-4 w-4 items-center justify-center rounded-full"
                      title={`Suggested by ${theme.submittedBy.name}`}
                    >
                      <span className="font-inria text-sage-700 text-[8px] font-bold">
                        {theme.submittedBy.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ) : null}
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
