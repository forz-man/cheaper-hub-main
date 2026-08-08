import { test, expect } from "@playwright/test";
import { deleteUserIfExists, getVerificationLink } from "./helpers/auth-helper";

test.describe("Complete Vendor Sign-Up and Verification Flow", () => {
  const testEmail = "shamitarathinaraj@gmail.com";
  const testPassword = "@Shami2230";
  const testName = "shami test";

  test.beforeAll(async () => {
    console.log(`[E2E Setup] Cleaning up test user ${testEmail} if they exist...`);
    await deleteUserIfExists(testEmail);
  });

  test("should register a new vendor, fetch verification email, click link and enter dashboard", async ({ page }) => {
    // Step 1: Open the homepage
    console.log("[E2E Step 1] Navigating to homepage...");
    await page.goto("/");

    // Step 2: Click "Get started" in the navbar to open /select-role
    console.log("[E2E Step 2] Clicking 'Get started' in navbar...");
    const getStartedLink = page.locator('a:has-text("Get started")').first();
    await getStartedLink.waitFor({ state: "visible", timeout: 10000 });
    await getStartedLink.click();

    // Verify we landed on /select-role
    await expect(page).toHaveURL(/.*select-role.*/);

    // Select the "Vendor" card
    console.log("[E2E Step 2] Selecting 'Vendor' role...");
    const vendorCard = page.locator('button:has-text("Vendor")');
    await vendorCard.waitFor({ state: "visible" });
    await vendorCard.click();

    // Step 3: Fill in registration fields
    console.log("[E2E Step 3] Filling in the registration form...");
    await expect(page).toHaveURL(/.*register.*role=vendor/);

    await page.locator('input[placeholder="Full name"]').fill(testName);
    await page.locator('input[placeholder="Email address"]').fill(testEmail);
    
    // Fill password and confirm password fields
    await page.locator('input[placeholder="Password"]').fill(testPassword);
    await page.locator('input[placeholder="Confirm password"]').fill(testPassword);

    // Check the Terms & Conditions checkbox
    await page.locator('input[type="checkbox"]').check();

    // Click register button
    console.log("[E2E Step 3] Submitting the registration form...");
    await page.getByRole("button", { name: "Create Seller Account" }).click();

    // Step 4: Verify navigation to /verify-email
    console.log("[E2E Step 4] Verifying navigation to /verify-email...");
    await expect(page).toHaveURL(/.*verify-email.*/, { timeout: 15000 });
    await expect(page.locator('text=Check your inbox')).toBeVisible();

    // Step 5: Fetch the verification link from Supabase Auth Admin
    console.log("[E2E Step 5] Generating verification link from Supabase Auth Admin...");
    let verificationUrl;
    try {
      verificationUrl = await getVerificationLink(testEmail);
      console.log(`[E2E Step 5] Retrieved verification URL: ${verificationUrl}`);
    } catch (err) {
      console.error(
        "\n========================================================================\n" +
        "ERROR: Could not retrieve the verification link.\n" +
        "Make sure you have added SUPABASE_SERVICE_ROLE_KEY to your .env.local file.\n" +
        "========================================================================\n"
      );
      throw err;
    }

    // Step 6: Navigate to the retrieved confirmation link
    console.log("[E2E Step 6] Navigating to confirmation link...");
    await page.goto(verificationUrl);

    // Step 7: Verify that the auth callback succeeds and redirects to dashboard
    console.log("[E2E Step 7] Verifying landing on dashboard...");
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 20000 });
    console.log("[E2E Success] Successfully verified registration flow!");
  });
});
