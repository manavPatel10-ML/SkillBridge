# SkillBridge Database & Collection Schema

SkillBridge uses Google Cloud Firestore in native mode (Project ID: `skillbridge-4101d`).

---

## Authoritative Collections

1. **`users`**: Auth record mapping `uid` to base role (`student`, `company`, `admin`).
2. **`studentProfiles`**: Student profile containing `targetRoleId`, `selectedSkills`, college, and bio.
3. **`companyProfiles`**: Company profile containing company details, subscription status (`active`, `inactive`).
4. **`skillScores`**: Single source of truth for verified student competence (theory, practical, verified badges, proof links).
5. **`practicalTasks`**: 20 canonical practical engineering challenges across Frontend, Backend, and Full Stack tracks.
6. **`practicalTaskAttempts`**: Practical task submissions (repo URLs, live demo URLs, evaluation rubrics).
7. **`assessments`**: 21 active canonical theory assessments.
8. **`assessmentQuestions`**: 186 multiple-choice assessment questions.
9. **`assessmentAttempts`**: Student theory assessment attempt history.
10. **`practiceProblems`**: 128 coding practice challenges with test cases.
11. **`practiceAttempts`**: Student code execution attempt records.
12. **`learningTopics`**: 16 structured learning topics.
13. **`roles`**: 3 career tracks (`frontend-developer`, `backend-developer`, `fullstack-developer`).
14. **`skills`**: 14 technical skill definitions.
15. **`companyChallenges`**: Custom practical hiring challenges created by companies.
16. **`challengeApplications`**: Student applications to company challenges.
17. **`mlTelemetry`**: Telemetry events for Model 1 and Model 2 shadow evaluations (write-only via Admin SDK).
18. **`betaFeedback`**: Feedback submissions captured during beta testing.

---

## Security Invariants
- Direct client access is strictly controlled by `firebase/firestore.rules`.
- Unpaid companies cannot read `studentProfiles` or `skillScores`.
- Students cannot forge `skillScores`, evaluation status, or hire state.
