-- Demo feature: an optional one-line tagline for each club, shown on Browse.
-- Additive and nullable, so the currently deployed code is unaffected.
ALTER TABLE book_clubs ADD COLUMN tagline TEXT;
