import { expect, type Browser, type Page } from "@playwright/test";

export const password = process.env.E2E_PASSWORD ?? "Spanglish1!";
export const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "manager2@spanglish.academy";
export const at = (local: string) => `${local}@spanglish.academy`;

/** Signs in through the login form in a fresh browser context. */
export async function signIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return page;
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}
