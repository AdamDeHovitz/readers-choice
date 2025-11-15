-- Readers' Choice Database Schema
-- Initial migration: Create all tables, indexes, RLS policies, and helper views

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  google_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Book clubs table
CREATE TABLE book_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_book_clubs_created_by ON book_clubs(created_by);

-- Members table (junction between users and book_clubs)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_club_id)
);

CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_book_club_id ON members(book_club_id);
CREATE INDEX idx_members_admin ON members(book_club_id, is_admin) WHERE is_admin = true;

-- Books table
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  cover_url TEXT,
  description TEXT,
  published_year INTEGER,
  external_id TEXT,
  external_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id, external_source)
);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_external ON books(external_id, external_source);

-- Themes table
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_club_id, name)
);

CREATE INDEX idx_themes_book_club_id ON themes(book_club_id);
CREATE INDEX idx_themes_submitted_by ON themes(submitted_by);

-- Theme votes table
CREATE TABLE theme_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(theme_id, user_id)
);

CREATE INDEX idx_theme_votes_theme_id ON theme_votes(theme_id);
CREATE INDEX idx_theme_votes_user_id ON theme_votes(user_id);

-- Meetings table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ NOT NULL,
  theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
  selected_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  voting_deadline TIMESTAMPTZ,
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_book_club_id ON meetings(book_club_id);
CREATE INDEX idx_meetings_date ON meetings(meeting_date);
CREATE INDEX idx_meetings_finalized ON meetings(book_club_id, is_finalized);

-- Book options table (books to vote on for meetings)
CREATE TABLE book_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, book_id)
);

CREATE INDEX idx_book_options_meeting_id ON book_options(meeting_id);
CREATE INDEX idx_book_options_book_id ON book_options(book_id);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_option_id UUID REFERENCES book_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_option_id, user_id)
);

CREATE INDEX idx_votes_book_option_id ON votes(book_option_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- Personal rankings table
CREATE TABLE personal_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_club_id, book_id, year)
);

CREATE INDEX idx_personal_rankings_user_year ON personal_rankings(user_id, book_club_id, year);
CREATE INDEX idx_personal_rankings_book_club_year ON personal_rankings(book_club_id, year);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Book clubs
ALTER TABLE book_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their book clubs"
  ON book_clubs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = book_clubs.id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create book clubs"
  ON book_clubs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update book clubs"
  ON book_clubs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = book_clubs.id
      AND members.user_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read club membership"
  ON members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.book_club_id = members.book_club_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add members"
  ON members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.book_club_id = members.book_club_id
      AND m.user_id = auth.uid()
      AND m.is_admin = true
    )
  );

CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.book_club_id = members.book_club_id
      AND m.user_id = auth.uid()
      AND m.is_admin = true
    )
  );

CREATE POLICY "Users can leave book clubs"
  ON members FOR DELETE
  USING (user_id = auth.uid());

-- Books
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read books"
  ON books FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create books"
  ON books FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Themes
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read club themes"
  ON themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = themes.book_club_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create themes"
  ON themes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = themes.book_club_id
      AND members.user_id = auth.uid()
    )
  );

-- Theme votes
ALTER TABLE theme_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read theme votes"
  ON theme_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM themes
      JOIN members ON members.book_club_id = themes.book_club_id
      WHERE themes.id = theme_votes.theme_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can vote on themes"
  ON theme_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM themes
      JOIN members ON members.book_club_id = themes.book_club_id
      WHERE themes.id = theme_votes.theme_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their theme votes"
  ON theme_votes FOR DELETE
  USING (user_id = auth.uid());

-- Meetings
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read meetings"
  ON meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = meetings.book_club_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage meetings"
  ON meetings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = meetings.book_club_id
      AND members.user_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Book options
ALTER TABLE book_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read book options"
  ON book_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      JOIN members ON members.book_club_id = meetings.book_club_id
      WHERE meetings.id = book_options.meeting_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage book options"
  ON book_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      JOIN members ON members.book_club_id = meetings.book_club_id
      WHERE meetings.id = book_options.meeting_id
      AND members.user_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read votes"
  ON votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_options
      JOIN meetings ON meetings.id = book_options.meeting_id
      JOIN members ON members.book_club_id = meetings.book_club_id
      WHERE book_options.id = votes.book_option_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can vote"
  ON votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM book_options
      JOIN meetings ON meetings.id = book_options.meeting_id
      JOIN members ON members.book_club_id = meetings.book_club_id
      WHERE book_options.id = votes.book_option_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their votes"
  ON votes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their votes"
  ON votes FOR DELETE
  USING (user_id = auth.uid());

-- Personal rankings
ALTER TABLE personal_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read rankings"
  ON personal_rankings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = personal_rankings.book_club_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their rankings"
  ON personal_rankings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- HELPER VIEWS
-- =============================================

-- Vote counts for book options
CREATE VIEW view_vote_counts AS
SELECT
  book_options.id as book_option_id,
  book_options.meeting_id,
  book_options.book_id,
  COUNT(votes.id) as vote_count
FROM book_options
LEFT JOIN votes ON votes.book_option_id = book_options.id
GROUP BY book_options.id, book_options.meeting_id, book_options.book_id;

-- Theme vote counts
CREATE VIEW view_theme_vote_counts AS
SELECT
  themes.id as theme_id,
  themes.book_club_id,
  themes.name,
  COUNT(theme_votes.id) as vote_count
FROM themes
LEFT JOIN theme_votes ON theme_votes.theme_id = themes.id
GROUP BY themes.id, themes.book_club_id, themes.name;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_clubs_updated_at BEFORE UPDATE ON book_clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_rankings_updated_at BEFORE UPDATE ON personal_rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
