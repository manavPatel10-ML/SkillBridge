import { test, expect } from '@playwright/test';

test.describe.serial('Phase 9 Audit - Technical Growth Hub', () => {

  const timestamp = Date.now();
  const skillName = `P9 Skill ${timestamp}`;
  let skillId = '';

  const problemTitlePrefix = `P9 Prob ${timestamp} - `;
  
  const assessmentTitle = `P9 Assessment ${timestamp}`;
  let assessmentId = '';

  const companyChallengeTitle = `P9 Challenge ${timestamp}`;

  test('1. Admin setup: Create Skill, Problems, Assessment, and Company Challenge', async ({ page }) => {
    test.slow();
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin');

    // Create a new skill
    await page.goto('/dashboard/admin/skills/create');
    await page.fill('input[name="name"]', skillName);
    await page.fill('textarea[name="description"]', 'Audit skill');
    await page.fill('input[name="category"]', 'Software Engineering');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin/skills');

    const skillLink = page.locator('a', { hasText: skillName }).first();
    const href = await skillLink.getAttribute('href');
    skillId = href?.split('/').pop() || '';
    expect(skillId).toBeTruthy();

    // Create an assessment for this skill
    await page.goto('/dashboard/admin/assessments/create');
    await page.fill('input[name="title"]', assessmentTitle);
    await page.fill('input[name="description"]', 'Test assessment');
    await page.selectOption('select[name="skillId"]', skillId);
    await page.fill('input[name="passingScore"]', '70');
    await page.fill('input[name="timeLimit"]', '30');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin/assessments');

    const assessmentLink = page.locator('a', { hasText: assessmentTitle }).first();
    const aHref = await assessmentLink.getAttribute('href');
    assessmentId = aHref?.split('/').pop() || '';
    expect(assessmentId).toBeTruthy();

    // Add 1 question to the assessment
    await page.goto(`/dashboard/admin/assessments/${assessmentId}/questions/add`);
    await page.fill('textarea[name="question"]', '1 + 1?');
    await page.fill('input[name="option0"]', '2');
    await page.fill('input[name="option1"]', '3');
    await page.fill('input[name="option2"]', '4');
    await page.fill('input[name="option3"]', '5');
    await page.selectOption('select[name="correctAnswer"]', '2');
    await page.fill('input[name="points"]', '10');
    await page.fill('textarea[name="explanation"]', 'Math');
    await page.click('button[type="submit"]');
    await page.waitForURL(`/dashboard/admin/assessments/${assessmentId}`);

    // Add 6 practice problems for this skill (to allow testing 60%, 80%, 100%)
    for (let i = 1; i <= 6; i++) {
      await page.goto('/dashboard/admin/practice/create');
      await page.waitForSelector('select', { state: 'attached' });
      await page.selectOption('select', { value: skillId });
      await page.fill('input[placeholder="Problem Title"]', `${problemTitlePrefix}${i}`);
      await page.fill('input[placeholder="e.g. Arrays, Functions, Joins"]', 'Audit Topic');
      const selects = page.locator('select');
      await selects.nth(1).selectOption({ value: 'beginner' });
      await page.fill('textarea[placeholder="Describe the problem clearly..."]', `Problem ${i}`);
      await page.fill('input[placeholder="e.g. 1 <= nums.length <= 10^4"]', 'None');
      await page.locator('text="Input"').locator('..').locator('input').first().fill('N/A');
      await page.locator('text="Output"').locator('..').locator('input').first().fill('success');
      await page.fill('input[placeholder="String that must be present in a correct answer"]', 'success');
      await page.click('button:has-text("Create Problem")');
      await page.waitForURL('/dashboard/admin/practice');
    }

    // Create a Company Challenge that requires this skill
    await page.goto('/dashboard/admin/challenges/create');
    await page.fill('input[name="title"]', companyChallengeTitle);
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.fill('textarea[name="description"]', 'Challenge Description');
    await page.fill('input[name="estimatedHours"]', '5');
    await page.fill('input[name="reward"]', '100');
    // We need to wait for the multiselect to render options
    await page.waitForSelector(`option[value="${skillId}"]`, { state: 'attached' });
    await page.selectOption('select[multiple]', [skillId]);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/admin/challenges');
  });

  test('2. Practice to Assessment CTA logic', async ({ page }) => {
    test.slow();
    // Use a fresh student for clean practice stats
    await page.goto('/auth/register');
    const freshStudentEmail = `student${timestamp}@example.com`;
    await page.fill('input[placeholder="John Doe"]', 'Fresh Student');
    await page.fill('input[placeholder="you@example.com"]', freshStudentEmail);
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('/dashboard/student');

    // Go to practice
    await page.goto('/dashboard/student/practice');

    const expectedCtaText = `You have an excellent success rate in ${skillName}. Ready to get verified?`;

    // Solve problems 1-4 successfully
    for (let i = 1; i <= 4; i++) {
      const row = page.locator('tr', { hasText: `${problemTitlePrefix}${i}` });
      await row.locator('text="Solve"').click();
      await page.waitForURL(/\/dashboard\/student\/practice\/.+/);
      await page.fill('textarea[placeholder="// Write your solution here..."]', 'success');
      await page.click('button:has-text("Submit Solution")');
      await expect(page.locator('text="Success! Your solution passed all test cases."')).toBeVisible();
      await page.goto('/dashboard/student/practice');
    }

    // A. 4 solved (attempted: 4, solved: 4, successRate: 100%) -> CTA hidden (needs >= 5)
    await expect(page.locator(`text="${expectedCtaText}"`)).not.toBeVisible();

    // Now fail problem 5
    const row5 = page.locator('tr', { hasText: `${problemTitlePrefix}5` });
    await row5.locator('text="Solve"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\/.+/);
    await page.fill('textarea[placeholder="// Write your solution here..."]', 'wrong');
    await page.click('button:has-text("Submit Solution")');
    await expect(page.locator('text="Failed. Your solution did not produce the expected output."')).toBeVisible();

    // Navigate back to practice
    await page.goto('/dashboard/student/practice');

    // C. 5 attempted, 4 correct (successRate: 80%) -> CTA SHOULD appear
    await expect(page.locator(`text="${expectedCtaText}"`)).toBeVisible();

    // Now fail problem 6
    const row6 = page.locator('tr', { hasText: `${problemTitlePrefix}6` });
    await row6.locator('text="Solve"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\/.+/);
    await page.fill('textarea[placeholder="// Write your solution here..."]', 'wrong');
    await page.click('button:has-text("Submit Solution")');
    await expect(page.locator('text="Failed. Your solution did not produce the expected output."')).toBeVisible();

    // Navigate back to practice
    await page.goto('/dashboard/student/practice');

    // B. 6 attempted, 4 correct (successRate: 66.6%) -> CTA hidden
    await expect(page.locator(`text="${expectedCtaText}"`)).not.toBeVisible();

    // Solve problem 5 and 6 to get back up
    for (let i = 5; i <= 6; i++) {
      const row = page.locator('tr', { hasText: `${problemTitlePrefix}${i}` });
      await row.locator('text="Solve"').click();
      await page.waitForURL(/\/dashboard\/student\/practice\/.+/);
      await page.fill('textarea[placeholder="// Write your solution here..."]', 'success');
      await page.click('button:has-text("Submit Solution")');
      await expect(page.locator('text="Success! Your solution passed all test cases."')).toBeVisible();
      await page.goto('/dashboard/student/practice');
    }

    // D. 6 attempted, 6 correct (successRate: 100%) -> CTA SHOULD appear
    await expect(page.locator(`text="${expectedCtaText}"`)).toBeVisible();

    // Refresh Persistence Test
    await page.reload();
    await expect(page.locator(`text="${expectedCtaText}"`)).toBeVisible();
  });

  test('3. Assessment to Practice CTA and Navigation', async ({ page }) => {
    test.slow();
    // Login as the student from test 2
    const freshStudentEmail = `student${timestamp}@example.com`;
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', freshStudentEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/student');

    // Go to Assessments
    await page.goto('/dashboard/student/assessments');
    const assessmentCard = page.locator('h3', { hasText: assessmentTitle }).locator('..').locator('..');
    await assessmentCard.locator('text="View Details"').click();
    
    // Start assessment
    await page.locator('button:has-text("Start Assessment")').click();
    await page.waitForURL(/\/dashboard\/student\/assessments\/.+\/take/);

    // Fail the assessment on purpose
    await page.locator('div', { hasText: '3' }).nth(1).click(); // incorrect answer
    await page.locator('button:has-text("Submit Assessment")').click();
    await page.waitForURL(/\/dashboard\/student\/assessments\/.+\/result\/.+/);

    // Verify "Practice to Improve" CTA appears
    await expect(page.locator('text="Practice to Improve"')).toBeVisible();
    
    // Verify it links to practice page with the skill pre-selected (via search or param)
    await page.locator('text="Practice to Improve"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\?skillId=/);
    
    // Check that we're on the practice page and it's somewhat filtered or we are there.
    await expect(page.locator('h1:has-text("Coding Practice")')).toBeVisible();
  });

  test('4. Skills Navigation Links & Company Challenge Badge', async ({ page }) => {
    test.slow();
    const freshStudentEmail = `student${timestamp}@example.com`;
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', freshStudentEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/student');

    // Add the skill to the student's profile via manual adding
    await page.goto('/dashboard/student/skills');
    await page.locator('text="Discover & Add Skills"').click();
    const skillCard = page.locator('h3', { hasText: skillName }).locator('..');
    await skillCard.locator('button:has-text("Add to My Skills")').click();
    
    // Now verify the navigation links from My Skills
    await page.goto('/dashboard/student/skills');
    const mySkillSection = page.locator('h2', { hasText: skillName }).locator('..');
    
    // Verify links exist
    await expect(mySkillSection.locator('text="Learning Resources"')).toBeVisible();
    await expect(mySkillSection.locator('text="Coding Practice"')).toBeVisible();

    // Click Coding Practice
    await mySkillSection.locator('text="Coding Practice"').click();
    await page.waitForURL(/\/dashboard\/student\/practice\?search=/);
    
    // Should populate the search with the skill name
    await expect(page.locator(`input[value="${skillName}"]`)).toBeVisible();

    // Verify Company Challenge Badge (should NOT be visible since skill is NOT verified yet)
    await page.goto('/dashboard/student/company-challenges');
    const challengeCard = page.locator('h3', { hasText: companyChallengeTitle }).locator('..').locator('..');
    await expect(challengeCard.locator('text="Matches Profile"')).not.toBeVisible();

    // We can't easily verify the skill without a full admin assessment evaluation flow,
    // so we rely on manual tests for the verified state, or test using the student@example.com (Python isVerified)
  });
});
