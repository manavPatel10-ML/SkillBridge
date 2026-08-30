import { test, expect } from '@playwright/test';

test.describe('Practice Data Separation', () => {
  const problemTitle = `Separation Test Problem ${Date.now()}`;
  const problemTopic = 'Separation Topic';
  const expectedOutput = 'hello world';

  test('practice attempts do not modify verified skill scores', async ({ page }) => {
    // 1. Log in as Admin to create a problem
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin');

    await page.goto('/dashboard/admin/practice/create');
    await page.waitForSelector('select', { state: 'attached' });
    await page.selectOption('select', { index: 2 }); // pick a distinct skill
    await page.fill('input[placeholder="Problem Title"]', problemTitle);
    await page.fill('input[placeholder="e.g. Arrays, Functions, Joins"]', problemTopic);
    await page.fill('textarea[placeholder="Describe the problem clearly..."]', 'Test problem.');
    await page.fill('input[placeholder="e.g. 1 <= nums.length <= 10^4"]', 'No constraints');
    await page.locator('text="Input"').locator('..').locator('input').first().fill('N/A');
    await page.locator('text="Output"').locator('..').locator('input').first().fill(expectedOutput);
    await page.fill('input[placeholder="String that must be present in a correct answer"]', expectedOutput);
    await page.click('button:has-text("Create Problem")');
    await page.waitForURL('/dashboard/admin/practice');

    // 2. Log in as a fresh student (if we can, or just standard student)
    // For this test, we just use the standard student
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/student');

    // 3. Check current "My Skills" verified state
    await page.goto('/dashboard/student/skills');
    
    // We expect the student might have some skills or none.
    // Let's grab the HTML or text of the main container to compare before and after.
    const beforeSkillsText = await page.locator('main').innerText();

    // 4. Solve the practice problem
    await page.goto('/dashboard/student/practice');
    const row = page.locator('tr', { hasText: problemTitle });
    await expect(row).toBeVisible();
    await row.locator('text="Solve"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\/.+/);

    await page.fill('textarea[placeholder="// Write your solution here..."]', expectedOutput);
    await page.click('button:has-text("Submit Solution")');
    await expect(page.locator('text="Success! Your solution passed all test cases."')).toBeVisible();

    // 5. Check "My Skills" again
    await page.goto('/dashboard/student/skills');
    const afterSkillsText = await page.locator('main').innerText();

    // 6. Assert that solving the problem did not change their verified skills at all
    expect(afterSkillsText).toEqual(beforeSkillsText);
  });
});
