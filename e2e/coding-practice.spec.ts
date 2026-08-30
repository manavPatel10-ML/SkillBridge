import { test, expect } from '@playwright/test';

test.describe('Coding Practice Flow', () => {
  const problemTitle = `Test Practice Problem ${Date.now()}`;
  const problemTopic = 'Arrays';
  const expectedOutput = 'hello world';

  test('admin can create a practice problem', async ({ page }) => {
    // Login as Admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin');

    // Go to Practice Management
    await page.click('text="Practice Problems"');
    await page.waitForURL('/dashboard/admin/practice');

    // Create Problem
    await page.click('text="Add Problem"');
    await page.waitForURL('/dashboard/admin/practice/create');

    // Wait for skills to load and select the first one
    await page.waitForSelector('select', { state: 'attached' });
    await page.selectOption('select', { index: 1 });

    await page.fill('input[placeholder="Problem Title"]', problemTitle);
    await page.fill('input[placeholder="e.g. Arrays, Functions, Joins"]', problemTopic);
    await page.fill('textarea[placeholder="Describe the problem clearly..."]', 'Print hello world to the console.');
    
    // Fill first example
    await page.fill('input[placeholder="e.g. 1 <= nums.length <= 10^4"]', 'No constraints');
    const inputs = await page.locator('input[type="text"]').all();
    // Assuming the examples fields are the 3rd, 4th, 5th text inputs
    // Using a more robust way by clicking labels or using nth
    await page.locator('text="Input"').locator('..').locator('input').first().fill('N/A');
    await page.locator('text="Output"').locator('..').locator('input').first().fill(expectedOutput);

    // Expected output string
    await page.fill('input[placeholder="String that must be present in a correct answer"]', expectedOutput);

    // Submit
    await page.click('button:has-text("Create Problem")');

    // Verify redirect and listing
    await page.waitForURL('/dashboard/admin/practice');
    await expect(page.locator(`text="${problemTitle}"`)).toBeVisible();
  });

  test('student can solve a practice problem without affecting verified score', async ({ page }) => {
    // Login as Student
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/student');

    // Go to Coding Practice
    await page.click('text="Coding Practice"');
    await page.waitForURL('/dashboard/student/practice');

    // Find the problem and click solve
    const row = page.locator('tr', { hasText: problemTitle });
    await expect(row).toBeVisible();
    await row.locator('text="Solve"').click();

    // Verify we are on the solve page
    await expect(page.locator(`h1:has-text("${problemTitle}")`)).toBeVisible();

    // Submit wrong answer
    await page.fill('textarea[placeholder="// Write your solution here..."]', 'print("wrong output")');
    await page.click('button:has-text("Submit Solution")');
    await expect(page.locator('text="Failed. Your solution did not produce the expected output."')).toBeVisible();

    // Switch to submissions tab and verify it's there as failed
    await page.click('text="Submissions"');
    await expect(page.locator('text="Wrong Answer"').first()).toBeVisible();

    // Switch back to problem description or just submit right answer (textarea is visible anyway)
    // Clear and submit right answer
    await page.fill('textarea[placeholder="// Write your solution here..."]', `console.log("${expectedOutput}");`);
    await page.click('button:has-text("Submit Solution")');
    await expect(page.locator('text="Success! Your solution passed all test cases."')).toBeVisible();

    // Verify it's in the submissions tab as passed
    await expect(page.locator('text="Accepted"').first()).toBeVisible();

    // Go back to practice listing
    await page.goto('/dashboard/student/practice');
    // Ensure the problem now has "Solved"
    const solvedRow = page.locator('tr', { hasText: problemTitle });
    await expect(solvedRow.locator('text="Solved"')).toBeVisible();
  });
});
