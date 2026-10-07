-- Add page_count column to books table
-- IF NOT EXISTS: initial_schema was later edited to include this column, so a
-- fresh replay would otherwise fail here.
ALTER TABLE books ADD COLUMN IF NOT EXISTS page_count INTEGER;
