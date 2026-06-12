import { expect, test } from "@playwright/test";
import path from "node:path";

const DATA_DIR = path.resolve(__dirname, "../../data");

test("upload both CSVs in separate slots, dashboard and drill-down update", async ({
  page,
}) => {
  await page.goto("/upload");
  await page
    .locator('input[name="poFile"]')
    .setInputFiles(path.join(DATA_DIR, "PO.csv"));
  await page
    .locator('input[name="prGrFile"]')
    .setInputFiles(path.join(DATA_DIR, "PR TO GR.csv"));
  await page.getByRole("button", { name: /upload & recalculate/i }).click();

  await expect(
    page.getByText(/Upload processed and KPIs recalculated/i),
  ).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/PO export/).first()).toBeVisible();
  await expect(page.getByText(/PR TO GR export/).first()).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("TOTAL CAPAI KPI")).toBeVisible();
  await expect(page.getByText(/Realisasi PO to BPB \(Local\)/)).toBeVisible();
  // padded months: full Jan–Dec for the active year
  await expect(
    page.getByRole("columnheader", { name: "Dec 26" }),
  ).toBeVisible();

  await page.goto("/kpi/2?month=2026-01");
  await expect(page.getByText(/underlying row/)).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();

  await page.goto("/uploads");
  await expect(page.getByText("PO.csv").first()).toBeVisible();
});

test("merged data page: per-column filters, date pickers, sort, pagination", async ({
  page,
}) => {
  await page.goto("/data");
  await expect(page.getByText(/Merged data/)).toBeVisible();
  await expect(page.getByText(/row\(s\)/)).toBeVisible();

  // per-column text filter
  await page.locator('input[name="vendor"]').fill("SHOPEE");
  // date-range filter via date picker inputs
  await page.locator('input[name="poDateFrom"]').fill("2026-01-01");
  await page.locator('input[name="poDateTo"]').fill("2026-03-31");
  await page.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(/vendor=SHOPEE/);
  await expect(page).toHaveURL(/poDateFrom=2026-01-01/);
  await expect(page.getByText("SHOPEE").first()).toBeVisible();
  await expect(page.getByText(/filter\(s\) active/)).toBeVisible();

  // realisasi select filter
  await page.locator('select[name="realisasi"]').selectOption("late");
  await page.getByRole("button", { name: /apply filters/i }).click();
  await expect(page.getByText("Late").first()).toBeVisible();

  // sort by unit price desc
  await page.goto("/data");
  await page.getByRole("link", { name: /Unit Price/ }).click();
  await expect(page).toHaveURL(/sort=unitPrice/);

  // per-column clear link
  await page.goto("/data?vendor=SHOPEE");
  await page.getByRole("link", { name: /✕ clear/ }).click();
  await expect(page).not.toHaveURL(/vendor=/);

  // page size selector
  await page.goto("/data");
  await page.getByRole("link", { name: "100", exact: true }).click();
  await expect(page).toHaveURL(/pageSize=100/);

  // pagination
  await page.goto("/data");
  await page.getByRole("link", { name: "Next →" }).click();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
});

test("dashboard recalculate button recomputes without uploading", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /recalculate kpis/i }).click();
  await expect(page.getByText(/KPIs recalculated/)).toBeVisible({
    timeout: 60_000,
  });
});

test("uploading only one file works (partial monthly data)", async ({
  page,
}) => {
  await page.goto("/upload");
  await page
    .locator('input[name="prGrFile"]')
    .setInputFiles(path.join(DATA_DIR, "PR TO GR.csv"));
  await page.getByRole("button", { name: /upload & recalculate/i }).click();
  await expect(
    page.getByText(/Upload processed and KPIs recalculated/i),
  ).toBeVisible({ timeout: 90_000 });
});

test("wrong file in the PO slot is rejected with a clear message", async ({
  page,
}) => {
  await page.goto("/upload");
  await page
    .locator('input[name="poFile"]')
    .setInputFiles(path.join(DATA_DIR, "PR TO GR.csv"));
  await page.getByRole("button", { name: /upload & recalculate/i }).click();
  await expect(page.getByText(/Upload failed — no rows imported/i)).toBeVisible(
    { timeout: 60_000 },
  );
  await page.getByText(/validation error/i).click(); // expand details
  await expect(page.getByText(/please swap the files/i)).toBeVisible();
});
