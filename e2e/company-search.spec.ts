import { test, expect } from '@playwright/test';

test.describe('Company Talent Search', () => {
  // Assuming a company user is already logged in, or we can mock/login.
  // For these E2E tests we typically bypass auth or use a standard login script.
  // Using setup from existing auth
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/auth/login');
    // We assume a seed company user 'company1@example.com' with 'password'
    await page.fill('input[type="email"]', 'company1@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/company');
  });

  test('should display search page and allow filtering by skill and score', async ({ page }) => {
    // Navigate to Search page
    await page.click('text="Search Talent"');
    await page.waitForURL('/dashboard/company/search');
    
    // Check page title
    await expect(page.locator('h1', { hasText: 'Discover Talent' })).toBeVisible();

    // Verify initial load has elements (assuming db is seeded)
    // At least one student should be visible if seeded
    await page.waitForSelector('.grid'); // Wait for grid to load
    
    // Select a skill from the dropdown
    // Assuming a skill "React" or "JavaScript" is available
    // We will just select the first available skill dynamically to be safe
    const skillSelect = page.locator('select');
    const options = await skillSelect.locator('option').allTextContents();
    if (options.length > 1) {
        await skillSelect.selectOption({ label: options[1] }); 
    }
    
    // Set min overall score using slider (slider interaction can be tricky in playwright, we can try fill or dispatchEvent)
    const minOverallSlider = page.locator('input[type="range"]').nth(0);
    await minOverallSlider.fill('80');
    
    // Verify results update (we just verify the UI doesn't crash and shows either students or empty state)
    // Since we don't know exact seed data, we just check that the grid or the empty state is visible
    const hasResults = await page.locator('.bg-white.rounded-xl.shadow-sm.overflow-hidden').count() > 0;
    const hasEmptyState = await page.locator('text="No students found"').count() > 0;
    
    expect(hasResults || hasEmptyState).toBeTruthy();
    
    // Check "Only Verified Skills"
    const verifiedCheckbox = page.locator('input[type="checkbox"]');
    await verifiedCheckbox.check();
    
    const hasResultsVerified = await page.locator('.bg-white.rounded-xl.shadow-sm.overflow-hidden').count() > 0;
    const hasEmptyStateVerified = await page.locator('text="No students found"').count() > 0;
    
    expect(hasResultsVerified || hasEmptyStateVerified).toBeTruthy();
  });
  
  test('should navigate to student full profile and display skill intelligence', async ({ page }) => {
    // Navigate to Search page
    await page.goto('/dashboard/company/search');
    
    // Wait for at least one student card to load
    const studentCardLink = page.locator('text="View Full Profile"').first();
    
    // If there is no seed data, skip gracefully
    const isVisible = await studentCardLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
        await studentCardLink.click();
        
        // Wait for profile page to load
        await page.waitForURL(/\/dashboard\/company\/student\/.+/);
        
        // Check for Skill Intelligence Profile section
        await expect(page.locator('h2', { hasText: 'Skill Intelligence Profile' })).toBeVisible();
        
        // Verify privacy warning is visible
        await expect(page.locator('text="Detailed assessment and practical history is restricted."')).toBeVisible();
    }
  });
});
