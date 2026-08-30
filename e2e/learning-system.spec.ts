import { test, expect } from '@playwright/test';

// Use a deterministic timestamp to ensure uniqueness per test run
const TIMESTAMP = Date.now();
const ADMIN_EMAIL = `admin_learn_${TIMESTAMP}@test.com`;
const STUDENT_EMAIL = `student_learn_${TIMESTAMP}@test.com`;
const SKILL_NAME = `Test Skill ${TIMESTAMP}`;
const TOPIC_NAME = `React Basics`;

test.describe('Phase 8D: Structured Technical Learning', () => {

  test('Admin can create a learning topic and student can view it', async ({ page }) => {
    // ----------------------------------------------------
    // 1. Setup Data: Register Admin and Create Skill
    // ----------------------------------------------------
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/onboarding/);
    await page.fill('input[name="name"]', 'Admin Learn User');
    await page.selectOption('select[name="role"]', 'admin');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard\/admin/);

    // Create a skill to attach the learning topic to
    await page.click('text=Skill Catalog');
    await page.click('text=Add Skill');
    await page.fill('input[placeholder="e.g., React, Python, UI/UX"]', SKILL_NAME);
    await page.click('button:has-text("Save Skill")');
    await expect(page.locator(`text=${SKILL_NAME}`)).toBeVisible();

    // ----------------------------------------------------
    // 2. Admin creates a Learning Topic
    // ----------------------------------------------------
    await page.click('text=Learning Content');
    await expect(page.locator('text=Learning Content Management')).toBeVisible();

    await page.click('text=Add New Topic');
    await expect(page.locator('text=Create Learning Topic')).toBeVisible();

    // Fill out the form
    await page.selectOption('select', { label: SKILL_NAME });
    await page.fill('input[placeholder="e.g. Variables, OOP, Functions"]', TOPIC_NAME);
    await page.fill('input[placeholder="e.g. Introduction to Object-Oriented Programming"]', 'Introduction to React Basics');
    await page.fill('textarea[placeholder="A brief introduction to the topic..."]', 'This is an overview of React Basics.');
    await page.fill('textarea[placeholder="- Concept 1...\\n- Concept 2..."]', '- Components\n- State');
    await page.fill('textarea[placeholder="```python\\ndef hello():\\n    pass\\n```"]', '```javascript\nconst a = 1;\n```');
    await page.fill('textarea[placeholder="- Forgetting to return a value...\\n- Off-by-one errors..."]', '- Forgetting to export');
    
    // Save
    await page.click('button:has-text("Create Topic")');
    
    // Verify it appears in the admin list
    await page.waitForURL(/\/dashboard\/admin\/learning/);
    await expect(page.locator('text=Introduction to React Basics')).toBeVisible();
    await expect(page.locator(`text=${TOPIC_NAME}`)).toBeVisible();

    // ----------------------------------------------------
    // 3. Setup Data: Register Student
    // ----------------------------------------------------
    // Wait a moment for firestore sync
    await page.waitForTimeout(1000);
    await page.click('text=Logout');
    
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', STUDENT_EMAIL);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/onboarding/);
    await page.fill('input[name="name"]', 'Student Learn User');
    await page.selectOption('select[name="role"]', 'student');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard\/student/);

    // ----------------------------------------------------
    // 4. Student views Learning Topics
    // ----------------------------------------------------
    await page.click('text=Learn');
    await expect(page.locator('text=Learning Center')).toBeVisible();
    
    // Check if the skill and topic are visible
    await expect(page.locator(`text=${SKILL_NAME}`)).toBeVisible();
    await expect(page.locator('text=Introduction to React Basics')).toBeVisible();

    // Click into the topic
    await page.click('text=Introduction to React Basics');
    
    // Verify content is displayed
    await expect(page.locator('text=Overview')).toBeVisible();
    await expect(page.locator('text=This is an overview of React Basics.')).toBeVisible();
    await expect(page.locator('text=Key Concepts')).toBeVisible();
    await expect(page.locator('text=Examples')).toBeVisible();
    await expect(page.locator('text=Common Mistakes to Avoid')).toBeVisible();

    // ----------------------------------------------------
    // 5. Student clicks Practice button to navigate
    // ----------------------------------------------------
    await page.click(`text=Practice ${TOPIC_NAME} Now`);
    await page.waitForURL(/\/dashboard\/student\/practice/);
    
    // Verify search param is picked up
    await expect(page.locator('input[placeholder="Search by title, topic, or skill..."]')).toHaveValue(TOPIC_NAME);
  });
});
