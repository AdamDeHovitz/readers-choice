# Overview
You are making a beautiful mobile-first website that sparks joy. The website is used for organizing a community around a book club.

While developing this site it is important to write clean, reusable code and to make sure we pass linter
rules. Also please conform with the style guide in STYLE.md and that tests still pass

Project details are available in project.md

# Current Status

## Phase 1: Foundation & Setup ✅ COMPLETED
- ✅ Next.js 15 with TypeScript and App Router
- ✅ Tailwind CSS v4 with shadcn/ui foundation
- ✅ ESLint and Prettier configured
- ✅ STYLE.md coding standards created
- ✅ Database schema designed (see database-schema.md)
- ✅ Supabase connected with all tables created
- ✅ NextAuth.js v5 with Google OAuth configured
- ✅ Auth middleware and route protection implemented
- ✅ Login/logout UI components built

## Phase 2: Core Book Club Features 🚧 IN PROGRESS
- ✅ Book club creation flow with dialog
- ✅ Book club list view on dashboard
- ✅ Book club detail page with member list
- ✅ Server actions updated to use service role key (bypassing RLS)
- ⏳ Admin panel for managing members
- ⏳ Google Books API integration
- ⏳ Book display components
- ⏳ Meeting history/timeline view

## Available Routes
- `/` - Home page (public)
- `/login` - Google OAuth sign in (public)
- `/dashboard` - Protected dashboard showing user's book clubs (requires auth)
- `/book-clubs/[id]` - Book club detail page with members (requires auth)
- `/test-connection` - Database connection test (public)

## Features Working Now
- Users can create book clubs (creator becomes admin automatically)
- Users see all their book clubs on the dashboard
- Book club detail pages show description and member list
- Admin badges displayed for admin members
- Server actions use service role key to bypass RLS (auth handled at action level)

# Workflow Notes

## Database Migrations
- SQL migrations are stored in `supabase/migrations/` for reference only
- When creating new migrations, copy the SQL directly to the user's clipboard
- User will paste migrations into Supabase Dashboard SQL Editor
- Migration files should remain in the repo for documentation

Please keep CLAUDE.md up to date through development
