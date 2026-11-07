"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  ChevronRightIcon,
  HeadphonesIcon,
  LibraryIcon,
  SearchIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  describeAvailability,
  formatWait,
  type AvailabilitySummary,
  type Format,
  type LibraryAvailability,
} from "@/lib/libraries/overdrive";

interface AvailabilityButtonProps {
  title: string;
  /** null when the user hasn't chosen any libraries yet. */
  results: LibraryAvailability[] | null;
  summary: AvailabilitySummary;
}

const FORMAT_ICON = { ebook: BookOpenIcon, audiobook: HeadphonesIcon };
const FORMAT_LABEL = { ebook: "Ebook", audiobook: "Audiobook" };

/** Headline + detail: the quickest way to read this book. */
function summaryText(
  summary: AvailabilitySummary,
  configured: boolean
): { headline: string; detail: string } {
  if (!configured) {
    return {
      headline: "Check libraries",
      detail: "Add yours to see Libby waits",
    };
  }
  if (summary.kind === "none") {
    return { headline: "Not found on Libby", detail: "Search your libraries" };
  }
  const where = `${FORMAT_LABEL[summary.format]} at ${summary.libraryName}`;
  if (summary.kind === "available") {
    return { headline: "Available now", detail: where };
  }
  if (summary.kind === "wait") {
    return { headline: `Wait ${formatWait(summary.days)}`, detail: where };
  }
  return { headline: "Waitlist", detail: where };
}

export function AvailabilityButton({
  title,
  results,
  summary,
}: AvailabilityButtonProps) {
  const pathname = usePathname();
  const settingsHref = `/settings?returnTo=${encodeURIComponent(pathname)}`;
  const configured = results !== null;

  const { headline, detail } = summaryText(summary, configured);
  const Icon =
    configured && summary.kind !== "none"
      ? FORMAT_ICON[summary.format]
      : LibraryIcon;
  const tone =
    !configured || summary.kind === "none"
      ? "border-dark-900/15 bg-white text-dark-700 hover:bg-cream-50"
      : summary.kind === "available"
        ? "border-gold-700/50 bg-gold-200 text-dark-900 hover:bg-gold-300"
        : "border-gold-600/40 bg-cream-50 text-dark-900 hover:bg-cream-200";

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "font-inria flex w-full max-w-sm items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
          "focus-visible:outline-rust-600 focus-visible:outline-2 focus-visible:outline-offset-2",
          tone
        )}
        aria-label={`Library availability for ${title}`}
      >
        <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-tight font-semibold">
            {headline}
          </span>
          <span className="line-clamp-2 block text-xs leading-snug opacity-75">
            {detail}
          </span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 opacity-50" aria-hidden />
      </DialogTrigger>

      <DialogContent
        className={cn(
          "gap-0 p-0",
          // Bottom sheet on phones, centered dialog from sm up.
          "max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-t-2xl max-sm:rounded-b-none"
        )}
      >
        <DialogHeader className="border-gold-600/20 border-b px-5 pt-5 pb-4 text-left">
          <p className="font-inria text-dark-500 text-xs tracking-wide uppercase">
            Library availability
          </p>
          <DialogTitle className="text-dark-900 pr-6 text-xl leading-tight font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-dark-600 font-inria text-sm">
            {configured
              ? "Ebooks and audiobooks on Libby at your libraries."
              : "See how long the wait is at your library before you vote."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {configured ? (
            <ul className="space-y-4">
              {results.map((result) => (
                <LibraryResult key={result.library.key} result={result} />
              ))}
            </ul>
          ) : (
            <div className="py-4 text-center">
              <div className="bg-gold-200 text-gold-800 mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
                <LibraryIcon className="size-6" aria-hidden />
              </div>
              <p className="font-inria text-dark-900 font-semibold">
                Add the libraries you use with Libby
              </p>
              <p className="font-inria text-dark-600 mx-auto mt-1 max-w-xs text-sm">
                We&apos;ll show ebook and audiobook waits for every book on the
                ballot. No library card needed.
              </p>
              <Button asChild className="mt-4">
                <Link href={settingsHref}>Choose libraries</Link>
              </Button>
            </div>
          )}
        </div>

        {configured && (
          <div className="border-gold-600/20 font-inria text-dark-500 flex items-center justify-between gap-3 border-t px-5 py-3 text-xs">
            <span>Waits are Libby estimates.</span>
            <Link
              href={settingsHref}
              className="text-rust-600 hover:text-rust-700 font-medium underline-offset-2 hover:underline"
            >
              Manage libraries
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LibraryResult({ result }: { result: LibraryAvailability }) {
  return (
    <li>
      <h3 className="font-inria text-dark-900 mb-1.5 text-sm font-bold">
        {result.library.name}
      </h3>
      {result.formats.length > 0 ? (
        <ul className="border-gold-600/20 divide-gold-600/15 divide-y overflow-hidden rounded-lg border bg-white">
          {result.formats.map((format) => (
            <li key={format.format}>
              <FormatRow
                format={format.format}
                href={format.url}
                status={describeAvailability(format)}
                available={format.status === "available"}
              />
            </li>
          ))}
        </ul>
      ) : (
        <a
          href={result.searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-dark-900/15 font-inria text-dark-600 hover:bg-cream-50 flex items-center gap-3 rounded-lg border border-dashed bg-white px-3 py-2.5 text-sm"
        >
          <SearchIcon className="text-dark-500 size-4 shrink-0" aria-hidden />
          <span className="flex-1">Not found. Search the catalog</span>
          <ArrowUpRightIcon className="text-dark-500 size-4" aria-hidden />
        </a>
      )}
    </li>
  );
}

function FormatRow({
  format,
  href,
  status,
  available,
}: {
  format: Format;
  href: string;
  status: string;
  available: boolean;
}) {
  const Icon = FORMAT_ICON[format];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-inria hover:bg-cream-50 flex items-center gap-3 px-3 py-2.5 text-sm"
    >
      <Icon className="text-dark-500 size-4 shrink-0" aria-hidden />
      <span className="text-dark-900 flex-1">{FORMAT_LABEL[format]}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold",
          available ? "bg-gold-200 text-dark-900" : "bg-cream-200 text-dark-700"
        )}
      >
        {available
          ? "Available now"
          : status === "waitlist"
            ? "Waitlist"
            : status}
      </span>
      <ArrowUpRightIcon className="text-dark-500 size-4" aria-hidden />
    </a>
  );
}
