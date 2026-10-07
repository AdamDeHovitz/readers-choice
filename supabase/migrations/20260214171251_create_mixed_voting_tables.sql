-- Store ranked choice votes for meetings
CREATE TABLE meeting_ranked_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  book_option_id UUID REFERENCES book_options(id) ON DELETE CASCADE NOT NULL,
  rank INTEGER NOT NULL CHECK (rank >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, user_id, book_option_id),
  UNIQUE(meeting_id, user_id, rank)
);

CREATE INDEX idx_meeting_ranked_votes_meeting ON meeting_ranked_votes(meeting_id);
CREATE INDEX idx_meeting_ranked_votes_user ON meeting_ranked_votes(user_id);
CREATE INDEX idx_meeting_ranked_votes_option ON meeting_ranked_votes(book_option_id);

-- Track voting method per user per meeting
CREATE TABLE meeting_voting_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  voting_method TEXT NOT NULL CHECK (voting_method IN ('approval', 'ranked')) DEFAULT 'approval',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

CREATE INDEX idx_meeting_voting_prefs_meeting ON meeting_voting_preferences(meeting_id);
CREATE INDEX idx_meeting_voting_prefs_user ON meeting_voting_preferences(user_id);

-- RLS for meeting_ranked_votes
ALTER TABLE meeting_ranked_votes ENABLE ROW LEVEL SECURITY;

-- Users can always see their own ranked votes
CREATE POLICY "Users can read own ranked votes"
  ON meeting_ranked_votes FOR SELECT
  USING (user_id = auth.uid());

-- Members can read ranked votes after voting deadline or if meeting is finalized
CREATE POLICY "Members can read ranked votes after deadline"
  ON meeting_ranked_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN members ON members.book_club_id = m.book_club_id
      WHERE m.id = meeting_ranked_votes.meeting_id
      AND members.user_id = auth.uid()
      AND (m.is_finalized = true OR (m.voting_deadline IS NOT NULL AND m.voting_deadline < NOW()))
    )
  );

-- Members can insert their own ranked votes during voting phase
CREATE POLICY "Members can submit ranked votes"
  ON meeting_ranked_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM book_options bo
      JOIN meetings m ON m.id = bo.meeting_id
      JOIN members ON members.book_club_id = m.book_club_id
      WHERE bo.id = meeting_ranked_votes.book_option_id
      AND m.id = meeting_ranked_votes.meeting_id
      AND members.user_id = auth.uid()
      AND m.is_finalized = false
    )
  );

-- Users can update their own ranked votes
CREATE POLICY "Users can update own ranked votes"
  ON meeting_ranked_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own ranked votes
CREATE POLICY "Users can delete own ranked votes"
  ON meeting_ranked_votes FOR DELETE
  USING (user_id = auth.uid());

-- RLS for meeting_voting_preferences
ALTER TABLE meeting_voting_preferences ENABLE ROW LEVEL SECURITY;

-- Members can read voting preferences for meetings in their clubs
CREATE POLICY "Members can read voting preferences"
  ON meeting_voting_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN members ON members.book_club_id = m.book_club_id
      WHERE m.id = meeting_voting_preferences.meeting_id
      AND members.user_id = auth.uid()
    )
  );

-- Users can insert their own voting preferences
CREATE POLICY "Users can insert own voting preferences"
  ON meeting_voting_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own voting preferences
CREATE POLICY "Users can update own voting preferences"
  ON meeting_voting_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own voting preferences
CREATE POLICY "Users can delete own voting preferences"
  ON meeting_voting_preferences FOR DELETE
  USING (user_id = auth.uid());

-- Create trigger for updated_at on meeting_ranked_votes
CREATE TRIGGER set_meeting_ranked_votes_updated_at
  BEFORE UPDATE ON meeting_ranked_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on meeting_voting_preferences
CREATE TRIGGER set_meeting_voting_preferences_updated_at
  BEFORE UPDATE ON meeting_voting_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
