/**
 * learning-topics.ts
 * 16 Major Learning Topics for SkillBridge Initial Learning Catalog.
 */

export interface CatalogLearningTopic {
  id: string;
  skillId: string;
  topic: string;
  title: string;
  overview: string;
  concepts: string;
  examples: string;
  commonMistakes: string;
  active: boolean;
  order: number;
  prerequisiteTopicId?: string;
}

export const CATALOG_LEARNING_TOPICS: CatalogLearningTopic[] = [
  // ── 1. HTML Fundamentals ──────────────────────────────────────────────────
  {
    id: "topic-html-fundamentals",
    skillId: "html-css",
    topic: "html-fundamentals",
    title: "HTML Fundamentals & Semantic Web",
    overview: "Master the structure of the web using HyperText Markup Language (HTML5), document anatomy, semantic elements, forms, and accessibility foundations.",
    concepts: "HTML5 document structure involves doctype declarations, head elements (meta, title, links), and body elements. Semantic tags such as <header>, <nav>, <main>, <article>, <section>, and <footer> convey structural meaning to assistive tech and search engines. Form controls (<input>, <select>, <textarea>, <button>) require associated <label> elements for accessibility and usability.",
    examples: `<!-- Basic Semantic Document Layout -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Portfolio</title>
</head>
<body>
  <header>
    <h1>Alex Rivera</h1>
    <nav>
      <a href="#about">About</a>
      <a href="#projects">Projects</a>
    </nav>
  </header>
  <main>
    <section id="about">
      <h2>About Me</h2>
      <p>Passionate software engineer building web applications.</p>
    </section>
  </main>
</body>
</html>`,
    commonMistakes: "Using generic <div> elements for everything instead of semantic tags (<button> vs <div onClick>); forgetting 'alt' attributes on <img> elements; omitting associated <label> tags with form inputs; nesting block elements incorrectly.",
    active: true,
    order: 1,
  },

  // ── 2. CSS Fundamentals ───────────────────────────────────────────────────
  {
    id: "topic-css-fundamentals",
    skillId: "html-css",
    topic: "css-fundamentals",
    title: "CSS Fundamentals, Box Model & Modern Layouts",
    overview: "Understand the CSS box model, cascade specificity, typography, colors, and modern layout engines including Flexbox and CSS Grid.",
    concepts: "The CSS box model dictates how elements render spacing: content, padding, border, and margin. box-sizing: border-box is modern best practice. Specificity determines which rules apply (Inline > ID > Class/Attribute > Tag). Flexbox handles one-dimensional row/column alignment (justify-content, align-items). CSS Grid handles two-dimensional layouts with grid-template-columns, gap, and grid-areas. Media queries enable responsive breakpoints.",
    examples: `/* Universal box-sizing & clean flexbox centering */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.hero-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
  background: #f8fafc;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  width: 100%;
}`,
    commonMistakes: "Confusing margin and padding; not resetting margin/padding defaults; using fixed pixel widths that overflow mobile screens instead of max-width or percentages; over-relying on !important instead of proper selector specificity.",
    active: true,
    order: 2,
    prerequisiteTopicId: "topic-html-fundamentals",
  },

  // ── 3. JavaScript Fundamentals ────────────────────────────────────────────
  {
    id: "topic-js-fundamentals",
    skillId: "javascript",
    topic: "js-fundamentals",
    title: "JavaScript Fundamentals & Core Language",
    overview: "Build rock-solid fluency in JavaScript variables (let, const), data types, operators, conditionals, loops, array methods, and functional expressions.",
    concepts: "Variables should be declared with 'const' by default and 'let' when reassignment is needed; avoid 'var' due to function-scoping and hoisting pitfalls. Primitive types include string, number, boolean, null, undefined, and symbol. Reference types include objects, arrays, and functions. Higher-order array methods (map, filter, reduce, find, some) enable declarative and expressive data transformations.",
    examples: `// Working with collections & array transformations
const users = [
  { id: 1, name: "Alice", active: true, score: 85 },
  { id: 2, name: "Bob", active: false, score: 60 },
  { id: 3, name: "Charlie", active: true, score: 92 },
];

// Filter active students and calculate average score
const activeUsers = users.filter(user => user.active);
const totalScore = activeUsers.reduce((sum, user) => sum + user.score, 0);
const averageScore = totalScore / activeUsers.length;

console.log("Average Score:", averageScore); // 88.5`,
    commonMistakes: "Using loose equality (==) instead of strict equality (===); mutating arrays in-place with sort/reverse when pure transformations are intended; mutating objects instead of creating copies; forgetting that 'typeof null' is 'object'.",
    active: true,
    order: 1,
  },

  // ── 4. DOM and Events ─────────────────────────────────────────────────────
  {
    id: "topic-dom-events",
    skillId: "javascript",
    topic: "dom-events",
    title: "DOM Manipulation & Event Architecture",
    overview: "Learn how the browser parses HTML into the Document Object Model (DOM), how to select and manipulate nodes, and how to handle user interactions via event listeners.",
    concepts: "The DOM is an in-memory tree representation of the document. Query selectors (querySelector, querySelectorAll) select elements using CSS syntax. Elements are modified via textContent, innerHTML, classList, and setAttribute. The Event Model relies on capture, target, and bubbling phases. Event delegation attaches a single listener to a parent container to manage child element events efficiently.",
    examples: `// Event delegation pattern
const todoList = document.querySelector("#todo-list");

todoList.addEventListener("click", (event) => {
  const target = event.target;
  if (target.classList.contains("delete-btn")) {
    const listItem = target.closest("li");
    if (listItem) {
      listItem.remove();
    }
  }
});`,
    commonMistakes: "Using innerHTML with untrusted user input which opens Cross-Site Scripting (XSS) vectors; adding duplicate event listeners inside loops instead of using event delegation; trying to access DOM elements before the document has loaded; forgetting to preventDefault() on form submit events.",
    active: true,
    order: 2,
    prerequisiteTopicId: "topic-js-fundamentals",
  },

  // ── 5. Web APIs / Fetch ───────────────────────────────────────────────────
  {
    id: "topic-web-apis-fetch",
    skillId: "javascript",
    topic: "web-apis-fetch",
    title: "Asynchronous JavaScript, Promises & Fetch API",
    overview: "Understand JavaScript's asynchronous model (Event Loop, Call Stack, Task Queue), Promises, async/await syntax, and network requests via the Fetch API.",
    concepts: "JavaScript is single-threaded; asynchronous operations are coordinated through the Event Loop. A Promise represents a value available now, in the future, or never (pending, fulfilled, rejected). async/await provides synchronous-looking syntax over Promises. The fetch() API performs HTTP requests and returns a Promise resolving to a Response object; developers must check response.ok and parse the JSON stream.",
    examples: `// Robust API fetching with error handling
async function fetchStudentProfile(studentId) {
  try {
    const response = await fetch(\`/api/students/\${studentId}\`);
    if (!response.ok) {
      throw new Error(\`Network error: \${response.status} \${response.statusText}\`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch failure:", error.message);
    throw error;
  }
}`,
    commonMistakes: "Assuming fetch() rejects on HTTP 404/500 (it only rejects on network failure); forgetting to await response.json(); forgetting try/catch blocks with async/await functions; triggering race conditions by not canceling previous pending requests.",
    active: true,
    order: 3,
    prerequisiteTopicId: "topic-dom-events",
  },

  // ── 6. Git and GitHub Fundamentals ────────────────────────────────────────
  {
    id: "topic-git-fundamentals",
    skillId: "git-github",
    topic: "git-fundamentals",
    title: "Git Version Control & Collaboration on GitHub",
    overview: "Understand distributed version control, tracking changes, staging area, commits, branching workflows, remotes, merge conflicts, and Pull Requests.",
    concepts: "Git organizes work across three local areas: Working Directory, Staging Area (Index), and Repository history (.git). Commits are immutable snapshots with cryptographic hashes. Branches represent movable pointers to commits. Feature-branch workflows (main -> feature/branch -> Pull Request) ensure clean collaboration. Merge conflicts happen when two branches modify the same lines of code.",
    examples: `# Common daily feature branch workflow
git checkout -b feature/login-form
git add src/components/LoginForm.tsx
git commit -m "feat(auth): implement student login form with validation"
git push -u origin feature/login-form
# Open Pull Request on GitHub and merge after peer review`,
    commonMistakes: "Committing sensitive files like .env or API keys without .gitignore; writing vague commit messages like 'fixed stuff'; committing directly to main branch; getting stuck in detached HEAD state; using git push --force on shared team branches.",
    active: true,
    order: 1,
  },

  // ── 7. React Fundamentals ─────────────────────────────────────────────────
  {
    id: "topic-react-fundamentals",
    skillId: "react",
    topic: "react-fundamentals",
    title: "React Fundamentals: Components, State & Hooks",
    overview: "Learn declarative component architecture with React, JSX expressions, props passing, local state with useState, side effects with useEffect, and conditional rendering.",
    concepts: "React uses a virtual DOM reconciliation algorithm to efficiently update the UI. Functional components accept immutable props and return JSX. useState introduces reactive local state: calling the setter schedules a re-render. useEffect coordinates side effects (data fetching, subscriptions, DOM timers) and accepts a dependency array to control execution. State should never be mutated directly.",
    examples: `import React, { useState, useEffect } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div className="p-4 border rounded">
      <p>Current count: {count}</p>
      <button 
        onClick={() => setCount(prev => prev + 1)}
        className="px-3 py-1 bg-blue-600 text-white rounded"
      >
        Increment
      </button>
    </div>
  );
}`,
    commonMistakes: "Directly modifying state objects (e.g. state.push(x)) instead of using setter functions with spread copies; omitting dependencies in useEffect dependency arrays causing stale closures; triggering infinite re-render loops by calling state setters unconditionally inside component bodies.",
    active: true,
    order: 1,
    prerequisiteTopicId: "topic-dom-events",
  },

  // ── 8. Programming Fundamentals ───────────────────────────────────────────
  {
    id: "topic-programming-fundamentals",
    skillId: "javascript",
    topic: "programming-fundamentals",
    title: "Programming Fundamentals: Algorithms & Data Structures",
    overview: "Master algorithmic problem solving, time and space complexity (Big-O notation), recursion, stack and queue data structures, and hash maps.",
    concepts: "Algorithmic efficiency is measured via Big-O notation for time (execution operations) and space (memory consumption). Hash maps (JavaScript Objects/Maps) provide average O(1) lookups and insertions. Arrays provide O(1) indexed access but O(n) arbitrary insertions. Sorting algorithms (merge sort, quick sort) achieve O(n log n). Recursive functions require an explicit base case to avoid call stack overflows.",
    examples: `// Two-Sum problem using a Hash Map for O(n) time efficiency
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`,
    commonMistakes: "Using nested loops resulting in O(n^2) complexity when a hash map can achieve O(n); forgetting base cases in recursion; off-by-one errors in loop boundaries; modifying collections while iterating over them.",
    active: true,
    order: 1,
  },

  // ── 9. HTTP Fundamentals ──────────────────────────────────────────────────
  {
    id: "topic-http-fundamentals",
    skillId: "computer-networks",
    topic: "http-fundamentals",
    title: "HTTP Protocol, Status Codes & Request Lifecycle",
    overview: "Understand client-server architecture, TCP/IP handshakes, HTTP methods (GET, POST, PUT, PATCH, DELETE), headers, status codes, cookies, and CORS.",
    concepts: "HTTP is a stateless application-layer protocol running over TCP. Requests contain a method, URL, headers, and optional body. Responses contain a status code, status text, headers, and body. Status code families: 2xx (Success), 3xx (Redirection), 4xx (Client Error), 5xx (Server Error). Cross-Origin Resource Sharing (CORS) is a browser security mechanism governed by Access-Control-* response headers.",
    examples: `HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 68
Strict-Transport-Security: max-age=63072000; includeSubDomains

{
  "status": "success",
  "data": { "id": "std_101", "role": "student" }
}`,
    commonMistakes: "Using GET requests for state-changing operations; returning HTTP 200 with an error body payload; confusing 401 Unauthorized (unauthenticated) with 403 Forbidden (authenticated but lacking permissions); misunderstanding CORS as a server-side error when it is a browser-enforced security barrier.",
    active: true,
    order: 1,
  },

  // ── 10. REST API Concepts ─────────────────────────────────────────────────
  {
    id: "topic-rest-api-concepts",
    skillId: "rest-apis",
    topic: "rest-api-concepts",
    title: "REST Architecture, Resource Design & Contracts",
    overview: "Learn the foundational principles of Representational State Transfer (REST), resource-oriented URL design, idempotency, filtering, pagination, and API versioning.",
    concepts: "REST treats data as resources identified by URI nouns (e.g. /api/v1/students), not verbs. Standard verbs dictate actions: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove). Idempotency ensures that identical multiple requests have the same server state effect (GET, PUT, DELETE are idempotent; POST is not). Pagination (limit, offset or cursor) prevents database overload.",
    examples: `// RESTful API Endpoint Conventions:
// GET    /api/v1/courses              -> List courses (paginated)
// POST   /api/v1/courses              -> Create a new course
// GET    /api/v1/courses/:id          -> Retrieve single course details
// PATCH  /api/v1/courses/:id          -> Update specific course fields
// DELETE /api/v1/courses/:id          -> Remove a course
// GET    /api/v1/courses/:id/students -> Sub-resource access`,
    commonMistakes: "Using verbs in URIs (e.g., /api/createStudent or /api/deleteCourse); returning inconsistent response formats; mixing up PUT (full replacement) and PATCH (partial update); omitting pagination on large dataset endpoints.",
    active: true,
    order: 1,
    prerequisiteTopicId: "topic-http-fundamentals",
  },

  // ── 11. Node.js Fundamentals ──────────────────────────────────────────────
  {
    id: "topic-nodejs-fundamentals",
    skillId: "nodejs",
    topic: "nodejs-fundamentals",
    title: "Node.js Runtime, Modules & Event-Driven Architecture",
    overview: "Understand the V8 JavaScript engine in server environments, the Node.js event loop, CommonJS vs ESM modules, built-in modules (fs, path, http), and streams.",
    concepts: "Node.js executes JavaScript on the server using non-blocking, event-driven I/O. Asynchronous operations delegate to libuv thread pools. Modules encapsulate reusable code using ESM (import/export) or CommonJS (require/module.exports). The process object exposes environment variables (process.env) and runtime controls. Buffers and streams handle chunked file/data transfers efficiently.",
    examples: `import fs from "fs/promises";
import path from "path";

async function loadConfig(filename: string) {
  const filePath = path.join(process.cwd(), "config", filename);
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
}`,
    commonMistakes: "Using synchronous methods (e.g. readFileSync) in request paths which blocks the entire server event loop; committing sensitive configuration instead of using environment variables; mixing CommonJS and ESM imports improperly.",
    active: true,
    order: 1,
    prerequisiteTopicId: "topic-js-fundamentals",
  },

  // ── 12. Express.js ────────────────────────────────────────────────────────
  {
    id: "topic-express-fundamentals",
    skillId: "nodejs",
    topic: "express-fundamentals",
    title: "Express.js Routing, Middleware & Error Handlers",
    overview: "Build web servers and APIs with Express.js, request/response lifecycle, custom middleware pipelines, body parsers, route parameters, and centralized error handling.",
    concepts: "Express is a minimalist web framework for Node.js. An Express application is a stack of middleware functions that execute sequentially. Middleware functions receive (req, res, next) and can inspect, modify, or terminate requests. Error-handling middleware has four arguments: (err, req, res, next). Routers modularize endpoint definitions.",
    examples: `import express from "express";

const app = express();
app.use(express.json());

// Custom logging middleware
app.use((req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  next();
});

// Route with validation
app.post("/api/echo", (req, res) => {
  if (!req.body.message) {
    return res.status(400).json({ error: "message field is required" });
  }
  res.json({ reply: req.body.message });
});`,
    commonMistakes: "Forgetting to call next() in middleware causing client requests to hang indefinitely; sending headers multiple times (e.g., calling res.json() twice without a return statement); neglecting a centralized 4-parameter error handler.",
    active: true,
    order: 2,
    prerequisiteTopicId: "topic-nodejs-fundamentals",
  },

  // ── 13. Database Fundamentals ─────────────────────────────────────────────
  {
    id: "topic-database-fundamentals",
    skillId: "sql",
    topic: "database-fundamentals",
    title: "Relational Database Design, SQL Queries & Normalization",
    overview: "Master relational schema design, primary and foreign keys, table normalization (1NF, 2NF, 3NF), SQL CRUD queries, aggregations, joins, and indexing.",
    concepts: "Relational databases store structured records in tables with enforced schemas. Primary keys uniquely identify rows; foreign keys maintain referential integrity between tables. Queries utilize SELECT, INSERT INTO, UPDATE, and DELETE. JOIN operations (INNER, LEFT, RIGHT) combine data across tables. Indexes speed up lookups at the cost of slight write overhead. ACID transactions guarantee consistency.",
    examples: `-- Retrieve top students and their average assessment scores
SELECT 
  s.id,
  s.name,
  COUNT(a.id) AS total_assessments,
  ROUND(AVG(a.score), 2) AS average_score
FROM students s
INNER JOIN assessments a ON s.id = a.student_id
WHERE a.status = 'completed'
GROUP BY s.id, s.name
HAVING AVG(a.score) >= 75.0
ORDER BY average_score DESC
LIMIT 10;`,
    commonMistakes: "Concatenating user inputs directly into SQL queries creating SQL Injection vulnerabilities (always use parameterized queries); creating tables without primary keys or indexes on foreign keys; using SELECT * in production queries; failing to wrap related writes in ACID transactions.",
    active: true,
    order: 1,
  },

  // ── 14. Authentication Fundamentals ───────────────────────────────────────
  {
    id: "topic-auth-fundamentals",
    skillId: "auth-security",
    topic: "auth-fundamentals",
    title: "Authentication Architecture, Password Hashing & Tokens",
    overview: "Understand digital identity verification, password hashing algorithms (bcrypt/argon2), salt generation, session cookies, JSON Web Tokens (JWT), and RBAC.",
    concepts: "Authentication verifies WHO a user is; authorization verifies WHAT a user can do. Passwords must never be stored in plain text; slow hashing algorithms (bcrypt with high work factor) protect against brute-force attacks. Tokens (JWTs) contain cryptographically signed payloads (header, payload, signature). Sessions store state server-side while JWTs enable stateless validation. Role-Based Access Control (RBAC) guards protected endpoints.",
    examples: `// Password hashing and verification pattern
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}`,
    commonMistakes: "Using fast hashing algorithms like MD5 or SHA256 for passwords instead of adaptive key-derivation functions (bcrypt, Argon2); storing sensitive tokens in localStorage vulnerable to XSS; omitting expiration times (exp) on JWTs; trusting client-side role claims without server verification.",
    active: true,
    order: 1,
    prerequisiteTopicId: "topic-express-fundamentals",
  },

  // ── 15. API Development ───────────────────────────────────────────────────
  {
    id: "topic-api-development",
    skillId: "rest-apis",
    topic: "api-development",
    title: "Production API Development: Validation & Error Handling",
    overview: "Build production-ready web APIs incorporating schema validation, sanitized error formatting, rate limiting, request tracing, and OpenAPI documentation.",
    concepts: "Production APIs must strictly validate all incoming payloads using schema validators before processing. Sensitive internal database errors, stack traces, and system paths must be intercepted and masked with generic messages. Rate limiting protects endpoints against denial-of-service. Health check routes (/health) report service availability.",
    examples: `// Sanitized API error response contract
export function sanitizeApiError(error: unknown) {
  if (error instanceof ValidationError) {
    return { status: 400, message: error.message };
  }
  // Mask all unexpected system failures
  console.error("Internal Server Error:", error);
  return { status: 500, message: "Internal server error" };
}`,
    commonMistakes: "Returning raw database error objects or stack traces to clients; omitting rate limiting on public routes; failing to validate request body types and string lengths; inconsistent error response JSON schemas across endpoints.",
    active: true,
    order: 2,
    prerequisiteTopicId: "topic-rest-api-concepts",
  },

  // ── 16. Full Stack Integration ────────────────────────────────────────────
  {
    id: "topic-fullstack-integration",
    skillId: "fullstack-integration",
    topic: "fullstack-integration",
    title: "Full Stack Integration: Connecting Frontend, API & Database",
    overview: "Integrate modern Single-Page Applications with backend API services, secure session propagation, optimistic UI updates, loading states, and deployment pipelines.",
    concepts: "Full-stack integration bridges client interfaces and server services into a cohesive user experience. State synchronization patterns handle asynchronous network latency using loading spinners, error alerts, and optimistic updates. Authentication state propagates seamlessly via HTTP-only cookies or Authorization Bearer headers. CORS, reverse proxies, and environment configurations unify development and production deployments.",
    examples: `// Full-stack data fetching with authentication and loading state
export function StudentProfileView({ studentId }: { studentId: string }) {
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = await getAuthToken();
        const res = await fetch(\`/api/students/\${studentId}\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        });
        if (!res.ok) throw new Error("Could not load profile");
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  return <h1>{profile?.name}</h1>;
}`,
    commonMistakes: "Hardcoding localhost URLs in frontend API calls; leaking server credentials into frontend build bundles; not handling network error states or loading indicators gracefully; mismatching data schemas between client and server.",
    active: true,
    order: 1,
    prerequisiteTopicId: "topic-express-fundamentals",
  },
];
