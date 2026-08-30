import { test, expect } from '@playwright/test';

test.describe('Authentication Workflow', () => {
  const timestamp = Date.now();
  const email = `test.student.${timestamp}@example.com`;
  const password = 'Password123!';

  test('should register, complete onboarding, and redirect to student dashboard', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout
    // 1. Listen for console messages to debug Firebase errors
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    // 1. Go to register page
    await page.goto('/auth/register');
    
    // 2. Fill in registration form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();

    // 3. Wait for redirect to onboarding
    // 3. Wait for redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30000 });

    // 4. Select Student role
    await page.click('text=Student');

    // 5. Fill out student onboarding form
    await page.locator('label:has-text("Full Name") + input').fill('Test Student');
    await page.locator('label:has-text("College / University") + input').fill('MIT');
    await page.locator('label:has-text("Degree") + input').fill('B.S.');
    await page.locator('label:has-text("Branch") + input').fill('CS');
    await page.locator('label:has-text("Expected Graduation Year") + input').fill('2025');

    const setupButton = page.getByRole('button', { name: /complete setup/i });
    await setupButton.click();

    // 6. Wait for redirect to student dashboard
    const errorMsg = page.locator('.text-red-600');
    if (await errorMsg.count() > 0) {
      console.log('Error on page:', await errorMsg.textContent());
    }
    
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 30000 });

    // 7. Verify dashboard content
    await page.waitForTimeout(5000); // Give it some time just in case
    await page.screenshot({ path: 'test-screenshot.png' });
    await expect(page.locator('h1')).toContainText(/Welcome back/i, { timeout: 30000 });

    // 8. Logout
    await page.getByRole('button', { name: /Sign Out|Log Out/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 30000 });

    // 9. Login again
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForTimeout(5000); // Wait for login to process
    
    // Check for error on login page
    const loginError = page.locator('.text-red-600');
    if (await loginError.count() > 0) {
      console.log('Login Error:', await loginError.textContent());
    }

    // 10. Verify redirect to student dashboard (bypassing onboarding since role exists)
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 30000 });
  });
});
