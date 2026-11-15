-- Which tie-breaking rules a meeting's votes are counted with (TallyRules in
-- packages/core/voting-algorithm.ts). Results are recalculated on every view,
-- so a meeting keeps the rules it was voted under: changing the rules must
-- never rewrite a past result.
--
-- New meetings get rules 2. Every meeting that already has votes stays on
-- rules 1, the rules its results have been shown with.

alter table public.meetings
  add column tally_rules smallint not null default 2
    constraint meetings_tally_rules_check check (tally_rules in (1, 2));

update public.meetings m
set tally_rules = 1
where exists (
    select 1
    from public.book_options bo
    join public.votes v on v.book_option_id = bo.id
    where bo.meeting_id = m.id
  )
  or exists (
    select 1 from public.meeting_ranked_votes r where r.meeting_id = m.id
  );
