import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function openDashboard(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run Eval" })).toBeEnabled();
}

async function setRangeValue(locator: Locator, value: string) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("dashboard loads with routing, eval, and savings surfaces", async ({ page }) => {
  await openDashboard(page);

  await expect(page.getByRole("heading", { name: "AI Model Router" })).toBeVisible();
  await expect(page.getByLabel("Prompt Case")).toBeVisible();
  await expect(page.getByTestId("model-comparison-panel")).toContainText("Model Comparison");
  await expect(page.getByTestId("router-preview-panel")).toContainText("Router Preview");
  await expect(page.getByTestId("savings-report-panel")).toContainText("Export JSON");
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
    "href",
    "/api/reports/savings?format=csv",
  );
});

test("router preview responds immediately to weight changes", async ({ page }) => {
  await openDashboard(page);

  const score = page.getByTestId("router-preview-score");
  const initialScore = await score.innerText();

  await setRangeValue(page.getByLabel("Quality Weight"), "1");
  await setRangeValue(page.getByLabel("Cost Weight"), "100");
  await setRangeValue(page.getByLabel("Latency Weight"), "1");
  await setRangeValue(page.getByLabel("Context Weight"), "1");

  await expect(page.getByLabel("Quality Weight")).toHaveValue("1");
  await expect(score).not.toHaveText(initialScore);
  await expect(page.getByTestId("recommended-preview")).not.toBeEmpty();
});

test("mock eval updates model comparison without requiring provider credits", async ({ page }) => {
  await openDashboard(page);

  await page.getByRole("button", { name: "Mock" }).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/eval-runs") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Run Eval" }).click(),
  ]);

  await expect(page.getByTestId("run-message")).toContainText(/Mock (eval saved|preview generated)/);
  await expect(page.getByTestId("model-comparison-panel").locator("tbody tr")).toHaveCount(6);
});

test("policy routing produces a saved decision or public preview", async ({ page }) => {
  await openDashboard(page);

  await page.getByRole("button", { name: "Route Request" }).click();

  await expect(page.getByTestId("policy-message")).toContainText(/Policy (decision saved|preview generated)/);
  await expect(page.getByTestId("saved-policy-decision-panel")).toContainText(/allow|block|downgrade|escalate/i);

  await page.getByLabel("Requester").selectOption({ index: 1 });
  await expect(page.getByTestId("unsaved-policy-banner")).toContainText("Controls changed after this decision");
});

test("live OpenAI mode is blocked when live mode is disabled", async ({ page }) => {
  await openDashboard(page);

  await page.getByRole("button", { name: "Live OpenAI" }).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/eval-runs") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Run Eval" }).click(),
  ]);

  await expect(page.getByTestId("run-message")).toContainText(
    "Live OpenAI mode is disabled for this deployment. Showing mock fallback.",
  );
});
