import { expect, test } from "@playwright/test";

// Google's OAuth consent screen and the App Store link here, so it must load
// signed out and be reachable from the public pages.
test("the privacy policy is public and linked from home and login", async ({
  page,
}) => {
  for (const start of ["/", "/login"]) {
    await page.goto(start);
    await page.getByRole("link", { name: "Privacy policy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy policy" })
    ).toBeVisible();
  }
  await expect(
    page.getByRole("link", { name: "readerschoice@dehovitz.com" }).first()
  ).toHaveAttribute("href", "mailto:readerschoice@dehovitz.com");
});
