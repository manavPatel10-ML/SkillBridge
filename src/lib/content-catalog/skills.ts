/**
 * skills.ts
 * Standardized Skills Inventory for SkillBridge Initial Learning Catalog.
 */

export interface CatalogSkill {
  id: string;
  name: string;
  category: string;
  description: string;
  active: boolean;
}

export const CATALOG_SKILLS: CatalogSkill[] = [
  {
    id: "html-css",
    name: "HTML & CSS",
    category: "Frontend Web Development",
    description: "Foundational markup, semantic web elements, modern CSS layouts (Flexbox, Grid), responsive design, and CSS styling.",
    active: true,
  },
  {
    id: "javascript",
    name: "JavaScript",
    category: "Programming Languages",
    description: "Core JavaScript programming, control flow, functions, asynchronous programming, DOM manipulation, and Web APIs.",
    active: true,
  },
  {
    id: "git-github",
    name: "Git & Version Control",
    category: "Developer Tools",
    description: "Version control fundamentals with Git, repository management, commits, branching strategies, and collaboration workflows on GitHub.",
    active: true,
  },
  {
    id: "react",
    name: "React",
    category: "Frontend Frameworks",
    description: "Component-driven UI engineering with React, JSX syntax, props, state management, standard hooks, side effects, and component lifecycle.",
    active: true,
  },
  {
    id: "computer-networks",
    name: "Networking & HTTP",
    category: "Core Computer Science",
    description: "Web protocol fundamentals, HTTP request-response lifecycle, status codes, headers, methods, DNS, and secure transport.",
    active: true,
  },
  {
    id: "nodejs",
    name: "Node.js & Express",
    category: "Backend Development",
    description: "Server-side JavaScript runtime with Node.js, asynchronous I/O, event loop, modules, npm, and Express.js routing and middleware.",
    active: true,
  },
  {
    id: "sql",
    name: "SQL & Databases",
    category: "Database Systems",
    description: "Relational database concepts, schema design, normalization, CRUD operations, joins, aggregations, transactions, and indexing.",
    active: true,
  },
  {
    id: "rest-apis",
    name: "REST API Architecture",
    category: "Backend Development",
    description: "Designing, building, and securing RESTful Web APIs, resource modeling, request validation, error formatting, and API contracts.",
    active: true,
  },
  {
    id: "auth-security",
    name: "Authentication & Web Security",
    category: "Backend Development",
    description: "Identity management, password hashing with bcrypt, session tokens, JWTs, role-based access control, and defense against common vulnerabilities.",
    active: true,
  },
  {
    id: "fullstack-integration",
    name: "Full Stack Integration",
    category: "Full Stack Development",
    description: "End-to-end web application integration connecting React frontends with Node/Express backends, persistent databases, and secure authentication.",
    active: true,
  },
];
