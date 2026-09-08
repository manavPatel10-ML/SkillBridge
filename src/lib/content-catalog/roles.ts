/**
 * roles.ts
 * Standardized Role & Career Path Definitions for SkillBridge Initial Learning Catalog.
 */

export interface CatalogRole {
  id: string;
  title: string;
  description: string;
  requiredSkillIds: string[];
  active: boolean;
}

export const CATALOG_ROLES: CatalogRole[] = [
  {
    id: "frontend-developer",
    title: "Frontend Developer",
    description: "Engineer modern, responsive, and interactive user interfaces using HTML, CSS, JavaScript, Web APIs, Git, and React.",
    requiredSkillIds: [
      "html-css",
      "javascript",
      "git-github",
      "react",
    ],
    active: true,
  },
  {
    id: "backend-developer",
    title: "Backend Developer",
    description: "Build scalable, performant server applications, RESTful APIs, database persistence layers, and secure authentication services using Node.js, Express, and SQL.",
    requiredSkillIds: [
      "computer-networks",
      "javascript",
      "nodejs",
      "sql",
      "rest-apis",
      "auth-security",
    ],
    active: true,
  },
  {
    id: "fullstack-developer",
    title: "Full Stack Developer",
    description: "Master end-to-end web engineering, bridging responsive frontend user interfaces, robust REST APIs, relational databases, secure authentication, and seamless full-stack integration.",
    requiredSkillIds: [
      "html-css",
      "javascript",
      "react",
      "nodejs",
      "sql",
      "rest-apis",
      "auth-security",
      "fullstack-integration",
    ],
    active: true,
  },
];
