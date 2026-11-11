import { expect, test } from "@playwright/test";
import { logIn, meetings, users } from "./seed";

test("club tabs reach every section and mark the current one", async ({
  page,
}) => {
  await logIn(page, users.bob);
  await page.getByRole("link", { name: /Seed Club/ }).click();

  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  for (const [tab, heading] of [
    ["Schedule", "Schedule"],
    ["Rankings", "Rankings"],
    ["Themes", "Themes"],
    ["Members", "Members"],
  ]) {
    await tabs.getByRole("link", { name: tab }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(tabs.getByRole("link", { name: tab })).toHaveAttribute(
      "aria-current",
      "page"
    );
  }

  // Both rankings views live under the one tab.
  await tabs.getByRole("link", { name: "Rankings" }).click();
  await page.getByRole("link", { name: "Club ranking" }).click();
  await expect(page).toHaveURL(/\/global-rankings$/);
  await expect(tabs.getByRole("link", { name: "Rankings" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("a meeting sits under its club's Schedule tab", async ({ page }) => {
  await logIn(page, users.bob);
  await page.goto(`/meetings/${meetings.votingOpen}`);

  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(tabs.getByRole("link", { name: "Schedule" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  // The top bar's back chevron returns to the schedule.
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Schedule" })
    .click();
  await expect(page).toHaveURL(/\/schedule$/);
});

test("settings holds sign out", async ({ page }) => {
  await logIn(page, users.bob);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Settings" })
    .click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
});
