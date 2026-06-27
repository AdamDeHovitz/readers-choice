# Readers' Choice - AI Agent Context

## 1. Core Mandates

**CRITICAL**: You are working on a strict TypeScript project.

1.  **Build First**: Before committing ANY code, you **MUST** run `npm run build`.
2.  **No Broken Builds**: Never commit if the build fails. Fix all type errors and linting issues first.
3.  **Context Maintenance**: Update this file (specifically "Current Status") when you complete features or change architecture.

## 2. Project Overview

**Readers' Choice** is a mobile-first book club management application.

- **Goal**: Help communities organize reading groups, vote on books/themes, and track history.
- **Aesthetic**: Warm, literary, vintage book feel (Rust/Gold/Cream palette).
- **Stack**: Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Supabase (PostgreSQL + RLS), NextAuth.js v5.

## 3. Current Status

### Phase 1: Foundation & Setup ✅ COMPLETED

- ✅ Next.js 15+ with App Router & TypeScript
- ✅ Tailwind CSS v4 + shadcn/ui
- ✅ Database Schema (Users, Book Clubs, Members, Meetings, Books, Themes, Rankings)
- ✅ Auth (NextAuth v5 + Google OAuth + RLS)

### Phase 2: Core Features ✅ COMPLETED

- ✅ Book Club Creation & Member Management (Admin roles)
- ✅ Meeting Management (Schedule, Themes, Voting)
- ✅ Book Integration (Google Books API, Open Library)
- ✅ Voting System (Books & Themes)
- ✅ Ranking System (Personal drag-and-drop & Global Borda Count)
- ✅ Invite Links & Public Join Flow

### Phase 3: Refinement & Polish (Current Focus)

- 🔄 Unit & Integration Tests (Need expansion)
- 🔄 Performance Optimization (Server Components, Image optimization)
- 🔄 Mobile UX refinement
- ✅ Per-nomination book metadata overrides (admin-editable descriptions and page counts on meeting voting pages)

## 4. Architecture & Key Files

### Directory Structure

- `app/`: Next.js App Router (Pages & Layouts).
- `app/actions/`: Server Actions (Mutations). **Use these for DB writes.**
- `components/`: UI Components.
  - `ui/`: shadcn/ui primitives.
  - `book-clubs/`, `meetings/`: Feature-specific components.
- `lib/`: Utilities.
  - `supabase/`: DB Clients.
- `supabase/migrations/`: SQL Source of Truth.

### Key Routes

- `/dashboard`: User's club list.
- `/book-clubs/[id]`: Club hub (Members, Meetings).
- `/book-clubs/[id]/rankings`: Personal Year Rankings.
- `/book-clubs/[id]/global-rankings`: Community Favorites.

## 5. Design & Style Guidelines

_Refer to `STYLE.md` and `DESIGN_GUIDE.md` for full details._

- **Visuals**: Use `font-voga` (headings) and `font-inria` (body).
  - Primary: `bg-rust-600` (Buttons).
  - Accent: `bg-gold-600` (Nav/Active).
  - Background: `bg-cream-100`.
- **Coding**:
  - **Server Components** by default.
  - **Server Actions** for all data mutations.
  - **Strict Types**: No `any`. Define interfaces in `types/` or co-located if small.

## 6. Development Workflow

1.  **Analyze**: Read `README.md`, `project.md`, and this file.
2.  **Plan**: Check `STYLE.md` for conventions.
3.  **Implement**: Use `npm run dev` to test locally.
4.  **Verify**: Run `npm run build` and `npm run lint`.
5.  **Update**: If you implemented a new feature, mark it ✅ in "Current Status" above.
