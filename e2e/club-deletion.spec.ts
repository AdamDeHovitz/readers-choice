import { expect, test } from "@playwright/test";
import { logIn, users } from "./seed";

test("global super admin can confirm deletion of a club they have not joined", async ({
  page,
}) => {
  await logIn(page, users.alice);
  await page.goto("/browse");
  await page
    .getByRole("button", { name: "Delete Other Club", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", {
    name: "Delete Book Club",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await dialog
    .getByRole("textbox", { name: "Type Other Club to confirm" })
    .fill("Other");
  await expect(confirm).toBeDisabled();
  await dialog
    .getByRole("textbox", { name: "Type Other Club to confirm" })
    .fill("Other Club");
  await expect(confirm).toBeEnabled();
  await expect(dialog.getByText("All invite links")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete Other Club", exact: true })
    .click();
  await expect(dialog.getByRole("textbox")).toHaveValue("");
  await expect(confirm).toBeDisabled();
});

test("club admin cannot see global deletion controls", async ({ page }) => {
  await logIn(page, users.dave);
  await page.goto("/browse");
  await expect(
    page.getByRole("heading", { name: "Browse Book Clubs" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
});

test("signed-out visitor cannot see deletion controls", async ({ page }) => {
  await page.goto("/browse");
  await expect(
    page.getByRole("heading", { name: "Browse Book Clubs" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
});
