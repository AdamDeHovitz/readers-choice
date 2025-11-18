# Readers' Choice

A beautiful, mobile-first book club management application that helps communities organize reading groups, vote on books, track meetings, and share their favorite reads.

🌐 **Live Demo**: [https://readers-choice.vercel.app/](https://readers-choice.vercel.app/)

## ✨ Features

### Book Club Management
- **Create and Join Book Clubs**: Start your own club or join existing ones via invite links
- **Member Management**: Admins can promote members, manage permissions, and remove users
- **Multiple Clubs**: Users can participate in multiple book clubs simultaneously

### Meeting Organization
- **Schedule Meetings**: Set dates, themes, and deadlines for nominations and voting
- **Book Nominations**: Search and add books using the Open Library and Google Books APIs
- **Democratic Voting**: Members vote on book options for each meeting
- **Meeting History**: Track past meetings and selected books

### Theme System
- **Suggest Themes**: Members can propose themes for future meetings
- **Theme Voting**: Upvote your favorite themes
- **Smart Matching**: Fuzzy matching prevents duplicate themes (e.g., "Mystery" vs "Mysteries")

### Personal & Global Rankings
- **Year-Based Rankings**: Rank your favorite books by year using drag-and-drop
- **Mark as Unread**: Track which meetings you missed
- **Global Rankings**: See community favorites calculated using Borda Count scoring
- **Visual Medals**: Top 3 books display with medal indicators

### Modern User Experience
- **Google OAuth**: Secure authentication with Google accounts
- **Mobile-First Design**: Beautiful, responsive UI optimized for all devices
- **Real-Time Updates**: Instant feedback on votes and changes
- **Warm Aesthetic**: Earthy color palette inspired by vintage books and cozy reading spaces

## 🛠 Technologies Used

### Frontend
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible component primitives
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled accessible components
- **[dnd-kit](https://dndkit.com/)** - Drag-and-drop for rankings
- **[Lucide Icons](https://lucide.dev/)** - Beautiful icon set

### Backend & Infrastructure
- **[Supabase](https://supabase.com/)** - PostgreSQL database with Row Level Security
- **[NextAuth.js v5](https://next-auth.js.org/)** - Authentication with Google OAuth
- **[Vercel](https://vercel.com/)** - Deployment platform
- **[Open Library API](https://openlibrary.org/developers/api)** - Book search and metadata
- **[Google Books API](https://developers.google.com/books)** - Additional book data enrichment

### Development Tools
- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Turbopack](https://turbo.build/pack)** - Fast bundler for development

## 🚀 Self-Hosting Guide

Want to run your own instance of Readers' Choice? Follow these steps:

### Prerequisites
- **Node.js** 18+ and npm
- **Supabase** account (free tier available)
- **Google Cloud** account for OAuth (free)
- **Vercel** account for deployment (optional, free tier available)

### 1. Clone the Repository

```bash
git clone https://github.com/AdamDeHovitz/readers-choice.git
cd readers-choice
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and copy:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon` public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`)

3. Create the database schema by running the SQL migrations in order from `supabase/migrations/`:
   - Navigate to **SQL Editor** in Supabase Dashboard
   - Copy and execute each migration file sequentially

4. **Configure Row Level Security (RLS)**:
   - The migrations include RLS policies
   - Ensure they're applied correctly in your Supabase project

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Choose **Web application** and add:
   - **Authorized JavaScript origins**: `http://localhost:3000` (for development)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy your **Client ID** and **Client Secret**

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
AUTH_SECRET=your_random_secret_string  # Generate with: openssl rand -base64 32
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret

# App URL (for OAuth callbacks)
NEXTAUTH_URL=http://localhost:3000  # Change to your production URL when deploying
```

### 5. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

### 6. Deploy to Vercel (Optional)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Update `NEXTAUTH_URL` to your Vercel deployment URL
5. Update Google OAuth redirect URIs to include your Vercel domain

## 📚 Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User accounts and profiles
- **book_clubs** - Book club information
- **members** - Club membership and admin status
- **meetings** - Scheduled and past meetings
- **themes** - Meeting themes with voting
- **books** - Book metadata from APIs
- **book_options** - Books nominated for meetings
- **votes** - Member votes on book options
- **rankings** - Personal year-based book rankings

For detailed schema and relationships, see `supabase/migrations/`.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues
- Check the [existing issues](https://github.com/AdamDeHovitz/readers-choice/issues) first
- Create a new issue with a clear description and steps to reproduce (for bugs)
- Feature requests are also welcome!

### Submitting Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Ensure tests pass and the build succeeds: `npm run build`
5. Run the linter: `npm run lint`
6. Commit your changes with a clear message
7. Push to your fork and submit a pull request

### Good First Issues
Check out issues labeled `good first issue` to get started. The current issue list is a great place to find contribution opportunities!

### Development Guidelines
- Follow the coding standards in `STYLE.md`
- Adhere to the design system in `DESIGN_GUIDE.md`
- Write clean, reusable code
- Add comments for complex logic
- Keep commits focused and atomic

## 📝 License

ISC License - see the repository for details.

## 🙏 Acknowledgments

- Book data provided by [Open Library](https://openlibrary.org/) and [Google Books](https://books.google.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

Built with ❤️ for book lovers everywhere. Happy reading! 📖
