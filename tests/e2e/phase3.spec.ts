import { expect, test } from "@playwright/test";
import { adminEmail, at, expectToast, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

const applicant = at("student4");
const materialTitle = `E2E listening drill ${Date.now()}`;

test("a student applies to teach and a manager approves", async ({ browser }) => {
  const student = await signIn(browser, applicant);
  await student.goto("/apply");
  await student.getByLabel("Headline").fill("Conversation coach for beginners");
  await student.getByLabel("Spanish").check();
  await student
    .getByLabel("About you")
    .fill("I help beginners speak from day one with short, friendly conversation drills.");
  await student.getByLabel("Where you live").fill("Lima, Peru");
  await student.getByRole("button", { name: "Send application" }).click();
  await expect(student.getByText(/waiting|review/i).first()).toBeVisible();

  const manager = await signIn(browser, at("manager"));
  await manager.goto("/manager/applications");
  const card = manager.locator("div", { hasText: "Conversation coach for beginners" }).last();
  await expect(card).toBeVisible();
  await manager.getByRole("button", { name: "Approve" }).first().click();
  await expectToast(manager, /approved|teacher/i);

  // The account is now a teacher account.
  const teacher = await signIn(browser, applicant);
  await teacher.goto("/teacher");
  await expect(teacher.getByText("Earned this month")).toBeVisible();
});

test("a global material is reviewed before students see it", async ({ browser }) => {
  const teacher = await signIn(browser, at("teacher"));
  await teacher.goto("/teacher/materials/new");
  await teacher.getByLabel("Who can see it").click();
  await teacher.getByRole("option", { name: /Academy library/ }).click();
  await teacher.getByLabel("Title").fill(materialTitle);
  await teacher.getByLabel("Description").fill("Short listening drill with airport announcements.");
  await teacher.getByRole("button", { name: "Create and share" }).click();
  await expectToast(teacher, /sent to a manager/i);

  const student = await signIn(browser, at("student"));
  await student.goto("/materials");
  await expect(student.getByText(materialTitle)).toHaveCount(0);

  const manager = await signIn(browser, at("manager"));
  await manager.goto("/manager/materials");
  const item = manager.getByTestId("moderation-item").filter({ hasText: materialTitle });
  await item.getByRole("button", { name: "Approve" }).click();
  await expectToast(manager, /Approved/);

  await student.reload();
  await expect(student.getByText(materialTitle)).toBeVisible();
});

test("a student rates a finished class", async ({ browser }) => {
  const student = await signIn(browser, at("student"));
  await student.goto("/classes/demo-class-0901");
  await expect(student.getByText(/Rate this class|Your rating/).first()).toBeVisible();
  await student.locator("label", { hasText: "4 Stars" }).click();
  await student.getByLabel("Comment (optional)").fill("Clear and fun.");
  await student.getByRole("button", { name: /Send rating|Update rating/ }).click();
  await expect(student.getByText("Your rating").first()).toBeVisible();
});

test("teacher earnings go through a payout: prepared, approved, paid", async ({ browser }) => {
  const manager = await signIn(browser, at("manager"));
  await manager.goto("/manager/payouts");
  // The page defaults to last month; the seed delivered classes then.
  await expect(manager.getByText(/Unpaid up to the end of the month: \$[1-9]/)).toBeVisible();
  const send = manager.getByRole("button", { name: "Send for approval" });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(manager.getByText("Awaiting approval").first()).toBeVisible();

  const admin = await signIn(browser, adminEmail);
  await admin.goto("/admin/finance/payouts");
  await admin.getByRole("button", { name: "Approve" }).first().click();
  await expect(admin.getByLabel("Transfer reference").first()).toBeVisible();
  await admin.getByLabel("Transfer reference").first().fill("E2E-TRANSFER-1");
  await admin.getByRole("button", { name: "Mark as paid" }).first().click();
  await expect(admin.getByText("Reference: E2E-TRANSFER-1")).toBeVisible();

  const teacher = await signIn(browser, at("teacher"));
  await teacher.goto("/teacher/earnings");
  await expect(teacher.getByText(/Paid/).first()).toBeVisible();
});

test("only the admin edits teacher rates", async ({ browser }) => {
  const admin = await signIn(browser, adminEmail);
  await admin.goto("/admin/commerce/teacher-rates");
  await expect(admin.getByRole("button", { name: /Save/ })).toBeVisible();

  const manager = await signIn(browser, at("manager"));
  await manager.goto("/admin/commerce/teacher-rates");
  await expect(manager).not.toHaveURL(/teacher-rates$/);
});
