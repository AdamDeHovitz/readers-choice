import { expect, test } from "@playwright/test";
import { logIn, users } from "./seed";

// Pages load several queries in parallel, and Postgres rejects a malformed
// uuid outright, so the proxy answers these with the 404 page first.
test("malformed club and meeting ids show the not-found page", async ({
  page,
}) => {
  await logIn(page, users.bob);
  for (const path of [
    "/book-clubs/not-a-uuid",
    "/book-clubs/not-a-uuid/themes",
    "/book-clubs/not-a-uuid/schedule",
    "/meetings/not-a-uuid",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Page not found" })
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "My clubs" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
