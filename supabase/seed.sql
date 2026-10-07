-- Local test data. Loaded by `npm run db:reset` (supabase db reset) after the
-- migrations. LOCAL ONLY: never run against production.
--
-- Every user's password is "password123".
--   alice@example.test  admin of Seed Club
--   bob@example.test    member of Seed Club
--   carol@example.test  member of Seed Club (votes ranked-choice)
--   dave@example.test   admin of Other Club, NOT in Seed Club (isolation checks)
--
-- IDs are fixed so URLs are stable (e.g. /meetings/44444444-0000-4000-8000-000000000004).
-- Dates are relative to now(), so each meeting stays in its phase whenever
-- the seed is loaded:
--   ...0001 finalized (past, has approval + ranked votes)
--   ...0002 voting closed, awaiting admin finalization
--   ...0003 voting open
--   ...0004 nominations open ("Personal Obsessions", with nomination notes)
--   ...0005 nominations open in Other Club

-- Users ----------------------------------------------------------------------
INSERT INTO users (id, email, name, password_hash) VALUES
  ('11111111-0000-4000-8000-000000000001', 'alice@example.test', 'Alice Admin',  '$2b$10$uRGf82u70OD0c888cxRSBeOrBNPwADDVOxalesRm9EkAlg6UPQK/K'),
  ('11111111-0000-4000-8000-000000000002', 'bob@example.test',   'Bob Member',   '$2b$10$uRGf82u70OD0c888cxRSBeOrBNPwADDVOxalesRm9EkAlg6UPQK/K'),
  ('11111111-0000-4000-8000-000000000003', 'carol@example.test', 'Carol Member', '$2b$10$uRGf82u70OD0c888cxRSBeOrBNPwADDVOxalesRm9EkAlg6UPQK/K'),
  ('11111111-0000-4000-8000-000000000004', 'dave@example.test',  'Dave Outsider','$2b$10$uRGf82u70OD0c888cxRSBeOrBNPwADDVOxalesRm9EkAlg6UPQK/K');

-- Clubs and members ----------------------------------------------------------
INSERT INTO book_clubs (id, name, description, created_by) VALUES
  ('22222222-0000-4000-8000-000000000001', 'Seed Club',  'Local test club with a meeting in every phase.', '11111111-0000-4000-8000-000000000001'),
  ('22222222-0000-4000-8000-000000000002', 'Other Club', 'A second club, for checking data stays isolated.', '11111111-0000-4000-8000-000000000004');

INSERT INTO members (user_id, book_club_id, is_admin) VALUES
  ('11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', true),
  ('11111111-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', false),
  ('11111111-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', false),
  ('11111111-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000002', true);

-- Join link for Seed Club: /join/seedInviteCode00000000 (e.g. as dave)
INSERT INTO invite_links (book_club_id, code, created_by) VALUES
  ('22222222-0000-4000-8000-000000000001', 'seedInviteCode00000000', '11111111-0000-4000-8000-000000000001');

