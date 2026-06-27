ALTER TABLE book_options
ADD COLUMN IF NOT EXISTS description_override TEXT,
ADD COLUMN IF NOT EXISTS page_count_override INTEGER;

UPDATE book_options
SET
  description_override = books.description,
  page_count_override = books.page_count
FROM books
WHERE book_options.book_id = books.id
  AND book_options.description_override IS NULL
  AND book_options.page_count_override IS NULL
  AND (books.description IS NOT NULL OR books.page_count IS NOT NULL);
