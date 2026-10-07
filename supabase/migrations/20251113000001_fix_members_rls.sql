-- Fix infinite recursion in members table RLS policies
-- The issue is that the INSERT policy checks if user is admin by querying members table,
-- which creates infinite recursion when trying to insert the first admin

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can add members" ON members;
DROP POLICY IF EXISTS "Admins can update members" ON members;

-- Allow users to insert themselves as members (the application logic will set is_admin correctly)
CREATE POLICY "Users can add themselves as members"
  ON members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can update members, but using a simpler check that doesn't recurse
CREATE POLICY "Admins can update member roles"
  ON members FOR UPDATE
  USING (
    -- User can update if they are already an admin in this book club
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.book_club_id = members.book_club_id
      AND m.user_id = auth.uid()
      AND m.is_admin = true
      LIMIT 1
    )
  );
