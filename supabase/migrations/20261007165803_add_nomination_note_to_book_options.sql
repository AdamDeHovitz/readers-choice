ALTER TABLE book_options
ADD COLUMN IF NOT EXISTS nomination_note TEXT
  CHECK (nomination_note IS NULL OR char_length(nomination_note) <= 500);

COMMENT ON COLUMN book_options.nomination_note IS 'Optional plain-text note from the nominator (e.g. why this book, answer to the meeting guidance)';
