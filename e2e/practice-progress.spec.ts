import { test, expect } from '@playwright/test';

test.describe('Practice Progress and Weak Topics', () => {
  const problemTitle = `Progress Test Problem ${Date.now()}`;
  const problemTopic = 'Weakness Test Topic';
  const expectedOutput = 'success';

  test('student progress is tracked and weak topics are identified', async ({ page }) => {
    // 1. Log in as Admin to create a problem
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin');

    await page.goto('/dashboard/admin/practice/create');
    await page.waitForSelector('select', { state: 'attached' });
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder="Problem Title"]', problemTitle);
    await page.fill('input[placeholder="e.g. Arrays, Functions, Joins"]', problemTopic);
    await page.fill('textarea[placeholder="Describe the problem clearly..."]', 'Test problem.');
    await page.fill('input[placeholder="e.g. 1 <= nums.length <= 10^4"]', 'No constraints');
    await page.locator('text="Input"').locator('..').locator('input').first().fill('N/A');
    await page.locator('text="Output"').locator('..').locator('input').first().fill(expectedOutput);
    await page.fill('input[placeholder="String that must be present in a correct answer"]', expectedOutput);
    await page.click('button:has-text("Create Problem")');
    await page.waitForURL('/dashboard/admin/practice');

    // 2. Log in as Student
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/student');

    // 3. Go to Coding Practice and find the problem
    await page.goto('/dashboard/student/practice');
    const row = page.locator('tr', { hasText: problemTitle });
    await expect(row).toBeVisible();
    await row.locator('text="Solve"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\/.+/);

    // 4. Fail the problem 3 times to trigger the weak topic rule (>=3 attempts, <60% success)
    for (let i = 0; i < 3; i++) {
      await page.fill('textarea[placeholder="// Write your solution here..."]', 'wrong');
      await page.click('button:has-text("Submit Solution")');
      await expect(page.locator('text="Failed. Your solution did not produce the expected output."')).toBeVisible();
      // small delay to let state settle
      await page.waitForTimeout(500); 
    }

    // 5. Navigate back to Practice Dashboard
    await page.goto('/dashboard/student/practice');

    // 6. Verify "Needs Practice" shows our topic
    await expect(page.locator(`text="${problemTopic}"`).first()).toBeVisible();
    await expect(page.locator('text="0%"')).toBeVisible();

    // 7. Verify "Overall Practice" (we attempted it, but haven't solved it)
    // The dashboard says "Problems Attempted" and "Problems Solved"
    // Since there might be other seeded data, we just verify the exact weak topic exists.

    // 8. Go back and solve it
    await page.goto('/dashboard/student/practice');
    await row.locator('text="Solve"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\/.+/);

    await page.fill('textarea[placeholder="// Write your solution here..."]', expectedOutput);
    await page.click('button:has-text("Submit Solution")');
    await expect(page.locator('text="Success! Your solution passed all test cases."')).toBeVisible();

    // 9. Go back and check progress again
    await page.goto('/dashboard/student/practice');
    
    // Now success rate is 1/4 = 25%, still weak, so it should still be in Needs Practice but with 25%
    await expect(page.locator(`text="${problemTopic}"`).first()).toBeVisible();
    await expect(page.locator('text="25%"')).toBeVisible();

    // The problem should now show "Solved" in the table
    await expect(row.locator('text="Solved"')).toBeVisible();
  });
});
