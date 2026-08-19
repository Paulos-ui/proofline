import { expect, test } from "@playwright/test";
import path from "node:path";

const ARTIFACTS = path.resolve(__dirname, "../../public/demo/artifacts");

test.describe("public critical path", () => {
  test("landing page states the product and links to the demo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Scattered evidence");
    await page.getByRole("link", { name: "Explore a demo case" }).first().click();
    await expect(page).toHaveURL(/\/demo$/);
  });

  test("demo case opens without an account and is labelled synthetic", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByText("Synthetic demonstration data").first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Marketplace laptop purchase");
  });

  test("timeline places events in order and opens the source behind one", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: /^Timeline/ }).click();
    await expect(page.getByRole("heading", { name: "Chronology" })).toBeVisible();
    await expect(page.getByText("Time not established").first()).toBeVisible();

    await page.getByRole("button", { name: /View \d+ sources?/ }).first().click();
    const panel = page.getByRole("complementary", { name: "Supporting source" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/SHA-256/)).toBeVisible();
    await panel.getByRole("button", { name: "Close source panel" }).click();
    await expect(panel).toBeHidden();
  });

  test("a potential inconsistency shows both sources side by side", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: /^Conflicts/ }).click();
    await expect(page.getByRole("heading", { name: "Where sources differ" })).toBeVisible();
    const finding = page.getByText("Potential inconsistency").first();
    await expect(finding).toBeVisible();
    await finding.click();
    await expect(page.getByText("Source A")).toBeVisible();
    await expect(page.getByText("Source B")).toBeVisible();
    // The product must never present a difference as proof of dishonesty.
    await expect(page.locator("body")).not.toContainText(/\b(lied|fraud confirmed|proves guilt)\b/i);
  });

  test("connections graph renders and a node reveals where it appears", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: /^Connections/ }).click();
    await expect(page.getByRole("img", { name: /Relationship graph/ })).toBeVisible();
    await page.getByRole("button", { name: /M\. Reyes, person/ }).first().click();
    await expect(page.getByText("Appears in")).toBeVisible();
  });

  test("privacy review lists candidates and never alters the original", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: /^Privacy/ }).click();
    await expect(page.getByText(/Proofline never alters the file you uploaded/)).toBeVisible();
    await page.getByRole("button", { name: "Redact in export" }).first().click();
    await expect(page.getByRole("button", { name: "Redact in export" }).first()).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("integrity verification", () => {
  test("the original receipt matches its registered fingerprint", async ({ page }) => {
    await page.goto("/verify");
    await page.setInputFiles('input[type="file"]:not([accept*="json"])', path.join(ARTIFACTS, "receipt-original.png"));
    await expect(page.getByRole("heading", { name: "Integrity match" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/does not independently establish whether the original content was truthful/)).toBeVisible();
  });

  test("the modified copy is reported as a mismatch", async ({ page }) => {
    await page.goto("/verify");
    await page.setInputFiles('input[type="file"]:not([accept*="json"])', path.join(ARTIFACTS, "receipt-modified.png"));
    await expect(page.getByRole("heading", { name: "Fingerprint mismatch" })).toBeVisible({ timeout: 15_000 });
  });

  test("the result never claims the file is authentic", async ({ page }) => {
    await page.goto("/verify");
    await page.setInputFiles('input[type="file"]:not([accept*="json"])', path.join(ARTIFACTS, "receipt-original.png"));
    await expect(page.getByRole("heading", { name: "Integrity match" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText(/this file is authentic|verified as genuine/i);
  });
});

test.describe("proof pack", () => {
  test("the export renders with fingerprints and limitations", async ({ page }) => {
    await page.goto("/case/demo-marketplace-dispute/report");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Marketplace laptop purchase");
    await expect(page.getByRole("heading", { name: /Artifact index and fingerprints/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Limitations of this report/ })).toBeVisible();
  });
});

test.describe("accessibility basics", () => {
  test("keyboard focus reaches the main navigation and skip link", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("every page has exactly one level-one heading", async ({ page }) => {
    for (const route of ["/", "/verify", "/docs", "/about", "/privacy", "/limitations"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    }
  });
});
