import { expect, test } from "@playwright/test";
import { logIn, meetings, users } from "./seed";

const seedClubSchedule =
  "/book-clubs/22222222-0000-4000-8000-000000000001/schedule";

test("member subscribes to the club calendar feed", async ({
  page,
  request,
}) => {
  await logIn(page, users.bob);
  await page.goto(seedClubSchedule);
  await page.getByRole("button", { name: "Add to calendar" }).click();

  const dialog = page.getByRole("dialog");
  const feedUrl = await dialog
    .getByRole("textbox", { name: "Or copy the link into any calendar app" })
    .inputValue();
  expect(feedUrl).toMatch(/\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/);
  await expect(
    dialog.getByRole("link", { name: "Add to Google Calendar" })
  ).toHaveAttribute("href", /^https:\/\/calendar\.google\.com\/.*cid=webcal/);

  // Fetched without a session, as a calendar app would.
  const feed = await request.get(feedUrl, {
    headers: { cookie: "" },
  });
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("text/calendar");
  const ics = await feed.text();
  expect(ics).toContain("X-WR-CALNAME:Seed Club");
  expect(ics).toContain(`UID:meeting-${meetings.finalized}@readers-choice`);
  expect(ics).not.toContain(meetings.otherClub);
});

test("unknown feed tokens are not found", async ({ request }) => {
  const feed = await request.get(`/api/calendar/${"x".repeat(43)}.ics`);
  expect(feed.status()).toBe(404);
});

test("non-members get no calendar link", async ({ page }) => {
  await logIn(page, users.dave);
  await page.goto(seedClubSchedule);
  await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add to calendar" })
  ).toHaveCount(0);
});
