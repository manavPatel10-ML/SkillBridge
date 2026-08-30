import { test, expect } from '@playwright/test';

test.describe('Personalized Recommendations', () => {
  const weakTopic = 'Recommendation Topic ' + Date.now();
  const problemTitleBeg = `Rec Prob Beginner ${Date.now()}`;
  const problemTitleInt = `Rec Prob Intermediate ${Date.now()}`;

  test('dynamically adjusts recommendations based on practice performance', async ({ page }) => {
    test.slow();

    // 1. Admin setup: Create a Beginner and Intermediate problem in the same topic
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin');

    // Create Beginner
    await page.goto('/dashboard/admin/practice/create');
    await page.waitForSelector('select', { state: 'attached' });
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder="Problem Title"]', problemTitleBeg);
    await page.fill('input[placeholder="e.g. Arrays, Functions, Joins"]', weakTopic);
    await page.selectOption('select:has-text("Beginner")', { value: 'beginner' });
    await page.fill('textarea[placeholder="Describe the problem clearly..."]', 'Test.');
    await page.fill('input[placeholder="e.g. 1 <= nums.length <= 10^4"]', 'None');
    await page.locator('text="Input"').locator('..').locator('input').first().fill('N/A');
    await page.locator('text="Output"').locator('..').locator('input').first().fill('success');
    await page.fill('input[placeholder="String that must be present in a correct answer"]', 'success');
    await page.click('button:has-text("Create Problem")');
    await page.waitForURL('/dashboard/admin/practice');

    // Create Intermediate
    await page.goto('/dashboard/admin/practice/create');
    await page.waitForSelector('select', { state: 'attached' });
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder="Problem Title"]', problemTitleInt);
    await page.fill('input[placeholder="e.g. Arrays, Functions, Joins"]', weakTopic);
    // There might be multiple selects, so better use nth
    const selects = page.locator('select');
    await selects.nth(1).selectOption({ value: 'intermediate' }); // the difficulty select
    await page.fill('textarea[placeholder="Describe the problem clearly..."]', 'Test.');
    await page.fill('input[placeholder="e.g. 1 <= nums.length <= 10^4"]', 'None');
    await page.locator('text="Input"').locator('..').locator('input').first().fill('N/A');
    await page.locator('text="Output"').locator('..').locator('input').first().fill('success');
    await page.fill('input[placeholder="String that must be present in a correct answer"]', 'success');
    await page.click('button:has-text("Create Problem")');
    await page.waitForURL('/dashboard/admin/practice');

    // 2. Log in as Student
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/student');

    // 3. Go to Practice Dashboard
    await page.goto('/dashboard/student/practice');

    // Currently no weak topics, should see "Keep Improving"
    await expect(page.locator('text="Keep Improving"')).toBeVisible();

    // 4. Fail the beginner problem 3 times to make it a weak topic
    const row = page.locator('tr', { hasText: problemTitleBeg });
    await row.locator('text="Solve"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\/.+/);

    for (let i = 0; i < 3; i++) {
      await page.fill('textarea[placeholder="// Write your solution here..."]', 'wrong');
      await page.click('button:has-text("Submit Solution")');
      await expect(page.locator('text="Failed. Your solution did not produce the expected output."')).toBeVisible();
      await page.waitForTimeout(500); 
    }

    // 5. Check Recommendations: Should see "Recommended for You" with Beginner problem
    await page.goto('/dashboard/student/practice');
    await expect(page.locator('text="Recommended for You"')).toBeVisible();
    await expect(page.locator(`text="Because you need more practice in ${weakTopic}:"`)).toBeVisible();
    
    const recommendationsSection = page.locator('text="Recommended for You"').locator('..');
    await expect(recommendationsSection.locator(`text="${problemTitleBeg}"`)).toBeVisible();

    // 6. Solve the Beginner problem
    await recommendationsSection.locator(`text="${problemTitleBeg}"`).click();
    await page.waitForURL(/\/dashboard\/student\/practice\/.+/);
    await page.fill('textarea[placeholder="// Write your solution here..."]', 'success');
    await page.click('button:has-text("Submit Solution")');
    await expect(page.locator('text="Success! Your solution passed all test cases."')).toBeVisible();

    // 7. Check Recommendations: Beginner is solved, so it should progress to Intermediate!
    await page.goto('/dashboard/student/practice');
    
    // Topic is still weak (1/4 = 25% success rate)
    await expect(page.locator('text="Recommended for You"')).toBeVisible();
    await expect(page.locator(`text="Because you need more practice in ${weakTopic}:"`)).toBeVisible();
    
    // Intermediate problem should now be the recommended one
    const newRecommendationsSection = page.locator('text="Recommended for You"').locator('..');
    await expect(newRecommendationsSection.locator(`text="${problemTitleInt}"`)).toBeVisible();
    await expect(newRecommendationsSection.locator(`text="${problemTitleBeg}"`)).not.toBeVisible();
  });
});
