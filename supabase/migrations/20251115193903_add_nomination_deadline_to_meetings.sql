-- Add nomination_deadline column to meetings table
ALTER TABLE meetings
ADD COLUMN nomination_deadline TIMESTAMPTZ;

-- Update existing meetings to use voting_deadline as nomination_deadline
-- (for backwards compatibility)
UPDATE meetings
SET nomination_deadline = voting_deadline
WHERE voting_deadline IS NOT NULL;

COMMENT ON COLUMN meetings.nomination_deadline IS 'Deadline for nominating books (end of nomination phase)';
COMMENT ON COLUMN meetings.voting_deadline IS 'Deadline for voting on books (end of voting phase, usually the meeting time)';
