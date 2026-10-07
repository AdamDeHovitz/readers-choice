-- Add temporary column to store Google Books ID during migration
ALTER TABLE books ADD COLUMN IF NOT EXISTS google_books_id VARCHAR;

-- Copy existing external_id to google_books_id for google_books records
-- This preserves the Google Books ID so we can look up Open Library equivalents
UPDATE books 
SET google_books_id = external_id 
WHERE external_source = 'google_books' AND google_books_id IS NULL;
