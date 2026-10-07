import type { Page } from "@playwright/test";

/** Mirrors supabase/seed.sql. Every seeded user's password is "password123". */
export const SEED_PASSWORD = "password123";

export const users = {
  alice: "alice@example.test", // Seed Club admin
  bob: "bob@example.test", // Seed Club member
  carol: "carol@example.test", // Seed Club member
  dave: "dave@example.test", // Other Club admin, not in Seed Club
} as const;

export const meetings = {
  finalized: "44444444-0000-4000-8000-000000000001",
  votingClosed: "44444444-0000-4000-8000-000000000002",
  votingOpen: "44444444-0000-4000-8000-000000000003",
  nominating: "44444444-0000-4000-8000-000000000004",
  otherClub: "44444444-0000-4000-8000-000000000005",
} as const;

export async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Email & Password" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/dashboard");
}
