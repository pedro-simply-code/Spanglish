import { expect, test } from "@playwright/test";
import { adminEmail, at, signIn } from "./helpers";

test("each role lands on its own dashboard", async ({ browser }) => {
  const student = await signIn(browser, at("student"));
  await student.goto("/home");
  await expect(student).toHaveURL(/\/home$/);

  const teacher = await signIn(browser, at("teacher"));
  await teacher.goto("/teacher");
  await expect(teacher.getByText("Earned this month")).toBeVisible();

  const manager = await signIn(browser, at("manager"));
  await manager.goto("/manager");
  await expect(manager.getByText("Needs attention")).toBeVisible();

  const admin = await signIn(browser, adminEmail);
  await admin.goto("/admin");
  await expect(admin.getByText("Revenue (paid orders)")).toBeVisible();
});

test("students cannot open staff pages", async ({ browser }) => {
  const student = await signIn(browser, at("student2"));
  for (const path of ["/manager/payouts", "/manager/materials", "/admin/finance/payouts", "/teacher/earnings"]) {
    await student.goto(path);
    await expect(student).not.toHaveURL(new RegExp(`${path}$`));
  }
});