-- Themes ---------------------------------------------------------------------
INSERT INTO themes (id, book_club_id, name, description, submitted_by) VALUES
  ('66666666-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 'Personal Obsessions', 'Books about the thing you can''t stop talking about.', '11111111-0000-4000-8000-000000000001'),
  ('66666666-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', 'Unreliable Narrators', NULL, '11111111-0000-4000-8000-000000000002'),
  ('66666666-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', 'Translated Fiction', NULL, '11111111-0000-4000-8000-000000000003');

INSERT INTO theme_votes (theme_id, user_id) VALUES
  ('66666666-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002'),
  ('66666666-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000003'),
  ('66666666-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001');

-- Books ----------------------------------------------------------------------
INSERT INTO books (id, title, author, description, page_count, published_year, external_id, external_source) VALUES
  ('33333333-0000-4000-8000-000000000001', 'Piranesi', 'Susanna Clarke', 'A man lives in a house of endless halls and tides.', 272, 2020, 'seed-1', 'seed'),
  ('33333333-0000-4000-8000-000000000002', 'The Remains of the Day', 'Kazuo Ishiguro', 'A butler reflects on decades of service.', 258, 1989, 'seed-2', 'seed'),
  ('33333333-0000-4000-8000-000000000003', 'Pale Fire', 'Vladimir Nabokov', 'A poem, and a commentary that is not quite about it.', 315, 1962, 'seed-3', 'seed'),
  ('33333333-0000-4000-8000-000000000004', 'Station Eleven', 'Emily St. John Mandel', 'A travelling theatre troupe after the collapse.', 333, 2014, 'seed-4', 'seed'),
  ('33333333-0000-4000-8000-000000000005', 'Klara and the Sun', 'Kazuo Ishiguro', 'An Artificial Friend observes the family she serves.', 303, 2021, 'seed-5', 'seed'),
  ('33333333-0000-4000-8000-000000000006', 'The Overstory', 'Richard Powers', 'Nine lives drawn together by trees.', 502, 2018, 'seed-6', 'seed'),
  ('33333333-0000-4000-8000-000000000007', 'Braiding Sweetgrass', 'Robin Wall Kimmerer', 'Indigenous wisdom, science, and plants.', 391, 2013, 'seed-7', 'seed'),
  ('33333333-0000-4000-8000-000000000008', 'The Orchid Thief', 'Susan Orlean', 'A reporter follows a man obsessed with rare orchids.', 284, 1998, 'seed-8', 'seed'),
  ('33333333-0000-4000-8000-000000000009', 'H Is for Hawk', 'Helen Macdonald', 'Grief, and training a goshawk.', 300, 2014, 'seed-9', 'seed'),
  ('33333333-0000-4000-8000-000000000010', 'Moby-Dick', 'Herman Melville', 'One captain''s fixation on one whale.', 635, 1851, 'seed-10', 'seed');

-- Meetings -------------------------------------------------------------------
INSERT INTO meetings (id, book_club_id, meeting_date, nomination_deadline, voting_deadline, theme_id, is_finalized, finalized_at, finalized_by, selected_book_id, details) VALUES
  ('44444444-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001',
    now() - interval '30 days', now() - interval '40 days', now() - interval '31 days',
    '66666666-0000-4000-8000-000000000002', true, now() - interval '30 days',
    '11111111-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000002', NULL),
  ('44444444-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001',
    now() + interval '2 days', now() - interval '5 days', now() - interval '1 day',
    NULL, false, NULL, NULL, NULL, NULL),
  ('44444444-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001',
    now() + interval '6 days', now() - interval '1 day', now() + interval '5 days',
    '66666666-0000-4000-8000-000000000003', false, NULL, NULL, NULL, NULL),
  ('44444444-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000001',
    now() + interval '14 days', now() + interval '7 days', now() + interval '12 days',
    '66666666-0000-4000-8000-000000000001', false, NULL, NULL, NULL,
    'When you nominate, add a note saying what your personal obsession is and how the book connects to it.'),
  ('44444444-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000002',
    now() + interval '10 days', now() + interval '5 days', now() + interval '9 days',
    NULL, false, NULL, NULL, NULL, NULL);

-- Nominations (book_options) -------------------------------------------------
INSERT INTO book_options (id, meeting_id, book_id, added_by, description_override, page_count_override, nomination_note)
SELECT o.id::uuid, o.meeting_id::uuid, b.id, o.added_by::uuid, b.description, b.page_count, o.note
FROM (VALUES
  -- 1: finalized
  ('55555555-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', NULL),
  ('55555555-0000-4000-8000-000000000002', '44444444-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002', 'Stevens is the most unreliable narrator I know.'),
  ('55555555-0000-4000-8000-000000000003', '44444444-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000003', NULL),
  -- 2: voting closed
  ('55555555-0000-4000-8000-000000000004', '44444444-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', NULL),
  ('55555555-0000-4000-8000-000000000005', '44444444-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000002', NULL),
  -- 3: voting open
  ('55555555-0000-4000-8000-000000000006', '44444444-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000002', 'Long, but it changed how I look at every tree.'),
  ('55555555-0000-4000-8000-000000000007', '44444444-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000003', NULL),
  -- 4: nominating (alice has not nominated yet)
  ('55555555-0000-4000-8000-000000000008', '44444444-0000-4000-8000-000000000004', '33333333-0000-4000-8000-000000000008', '11111111-0000-4000-8000-000000000002', 'My obsession: houseplants. I own forty-one.'),
  ('55555555-0000-4000-8000-000000000009', '44444444-0000-4000-8000-000000000004', '33333333-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000003', NULL),
  -- 5: Other Club
  ('55555555-0000-4000-8000-000000000010', '44444444-0000-4000-8000-000000000005', '33333333-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000004', 'Whales.')
) AS o(id, meeting_id, book_id, added_by, note)
JOIN books b ON b.id = o.book_id::uuid;

-- Votes ----------------------------------------------------------------------
-- Meeting 1 (finalized): alice + bob approval, carol ranked.
INSERT INTO meeting_voting_preferences (meeting_id, user_id, voting_method) VALUES
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'approval'),
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002', 'approval'),
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003', 'ranked'),
  ('44444444-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 'approval'),
  ('44444444-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002', 'approval'),
  ('44444444-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000003', 'approval'),
  ('44444444-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000002', 'approval');

INSERT INTO votes (book_option_id, user_id) VALUES
  ('55555555-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001'),
  ('55555555-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002'),
  ('55555555-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000002'),
  -- Meeting 2 (voting closed)
  ('55555555-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001'),
  ('55555555-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000002'),
  ('55555555-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000003'),
  -- Meeting 3 (voting open): only bob has voted
  ('55555555-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000002');

INSERT INTO meeting_ranked_votes (meeting_id, user_id, book_option_id, rank) VALUES
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003', '55555555-0000-4000-8000-000000000003', 1),
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003', '55555555-0000-4000-8000-000000000002', 2);

-- Personal rankings for last year's pick
INSERT INTO personal_rankings (user_id, book_club_id, book_id, year, rank) VALUES
  ('11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000002', extract(year FROM now())::int, 1);
