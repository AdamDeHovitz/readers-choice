-- Create invite_links table
CREATE TABLE invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_invite_links_code ON invite_links(code);
CREATE INDEX idx_invite_links_book_club_id ON invite_links(book_club_id);

-- RLS policies
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read active invite links (needed to show preview before joining)
CREATE POLICY "Anyone can read active invite links"
  ON invite_links FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Admins can create invite links for their book clubs
CREATE POLICY "Admins can create invite links"
  ON invite_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = invite_links.book_club_id
      AND members.user_id = auth.uid()
      AND members.is_admin = true
    )
  );

-- Admins can update/delete their book club's invite links
CREATE POLICY "Admins can manage invite links"
  ON invite_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.book_club_id = invite_links.book_club_id
      AND members.user_id = auth.uid()
      AND members.is_admin = true
    )
  );
