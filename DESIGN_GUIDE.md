# Readers' Choice Design Guide

Readers' Choice is mobile-first: design for a 360–430px phone, then let layouts widen. It should feel like an installed app (it ships a web manifest, so people can add it to their home screen) and like a well-made book: warm cream paper, a sage binding, rust ink, serif type.

## App shell

Every page sits in `AppShell` (`apps/web/components/shell/app-shell.tsx`), rendered by a **layout**, never by the page:

| Layout                                    | Shell                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `app/(main)/layout.tsx`                   | App tabs: My clubs, Browse, Settings                                   |
| `apps/web/app/book-clubs/[id]/layout.tsx` | Club tabs: Home, Schedule, Rankings, Themes, Members; back to My clubs |
| `apps/web/app/meetings/[id]/layout.tsx`   | The meeting's club tabs, Schedule active; back to Schedule             |

- Phones get a bottom tab bar; from `md` the same tabs sit in the top bar (`apps/web/components/shell/nav-tabs.tsx`). Add a destination there, in one list, not in a page.
- Keep tab sets at five or fewer. Group related views under one tab with a `SegmentedNav` (as Rankings does for "My ranking" / "Club ranking").
- Each segment has a `loading.tsx` showing `PageSkeleton`, so the shell stays put while data loads.
- The shell pads for the notch and home indicator (`pt-safe`, `pb-safe`, `env(safe-area-inset-*)`). Anything fixed to a screen edge must do the same.

### Colour

Colour carries the brand, not just the actions. Use it in a few bold places, and keep the rest calm so actions stand out:

- **Top bar**: sage-600 with dark text on every screen (`AppShell`). The browser `theme-color` matches it.
- **Bottom tab bar**: stays light, so the active tab (rust) is obvious.
- **One bold block per page at most**: e.g. the club home's rust "Up next" card (cream text, cream button) and the rust panel behind the featured book's description.
- **Switches** (`SegmentedNav`, filters): sage-100 track, sage-600 selected item.
- **Club tiles**: each club gets a fixed colour from its id (`book-club-card.tsx`), so clubs are easy to tell apart.
- On a rust or sage surface, the button turns cream (`bg-cream-50 text-rust-700`) rather than rust.

## Page anatomy

```tsx
<>
  <PageHeader
    title="Schedule"
    description="4 meetings"
    actions={<Button>…</Button>}
  />
  <Section title="Upcoming">…</Section>
  <Section title="Past">…</Section>
</>
```

- `PageHeader` (`apps/web/components/ui/page-header.tsx`) renders the page's only `h1`, an optional `eyebrow` (a status badge), a description and the primary actions. Actions go full width under the title on phones.
- `Section` renders an `h2` group. Use sections, not cards, to structure a page.
- **Never nest cards.** A card is one object (a book, a club) or one grouped list. On phones nested borders eat a third of the width.
- Lists of similar rows (meetings, members) are one card with `divide-y` rows, iOS-style. Rows that navigate end in a `ChevronRightIcon`.
- Empty lists use `EmptyState`: icon, title, one sentence, optional action.

## Tokens

Defined once in `packages/tokens` (`@readers-choice/tokens`), which the mobile app imports. The web mirrors them as CSS variables in `apps/web/app/globals.css` for Tailwind, and `apps/web/app/globals.test.ts` fails if the two differ, so change both together. Prefer the semantic tokens; reach for a palette step only for accents.

| Semantic                     | Value                | Use                                 |
| ---------------------------- | -------------------- | ----------------------------------- |
| `background`                 | cream-100 `#efecde`  | Page                                |
| `card`                       | cream-50 `#fdfcf7`   | Cards, inputs, sheets' content      |
| `foreground`                 | dark-900 `#1d1a05`   | Primary text                        |
| `muted` / `muted-foreground` | cream-200 / dark-600 | Quiet fills, secondary text         |
| `primary`                    | rust-600 `#994636`   | The one main action, active tab     |
| `accent`                     | sage-600 `#949f7f`   | Highlights, "needs you now" states  |
| `border`                     | dark-900 at 12%      | Card and divider lines              |
| `destructive`                | `#b42318`            | Errors and destructive actions only |

Palettes: `rust-50…800`, `sage-50…800`, `cream-50…200`, `dark-500…900`.

### Status

Meeting phases always render through `MeetingStatusBadge`, which asks `getMeetingPhase` (`packages/core/meeting-schedule.ts`). Never re-derive a phase in a component.

| Phase            | Badge variant    | Meaning                |
| ---------------- | ---------------- | ---------------------- |
| Nominations open | `active` (sage)  | The reader can act now |
| Voting open      | `active` (sage)  | The reader can act now |
| Voting closed    | `default`        | Waiting on an admin    |
| Finalized        | `primary` (rust) | Settled                |

## Typography

- **Display**: Playfair Display, `font-display`. Page titles, club names, book titles in feature spots. Sentence or title case; no forced uppercase.
- **Body**: Inria Serif, `font-inria` (the body default). Bold (700) for headings, labels and buttons; regular for text.

| Role            | Classes                                       |
| --------------- | --------------------------------------------- |
| Page title (h1) | `font-display text-3xl sm:text-4xl`           |
| Section (h2)    | `text-xl font-bold`                           |
| Card title      | `text-lg font-bold`                           |
| Body            | `text-base` / `text-sm text-muted-foreground` |
| Meta            | `text-xs text-dark-500`                       |
| Eyebrow         | `text-xs font-bold uppercase tracking-wide`   |

Inputs use 16px text on phones so iOS Safari doesn't zoom on focus.

## Components

- **Button** (`apps/web/components/ui/button.tsx`): `default` (rust, one per view), `outline`, `secondary` (sage), `ghost`, `destructive`, `link`. Default height is 44px on phones (touch target), 40px from `sm`. Put an icon before the label for create/edit actions (`<PlusIcon aria-hidden />`).
- **Dialog** (`apps/web/components/ui/dialog.tsx`): a bottom sheet with a grab handle on phones, a centered dialog from `sm`. Don't override its position or width on phones; `sm:max-w-*` is fine.
- **Badge** (`apps/web/components/ui/badge.tsx`): `default`, `active`, `primary`, `outline`.
- **SegmentedNav**: link-based switches (years, views) that keep state in the URL.
- **Alert**: every error message (`variant="destructive"`).
- **BookCover**: without a cover image, every size shows the same rust "cloth" cover: the title from `sm` up, a book glyph at `xs`.
- **DateTimeField** (`apps/web/components/ui/date-time-field.tsx`): every date-and-time input. A tap-to-expand calendar plus a 15-minute time list (the phone's own wheel on mobile). Never use `<input type="datetime-local">`.
- **LocalDate** (`apps/web/components/ui/local-date.tsx`): every timestamp shown to a reader, in one of its named formats. Servers run in UTC, so formatting a date in a Server Component shows the wrong day for evening meetings.
- Dialog buttons go in `DialogFooter`, which stacks them full width on phones.

## Interaction and accessibility

- Touch targets at least 44×44px on phones. Small icon buttons get `aria-label`.
- Toggles expose state with `aria-pressed` (vote, upvote, filters); current nav items with `aria-current="page"`.
- Focus is visible everywhere (global `:focus-visible` ring in `--ring`).
- Motion is short (≤220ms) and disabled under `prefers-reduced-motion`.
- Pages must not scroll sideways at 360px. Long rows `truncate`; chip rows scroll inside themselves.
