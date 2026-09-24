import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const outputDirectory = resolve("public/screenshots");

async function main() {
  await mkdir(outputDirectory, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 1440, height: 1000 },
  });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByTestId("router-preview-panel").waitFor({ state: "visible" });
    await page.screenshot({
      path: resolve(outputDirectory, "dashboard.png"),
      fullPage: false,
    });

    await page.getByRole("button", { name: /Higher Education/ }).click();
    await page.getByText("Illustrative university pilot", { exact: true }).waitFor({ state: "visible" });
    await page.screenshot({
      path: resolve(outputDirectory, "higher-education.png"),
      fullPage: false,
    });
  } finally {
    await browser.close();
  }
}

void main();
