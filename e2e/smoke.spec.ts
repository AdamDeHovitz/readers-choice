import { expect, test } from "@playwright/test";
import { logIn, meetings, users } from "./seed";

test("member sees nomination guidance and notes", async ({ page }) => {
  await logIn(page, users.bob);
  await page.goto(`/meetings/${meetings.nominating}`);

  await expect(
    page.getByText("add a note saying what your personal obsession is")
  ).toBeVisible();
  await expect(page.getByText("My obsession: houseplants.")).toBeVisible();
  await expect(page.getByText("Nominated by Carol Member")).toBeVisible();
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
