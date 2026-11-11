-- "Log past meeting" used to send a bare date ("2026-05-01"), which was stored
-- as midnight UTC. Dates now render in the viewer's time zone, where midnight
-- UTC is still the previous evening anywhere west of UTC. Move those meetings
-- to noon UTC, which is the same calendar day from UTC-11 to UTC+11. The
-- server renders in UTC, so deployed code shows the same date before and
-- after.
--
-- Logged meetings are inserted already finalized, so finalized_at lands
-- within moments of created_at; scheduled meetings are finalized later. That,
-- plus no deadlines, keeps a meeting someone scheduled for 7pm Eastern (also
-- midnight UTC) from being moved.
UPDATE meetings
SET meeting_date = meeting_date + INTERVAL '12 hours'
WHERE (meeting_date AT TIME ZONE 'UTC')::time = '00:00'
  AND is_finalized
  AND nomination_deadline IS NULL
  AND voting_deadline IS NULL
  AND finalized_at - created_at < INTERVAL '1 minute';
