import { test, expect } from '@playwright/test';

test.describe('Phase 6C: Practical Evaluation & Aggregation Flow', () => {
  const timestamp = Date.now();
  const adminEmail = `admin.${timestamp}@example.com`;
  const studentEmail = `student.${timestamp}@example.com`;
  const companyEmail = `company.${timestamp}@example.com`;
  const password = 'Password123!';

  test('Student submission -> Admin evaluation -> skillScores -> Company reads', async ({ page, request }) => {
    test.setTimeout(180000);

    // 1. Seed data
    await page.goto('/seed');
    const runSeedBtn = page.getByRole('button', { name: /Run Seed/i });
    if (await runSeedBtn.isVisible()) {
      await runSeedBtn.click();
      await expect(page.getByText(/Seed complete successfully/i)).toBeVisible({ timeout: 15000 });
    }

    // 2. Register Student
    await page.goto('/auth/register?role=student');
    await page.fill('input[type="email"]', studentEmail);
    await page.fill('input[type="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    const studentRoleBtn = page.getByRole('button', { name: /Student/i });
    if (await studentRoleBtn.isVisible()) {
      await studentRoleBtn.click();
    }
    
    await expect(page.locator('label:has-text("Full Name") + input')).toBeVisible({ timeout: 15000 });
    await page.locator('label:has-text("Full Name") + input').fill('Test Student');
    await page.locator('label:has-text("College / University") + input').fill('Test University');
    await page.locator('label:has-text("Degree") + input').fill('B.Tech');
    await page.locator('label:has-text("Branch") + input').fill('Computer Science');
    await page.locator('label:has-text("Expected Graduation Year") + input').fill('2025');
    await page.getByRole('button', { name: /complete setup/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15000 });

    // 3. Student takes a practical task
    await page.goto('/dashboard/student/skills');
    await page.waitForLoadState('networkidle');
    // Click on the first skill that has a practical task. We seed React with tasks.
    await page.locator('text="Start Practical"').first().click();
    
    // In practical task view
    await expect(page.locator('text="Submit Solution"')).toBeVisible({ timeout: 15000 });
    await page.locator('textarea').first().fill('console.log("Here is my solution code!");');
    await page.locator('textarea').nth(1).fill('This is my explanation.');
    await page.locator('button:has-text("Submit Solution")').click();
    
    await expect(page.locator('text="Solution Submitted"')).toBeVisible({ timeout: 15000 });
    await page.locator('button:has-text("Return to Skills")').click();
    await expect(page).toHaveURL(/\/dashboard\/student\/skills/);
    
    // We need the student UID to verify the admin patching later. 
    // We can just log out.
    await page.goto('/dashboard/student/profile');
    await page.locator('button:has-text("Sign Out")').first().click();
    await expect(page).toHaveURL('/');

    // 4. Register Admin (as Student first, then patch to admin)
    await page.goto('/auth/register?role=student');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    if (await studentRoleBtn.isVisible()) {
      await studentRoleBtn.click();
    }
    await expect(page.locator('label:has-text("Full Name") + input')).toBeVisible({ timeout: 15000 });
    await page.locator('label:has-text("Full Name") + input').fill('Admin User');
    await page.locator('label:has-text("College / University") + input').fill('Admin Uni');
    await page.locator('label:has-text("Degree") + input').fill('B.S.');
    await page.locator('label:has-text("Branch") + input').fill('Admin');
    await page.locator('label:has-text("Expected Graduation Year") + input').fill('2025');
    await page.getByRole('button', { name: /complete setup/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 15000 });
    
    // Now get the admin UID from IndexedDB or local storage
    const adminUid = await page.evaluate(() => {
      const key = Object.keys(sessionStorage).find(k => k.startsWith('firebase:authUser:'));
      return key ? JSON.parse(sessionStorage.getItem(key)!).uid : null;
    });

    if (adminUid) {
      console.log('Admin UID:', adminUid);
      // Use Firebase Emulator REST API to patch the user to admin
      const res = await request.patch(`http://127.0.0.1:8080/v1/projects/demo-skillbridge/databases/(default)/documents/users/${adminUid}`, {
        data: {
          fields: {
            email: { stringValue: adminEmail },
            role: { stringValue: 'admin' },
            createdAt: { timestampValue: new Date().toISOString() }
          }
        }
      });
      console.log('Patch response:', res.status());
    }

    // Refresh page, user is now admin
    await page.goto('/dashboard/admin/evaluations');
    await expect(page.locator('text="Practical Task Evaluations"')).toBeVisible({ timeout: 15000 });
    
    // 5. Admin evaluates the submission
    await page.locator('text="Evaluate"').first().click();
    await expect(page.locator('text="Evaluation Criteria"')).toBeVisible({ timeout: 15000 });
    
    // Enter score and feedback
    await page.locator('input[type="number"]').fill('95');
    await page.locator('textarea[placeholder="Provide overall feedback..."]').fill('Excellent solution.');
    await page.locator('button:has-text("Submit Evaluation")').click();
    await expect(page.locator('text="Practical Task Evaluations"')).toBeVisible({ timeout: 15000 });

    // Logout
    await page.locator('button:has-text("Sign Out")').first().click();

    // 6. Register Company
    await page.goto('/auth/register?role=company');
    await page.fill('input[type="email"]', companyEmail);
    await page.fill('input[type="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    const companyRoleBtn = page.getByRole('button', { name: /Company/i });
    if (await companyRoleBtn.isVisible()) {
      await companyRoleBtn.click();
    }
    await expect(page.locator('label:has-text("Company Name") + input')).toBeVisible({ timeout: 15000 });
    await page.locator('label:has-text("Company Name") + input').fill('Company Inc');
    await page.locator('label:has-text("Industry") + input').fill('Tech');
    await page.locator('label:has-text("Website") + input').fill('https://company.com');
    await page.locator('label:has-text("Contact Person") + input').fill('CEO');
    await page.getByRole('button', { name: /complete setup/i }).click();
    
    // 7. Company searches and sees the aggregated score
    await page.goto('/dashboard/company/search');
    await page.waitForLoadState('networkidle');
    
    // Wait for students to load
    await expect(page.locator('text="Test Student"')).toBeVisible({ timeout: 15000 });
    
    // Verify the score appears on the student card
    const studentCard = page.locator('div.border.rounded-xl', { hasText: 'Test Student' });
    await expect(studentCard.locator('text="95%"')).toBeVisible();
    await expect(studentCard.locator('text="Overall"')).toBeVisible();
    
    // Company only sees the aggregated `overallScore`/`practicalScore`, not the raw attempt.
  });
});
