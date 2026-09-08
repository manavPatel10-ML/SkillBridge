/**
 * practical-tasks.ts
 * 12 Curated Practical Project Tasks simulating realistic engineering workflows
 * for Frontend, Backend, and Full Stack career tracks.
 */

export interface CatalogPracticalTask {
  id: string;
  title: string;
  description: string;
  skillId: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  instructions: string;
  requirements: string[];
  submissionTypes: string[];
  evaluationCriteria: Record<string, number>;
  active: boolean;
}

export const CATALOG_PRACTICAL_TASKS: CatalogPracticalTask[] = [
  // ── Frontend Tasks ────────────────────────────────────────────────────────
  {
    id: "task-fe-landing",
    title: "Build a Responsive Product Landing Page",
    description: "Design and implement a modern, mobile-responsive product landing page using semantic HTML5 and modern CSS.",
    skillId: "html-css",
    difficulty: "Beginner",
    durationMinutes: 60,
    instructions: "Construct a responsive landing page for an edtech platform featuring a semantic navigation bar, a hero section with prominent call-to-action, a 3-column feature grid, and a footer.",
    requirements: [
      "Use semantic HTML5 elements: <header>, <nav>, <main>, <section>, and <footer>",
      "Implement a responsive layout that transforms from a 3-column desktop grid to a single column on mobile screens (< 768px)",
      "Include accessible image alt attributes and readable typographic hierarchy",
      "Ensure interactive hover and focus-visible states on buttons and hyperlinks"
    ],
    submissionTypes: ["code", "explanation", "live_url"],
    evaluationCriteria: {
      semanticStructure: 35,
      responsiveDesign: 35,
      accessibility: 20,
      codeQuality: 10
    },
    active: true
  },
  {
    id: "task-fe-interactive-form",
    title: "Build an Accessible Interactive Form with Validation",
    description: "Create an interactive student onboarding form with client-side validation, error messaging, and DOM state handling.",
    skillId: "javascript",
    difficulty: "Beginner",
    durationMinutes: 75,
    instructions: "Develop a JavaScript-powered registration form that validates name, email, password strength, and terms agreement in real time, displaying inline error banners before submission.",
    requirements: [
      "Pair all inputs with semantic <label> tags using matching 'for' and 'id' attributes",
      "Perform client-side validation on email format and password length (minimum 8 characters)",
      "Display accessible error feedback banners without shifting layout violently",
      "Prevent standard form submission using event.preventDefault() and log a sanitized JSON payload"
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      inputValidation: 40,
      domManipulation: 30,
      accessibility: 20,
      codeQuality: 10
    },
    active: true
  },
  {
    id: "task-fe-api-dashboard",
    title: "Build an API-Powered Weather & Metrics Dashboard",
    description: "Construct a dynamic frontend dashboard that fetches data from an external REST API, rendering loading indicators, cards, and error fallbacks.",
    skillId: "javascript",
    difficulty: "Intermediate",
    durationMinutes: 90,
    instructions: "Build a single-page dashboard using vanilla JavaScript or modern DOM APIs that calls a public REST endpoint, parses the JSON response, handles network errors gracefully, and dynamically renders cards.",
    requirements: [
      "Fetch data asynchronously using the native fetch() API and async/await syntax",
      "Implement distinct UI states: Loading spinner, Data Cards, and Network Error Banner",
      "Implement client-side search filtering across returned metrics",
      "Use event delegation to handle clicks on dynamically generated card action buttons"
    ],
    submissionTypes: ["code", "explanation", "live_url"],
    evaluationCriteria: {
      asyncHandling: 35,
      stateRendering: 35,
      errorResilience: 20,
      codeStyle: 10
    },
    active: true
  },
  {
    id: "task-fe-react-task-manager",
    title: "Build a React Task & Workflow Manager",
    description: "Build an interactive task management application in React with local state, filtering, status transitions, and local persistence.",
    skillId: "react",
    difficulty: "Intermediate",
    durationMinutes: 120,
    instructions: "Develop a React application allowing students to create, edit, delete, and filter learning tasks (All, In Progress, Completed). Persist task state to localStorage across reloads.",
    requirements: [
      "Decompose UI into modular functional components (TaskApp, TaskInput, TaskList, TaskItem, FilterBar)",
      "Manage state cleanly using useState and useEffect hooks with immutable update patterns",
      "Persist the task collection to browser localStorage and hydrate state upon initial mount",
      "Provide unique, stable 'key' props for all list items"
    ],
    submissionTypes: ["code", "explanation", "github"],
    evaluationCriteria: {
      componentArchitecture: 35,
      stateManagement: 35,
      persistence: 15,
      codeQuality: 15
    },
    active: true
  },

  // ── Backend Tasks ─────────────────────────────────────────────────────────
  {
    id: "task-be-rest-api",
    title: "Build a RESTful Course & Lesson Catalog API",
    description: "Design and implement a modular Express.js REST API with resource routing, proper HTTP verbs, status codes, and JSON serialization.",
    skillId: "rest-apis",
    difficulty: "Beginner",
    durationMinutes: 90,
    instructions: "Implement a Node/Express API serving a course catalog. Expose endpoints: GET /api/v1/courses, GET /api/v1/courses/:id, POST /api/v1/courses, and DELETE /api/v1/courses/:id.",
    requirements: [
      "Follow RESTful URI conventions using plural resource nouns",
      "Return standard HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found)",
      "Incorporate express.json() body parsing and return consistent JSON envelopes",
      "Organize route controllers into a modular express.Router() file"
    ],
    submissionTypes: ["code", "explanation", "github"],
    evaluationCriteria: {
      restDesign: 40,
      routeOrganization: 30,
      errorHandling: 20,
      codeQuality: 10
    },
    active: true
  },
  {
    id: "task-be-crud-database",
    title: "Implement Database CRUD Service with SQL",
    description: "Write relational schema migrations and parameterized SQL queries to persist, retrieve, update, and paginate student application records.",
    skillId: "sql",
    difficulty: "Intermediate",
    durationMinutes: 90,
    instructions: "Write SQL DDL to create 'students' and 'submissions' tables with primary and foreign key constraints. Implement repository methods for insertion, join querying, and pagination.",
    requirements: [
      "Define schemas with appropriate column types, NOT NULL constraints, and ON DELETE CASCADE foreign keys",
      "Implement parameterized queries preventing SQL injection vulnerabilities",
      "Write an aggregated query using INNER JOIN and GROUP BY to compute student average scores",
      "Implement offset/limit pagination for record retrieval"
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      schemaDesign: 35,
      queryCorrectness: 35,
      security: 20,
      documentation: 10
    },
    active: true
  },
  {
    id: "task-be-authentication-system",
    title: "Build a Secure Token Authentication System",
    description: "Implement a complete user registration and login pipeline with bcrypt password hashing, input validation, and JWT issuing.",
    skillId: "auth-security",
    difficulty: "Intermediate",
    durationMinutes: 120,
    instructions: "Develop an Express authentication module providing /api/auth/register and /api/auth/login. Hash passwords with bcrypt (12 rounds) and issue signed JWTs upon authentication.",
    requirements: [
      "Enforce password security policy (minimum 8 characters, letters and numbers)",
      "Hash passwords asynchronously with bcrypt before persisting to data store",
      "Verify credentials in constant time and return generic error message on invalid credentials",
      "Create a reusable requireAuth middleware that validates the Bearer token and attaches user to req.user"
    ],
    submissionTypes: ["code", "explanation", "github"],
    evaluationCriteria: {
      securityHardening: 40,
      tokenManagement: 30,
      middlewareArchitecture: 20,
      codeQuality: 10
    },
    active: true
  },
  {
    id: "task-be-database-backed-api",
    title: "Build a Production API Backed by Relational Database",
    description: "Build an end-to-end backend service combining Express.js, connection pooling, transactional integrity, and centralized error handling.",
    skillId: "nodejs",
    difficulty: "Intermediate",
    durationMinutes: 120,
    instructions: "Construct an Express service connected to a database pool. Implement transactional writes when creating a student profile and initial skills, with centralized error sanitization.",
    requirements: [
      "Configure connection pooling and graceful server shutdown on SIGTERM/SIGINT",
      "Wrap multi-table operations in database transactions (BEGIN ... COMMIT ... ROLLBACK)",
      "Implement centralized 4-parameter error middleware that masks internal database stack traces",
      "Expose a /health route verifying database ping connectivity"
    ],
    submissionTypes: ["code", "explanation", "github"],
    evaluationCriteria: {
      systemIntegration: 35,
      transactionSafety: 35,
      errorSanitization: 20,
      codeQuality: 10
    },
    active: true
  },

  // ── Full Stack Tasks ──────────────────────────────────────────────────────
  {
    id: "task-fs-api-integration",
    title: "Connect a React Frontend to an Authenticated REST API",
    description: "Integrate a React client with an authenticated backend API, managing session tokens, request headers, and response state.",
    skillId: "fullstack-integration",
    difficulty: "Intermediate",
    durationMinutes: 120,
    instructions: "Build an integrated full-stack client feature that logs in a user, stores the JWT securely, injects the Bearer token in subsequent requests, and displays personalized student dashboard data.",
    requirements: [
      "Implement an API client utility that automatically attaches Authorization: Bearer <token>",
      "Handle token expiration by redirecting to /auth/login gracefully",
      "Manage asynchronous loading spinners, empty lists, and error alert banners in React",
      "Configure CORS headers correctly on the backend server for local development and production"
    ],
    submissionTypes: ["code", "explanation", "github"],
    evaluationCriteria: {
      endToEndIntegration: 40,
      tokenHandling: 30,
      errorFeedback: 20,
      codeQuality: 10
    },
    active: true
  },
  {
    id: "task-fs-full-stack-app",
    title: "Build a Full-Stack Problem Submission & Feedback App",
    description: "Develop a complete end-to-end full-stack web application with database persistence, REST endpoints, and dynamic React views.",
    skillId: "fullstack-integration",
    difficulty: "Intermediate",
    durationMinutes: 150,
    instructions: "Construct a full-stack mini platform where students can view practice problems, submit code solutions via an Express API, persist attempts in a database, and view their historical submissions.",
    requirements: [
      "Full stack repository structure with clean separation of client, server, and shared types",
      "Implement backend schema validation and persistent storage of submission timestamps and results",
      "Implement responsive frontend with optimistic update on submission and real-time status feedback",
      "Sanitize all server errors and enforce request rate limiting on public endpoints"
    ],
    submissionTypes: ["code", "explanation", "github", "live_url"],
    evaluationCriteria: {
      systemCohesion: 35,
      databasePersistence: 25,
      frontendUX: 25,
      securityBestPractices: 15
    },
    active: true
  },
  {
    id: "task-fs-persistent-auth",
    title: "Implement Full-Stack Session & Auth Workflow",
    description: "Implement end-to-end authentication with secure cookies/tokens, protected frontend routes, and role-based backend endpoints.",
    skillId: "fullstack-integration",
    difficulty: "Intermediate",
    durationMinutes: 120,
    instructions: "Create a complete full-stack login and protected dashboard experience. The backend verifies credentials and issues tokens, while the frontend provides AuthContext state and protected route guards.",
    requirements: [
      "React AuthContext providing user state, login, logout, and loading flags across the app tree",
      "Protected Route wrapper redirecting unauthenticated visitors to /auth/login with return URL preserved",
      "Backend RBAC middleware verifying student vs admin roles on sensitive endpoints",
      "Defend against account enumeration on password reset and login endpoints"
    ],
    submissionTypes: ["code", "explanation", "github"],
    evaluationCriteria: {
      authFlowSecurity: 40,
      reactContextDesign: 30,
      routeProtection: 20,
      codeQuality: 10
    },
    active: true
  },
  {
    id: "task-fs-realtime-metrics",
    title: "Build an End-to-End Skill Progress & Telemetry Viewer",
    description: "Integrate a real-time progress monitor that queries student attempts, calculates skill mastery bands, and visualizes progression.",
    skillId: "fullstack-integration",
    difficulty: "Advanced",
    durationMinutes: 150,
    instructions: "Build an end-to-end skill progression viewer that queries historical assessment and practice attempts from the database, computes mastery states using the platform's deterministic rules, and renders visual progress bars.",
    requirements: [
      "Design efficient database queries aggregating student performance across multiple skills",
      "Compute skill journey states (Not Started, Learning, Practicing, Competent, Verified)",
      "Render visual progress meters with accessible contrast and responsive layouts",
      "Implement error boundaries and skeleton loading states"
    ],
    submissionTypes: ["code", "explanation", "github"],
    evaluationCriteria: {
      dataAggregation: 35,
      masteryComputation: 30,
      uiVisualization: 25,
      codeQuality: 10
    },
    active: true
  }
];
