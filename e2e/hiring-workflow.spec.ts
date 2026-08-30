import { test, expect } from '@playwright/test';

test.describe('E2E Hiring Workflow', () => {
  const timestamp = Date.now();
  const companyEmail = `company.${timestamp}@example.com`;
  const studentEmail = `student.${timestamp}@example.com`;
  const password = 'Password123!';
  let challengeId = '';

  test('Complete flow: Create challenge, Student applies, Company reviews', async ({ page }) => {
    // Capture all console logs and errors from the browser
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

    test.setTimeout(180000); // 3 minutes timeout

    page.on('console', msg => {
      if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
    });

    // ==========================================
    // A. COMPANY REGISTRATION & CHALLENGE CREATION
    // ==========================================
    await page.goto('/auth/register?role=company');
    await page.fill('input[type="email"]', companyEmail);
    await page.fill('input[type="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30000 });

    // Click company role if the selector is present
    // We use a locator with wait to handle the transition from spinner
    const companyRoleBtn = page.getByRole('button', { name: /Company/i });
    if (await companyRoleBtn.isVisible()) {
      await companyRoleBtn.click();
    }

    // Wait for the company name input to be visible (which ensures spinner is gone)
    await expect(page.locator('label:has-text("Company Name") + input')).toBeVisible({ timeout: 15000 });

    await page.locator('label:has-text("Company Name") + input').fill('Test Company Inc');
    await page.locator('label:has-text("Industry") + input').fill('Technology');
    await page.locator('label:has-text("Website") + input').fill('https://example.com');
    await page.locator('label:has-text("Contact Person") + input').fill('John Doe');
    await page.getByRole('button', { name: /complete setup/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/company/, { timeout: 30000 });

    // Seed data quickly by navigating to /seed
    await page.goto('/seed');
    // Ensure we are logged in, then click Run Seed
    const runSeedBtn = page.getByRole('button', { name: /Run Seed/i });
    if (await runSeedBtn.isVisible()) {
      await runSeedBtn.click();
      await expect(page.getByText(/Seed complete successfully/i)).toBeVisible({ timeout: 15000 });
    }

    // Go create challenge
    await page.goto('/dashboard/company/challenges/create');

    // STEP 1: Basic Info
    await page.locator('label:has-text("Challenge Title") + input').fill('E2E Software Engineer Challenge');
    await page.locator('label:has-text("Job Role") + input').fill('Software Engineer');
    await page.locator('label:has-text("Description") + textarea').fill('A test challenge for e2e testing');
    // For date, format is YYYY-MM-DD
    await page.locator('label:has-text("Application Deadline") + input').fill('2027-12-31');
    await page.locator('label:has-text("Maximum Applicants") + input').fill('10');
    // Check first skill by clicking its label (checkbox is visually hidden)
    await page.locator('label:has(input[type="checkbox"])').first().click();
    await page.getByRole('button', { name: /next step/i }).click();

    // STEP 2: Theory Config
    await page.locator('label:has-text("Enable Theory Section")').click();
    // Default values are usually empty, let's fill them
    await page.locator('label:has-text("Easy Questions") + input').fill('1');
    await page.locator('label:has-text("Medium Questions") + input').fill('0');
    await page.locator('label:has-text("Hard Questions") + input').fill('0');
    await page.locator('label:has-text("Time per Question") + input').fill('60');
    await page.locator('label:has-text("Passing Score") + input').fill('50');
    // Click the first skill in the grid
    await page.locator('text="Select Assessment Skills"').locator('..').locator('.grid label').first().click();
    await page.getByRole('button', { name: /next step/i }).click();

    // Check for errors
    const errorText = await page.locator('.bg-red-50').textContent({ timeout: 1000 }).catch(() => null);
    if (errorText) console.log("Validation Error:", errorText);

    // STEP 3: Practical Task
    await page.locator('label:has-text("Enable Practical Section")').click();
    await page.locator('label:has-text("Task Title") + input').fill('Build a Button');
    await page.locator('label:has-text("Instructions") + textarea').fill('Use React to build a button.');
    await page.locator('label:has-text("Duration (Minutes)") + input').fill('30');
    // Criteria defaults to two rows. Let's fill them.
    const criteriaInputs = page.locator('input[placeholder="Criterion description (e.g. Code Quality)"]');
    await criteriaInputs.nth(0).fill('Functionality');
    
    await page.getByRole('button', { name: /add criterion/i }).click();
    
    await criteriaInputs.nth(1).fill('Styling');
    const weightInputs = page.locator('input[type="number"]'); // since it doesn't have a label directly next to it
    // Wait, the weight input has no placeholder, but we can just find it by type=number inside the criteria row
    await weightInputs.nth(1).fill('50'); // index 0 is duration
    await weightInputs.nth(2).fill('50');
    await page.getByRole('button', { name: /next step/i }).click();

    // STEP 4: Technical Interview
    await page.locator('label:has-text("Enable Interview Section")').click();
    await page.locator('label:has-text("Question 1") + textarea').fill('What is a promise?');
    await page.getByRole('button', { name: /next step/i }).click();

    // STEP 5: Final Review
    await expect(page.getByText(/1 questions/i).first()).toBeVisible();

    // Save as Draft
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/company\/challenges/, { timeout: 30000 });

    // Verify it is in draft
    await expect(page.getByText(/E2E Software Engineer Challenge/i).first()).toBeVisible();
    await expect(page.getByText(/Draft/i)).toBeVisible();

    // Publish challenge directly from the list page
    await page.getByRole('button', { name: 'Publish' }).first().click();
    await expect(page.getByText(/Published/i)).toBeVisible();

    // Get Challenge ID from the view link
    const viewLink = await page.getByRole('link', { name: 'View Details' }).first().getAttribute('href');
    challengeId = viewLink?.split('/').pop() || '';
    expect(challengeId).not.toBe('');

    // Logout
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);

    // ==========================================
    // B. STUDENT REGISTRATION & APPLICATION
    // ==========================================
    await page.goto('/auth/register?role=student');
    await page.fill('input[type="email"]', studentEmail);
    await page.fill('input[type="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 30000 });

    // Click student role if the selector is present
    const studentRoleBtn = page.getByRole('button', { name: /Student/i, exact: true });
    if (await studentRoleBtn.isVisible()) {
      await studentRoleBtn.click();
    }

    await page.fill('input[name="fullName"]', 'Test Student');
    await page.fill('input[name="college"]', 'Test University');
    await page.fill('input[name="degree"]', 'B.Tech');
    await page.fill('input[name="branch"]', 'Computer Science');
    await page.fill('input[name="graduationYear"]', '2025');
    await page.getByRole('button', { name: /complete setup/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 30000 });

    // Go to company challenges
    await page.goto('/dashboard/student/company-challenges');
    await page.waitForTimeout(5000); // Wait for emulator indexing
    await expect(page.getByText(/E2E Software Engineer Challenge/i).first()).toBeVisible({ timeout: 15000 });

    // View Details and Apply
    await page.goto(`/dashboard/student/company-challenges/${challengeId}`);
    
    // Dump page content to console for debugging
    await page.waitForTimeout(3000); // wait for 3s to let react render
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log("PAGE CONTENT AT STUDENT CHALLENGE DETAILS:", pageText);

    await page.getByRole('button', { name: /apply now/i }).click();
    
    // Attempt Theory Stage
    await page.getByRole('link', { name: /start/i }).first().click();
    // Enter Fullscreen & Start
    await page.getByRole('button', { name: /enter fullscreen & start/i }).click();
    // Wait for Question 1 of
    await expect(page.getByText(/Question 1 of/i)).toBeVisible();
    // Select first option
    await page.locator('div.space-y-4 > button').first().click();
    // Setup dialog handler before clicking submit
    page.once('dialog', dialog => dialog.accept());
    // Submit Theory
    await page.getByRole('button', { name: /submit theory/i }).click();
    
    // Wait for result on dashboard
    await expect(page.getByText(/completed successfully/i).first()).toBeVisible();

    // Attempt Practical Stage (the first 'start' link now will be for Practical, since Theory has no Start link)
    await page.getByRole('link', { name: /start/i }).first().click();
    await expect(page.getByText(/instructions/i, { exact: false }).first()).toBeVisible();
    await page.fill('input#githubUrl', 'https://github.com/test/repo');
    await page.fill('input#liveUrl', 'https://test-repo.vercel.app');
    await page.getByRole('button', { name: /submit task/i }).click();
    
    // Wait for Practical to be marked completed successfully
    await expect(page.getByText(/completed successfully/i).nth(1)).toBeVisible();

    // Attempt Interview Stage
    await page.getByRole('link', { name: /start/i }).first().click();
    // Record answers
    await page.locator('textarea').first().waitFor({ state: 'visible' });
    const textareas = await page.locator('textarea').all();
    for (const textarea of textareas) {
      await textarea.fill('A promise is an object representing eventual completion.');
    }
    // Setup dialog handler before clicking submit
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /submit interview/i }).click();
    
    // Application Complete
    await expect(page.getByText(/application complete/i)).toBeVisible();
    await page.getByRole('link', { name: /back to challenge details/i }).click();

    // Logout
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);

    // ==========================================
    // C. COMPANY REVIEWS APPLICATION
    // ==========================================
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', companyEmail);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/company/, { timeout: 30000 });

    await page.goto('/dashboard/company/applications');
    await expect(page.getByText(/Test Student/i)).toBeVisible();
    
    // View Application Details
    await page.getByRole('link', { name: /Test Student/i }).first().click();

    // Give Practical Score
    await page.getByLabel('Grade (0-100)').first().fill('95');
    await page.getByRole('button', { name: /save practical score/i }).click();
    await page.waitForTimeout(1000);

    // Give Interview Score
    await page.getByLabel('Grade (0-100)').nth(1).fill('90');
    await page.getByRole('button', { name: /save interview score/i }).click();
    await page.waitForTimeout(1000);

    await page.selectOption('select', 'shortlisted');

    // Refresh and verify persistence
    await page.reload();
    await expect(page.locator('select')).toHaveValue('shortlisted');
    await expect(page.getByLabel('Grade (0-100)').first()).toHaveValue('95');
    await expect(page.getByLabel('Grade (0-100)').nth(1)).toHaveValue('90');
  });
});
