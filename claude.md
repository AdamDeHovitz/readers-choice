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

## Phase 2: Core Book Club Features ✅ COMPLETED
- ✅ Book club creation flow with dialog
- ✅ Book club list view on dashboard
- ✅ Book club detail page with member list
- ✅ Server actions updated to use service role key (bypassing RLS)
- ✅ Admin panel for managing members (promote/demote admins, remove members)
- ✅ Google Books API integration (search and fetch book data)
- ✅ Book display components (BookCard, BookSearch)

## Phase 3: Meeting Management ✅ COMPLETED
- ✅ Admin interface to create meetings
- ✅ Meeting date and theme selection
- ✅ Book options and voting system
- ✅ Meeting history/timeline view
- ✅ Meeting detail pages with book voting
- ✅ Finalize meeting and select winning book
- ✅ Log past meetings (for historical data)
- ✅ Edit meeting details (date, theme, book)

## Phase 4: Theme Management & Rankings 🚧 IN PROGRESS
- ✅ Theme suggestion interface
- ✅ Theme voting/upvoting
- ✅ Themes list page showing usage and votes
- ✅ Personal year rankings (drag and drop)
- ⏳ Global year rankings calculation

## Available Routes
- `/` - Home page (public)
- `/login` - Google OAuth sign in (public)
- `/dashboard` - Protected dashboard showing user's book clubs (requires auth)
- `/book-clubs/[id]` - Book club detail page with members and meetings (requires auth)
- `/book-clubs/[id]/themes` - Themes page with suggestion and voting (requires auth)
- `/book-clubs/[id]/rankings` - Personal rankings page with drag-and-drop (requires auth)
- `/meetings/[id]` - Meeting detail page with book options and voting (requires auth)
- `/test-connection` - Database connection test (public)

## Features Working Now
- Users can create book clubs (creator becomes admin automatically)
- Users see all their book clubs on the dashboard
- Book club detail pages show description, members, and meetings
- Admin badges displayed for admin members
- Admins can promote/demote members and remove them from book clubs
- Members can leave book clubs
- Admins can schedule meetings with dates, themes, and voting deadlines
- Admins can log past meetings with pre-selected books
- Admins can edit meeting details (date, theme, book)
- Meeting timeline shows upcoming and past meetings
- Admins can add book options to meetings via Google Books search
- Members can vote for their preferred book
- Real-time vote counting displayed on meeting pages
- Admins can finalize meetings and select the winning book
- Members can suggest themes for future meetings
- Members can upvote/downvote themes
- Themes page shows which themes have been used and how many times
- Members can rank their favorite books by year using drag-and-drop
- Books can be marked as "not read" if member didn't attend
- Rankings automatically organized by year with year selector
- Google Books API integration for book search and metadata
- Server actions use service role key to bypass RLS (auth handled at action level)

# Workflow Notes

## Database Migrations
- SQL migrations are stored in `supabase/migrations/` for reference only
- When creating new migrations, copy the SQL directly to the user's clipboard
- User will paste migrations into Supabase Dashboard SQL Editor
- Migration files should remain in the repo for documentation

Please keep CLAUDE.md up to date through development
