import { expect, test } from "@playwright/test";
import { logIn, meetings, users } from "./seed";

test("member sees nomination guidance and notes", async ({ page }) => {
  await logIn(page, users.bob);
  await page.goto(`/meetings/${meetings.nominating}`);

  await expect(
    page.getByText("add a note saying what your personal obsession is")
  ).toBeVisible();
  await expect(page.getByText("My obsession: houseplants.")).toBeVisible();
  await expect(page.getByText(/Nominated by/)).toHaveCount(0);
});

test("finalized meeting shows voting results on demand", async ({ page }) => {
  await logIn(page, users.carol);
  await page.goto(`/meetings/${meetings.finalized}`);

  await page.getByRole("button", { name: "See voting results" }).click();
  await expect(page.getByText("Vote winner")).toBeVisible();
  await expect(page.getByText("3 members voted")).toBeVisible();
});

test("non-members can't open another club's meeting", async ({ page }) => {
  await logIn(page, users.dave);
  await page.goto(`/meetings/${meetings.nominating}`);

  await expect(page).toHaveURL(/\/dashboard$/);
});

test("voters see availability at their libraries", async ({ page }) => {
  await logIn(page, users.bob);
  await page.goto(`/meetings/${meetings.votingOpen}`);

  // Lookups hit OverDrive live; whether it answers or the catalog fallback
  // shows, the panel lists each of bob's libraries.
  await page
    .getByRole("button", { name: "Library availability for The Overstory" })
    .click({ timeout: 15_000 });
  const panel = page.getByRole("dialog", { name: "The Overstory" });
  await expect(panel).toContainText("New York Public Library");
  await expect(panel).toContainText("Brooklyn Public Library");
  await expect(
    panel.getByRole("link", { name: "Manage libraries" })
  ).toHaveAttribute(
    "href",
    `/settings?returnTo=%2Fmeetings%2F${meetings.votingOpen}`
  );
});

test("voters without libraries are invited to choose some", async ({
  page,
}) => {
  await logIn(page, users.alice);
  await page.goto(`/meetings/${meetings.votingOpen}`);

  await page
    .getByRole("button", { name: "Library availability for The Overstory" })
    .click();
  await page.getByRole("link", { name: "Choose libraries" }).click();
  await expect(page).toHaveURL(/\/settings\?returnTo=/);
  await expect(
    page.getByRole("heading", { name: "Libraries", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back" })).toHaveAttribute(
    "href",
    `/meetings/${meetings.votingOpen}`
  );
});
