/**
 * practice-problems.ts
 * 128 Curated Practice Problems (80 Beginner, 48 Intermediate)
 * covering all 16 Major Learning Topics with automated test cases.
 */

export interface CatalogTestCase {
  id: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  order: number;
}

export interface CatalogPracticeProblem {
  id: string;
  skillId: string;
  topic: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  expectedOutput: string;
  allowedLanguages: string[];
  active: boolean;
  testCases: CatalogTestCase[];
}

// Helper to generate consistent problem records
function createProblem(
  id: string,
  skillId: string,
  topic: string,
  title: string,
  difficulty: 'beginner' | 'intermediate',
  description: string,
  input1: string,
  output1: string,
  input2: string,
  output2: string,
  constraints: string[] = ["Time limit: 2000ms", "Standard console output"]
): CatalogPracticeProblem {
  return {
    id,
    skillId,
    topic,
    title,
    difficulty,
    description,
    examples: [
      { input: input1, output: output1, explanation: `Given input "${input1}", output should be "${output1}"` }
    ],
    constraints,
    expectedOutput: output1,
    allowedLanguages: ["javascript", "python"],
    active: true,
    testCases: [
      {
        id: `${id}-tc1`,
        problemId: id,
        input: input1,
        expectedOutput: output1,
        isHidden: false,
        order: 1
      },
      {
        id: `${id}-tc2`,
        problemId: id,
        input: input2,
        expectedOutput: output2,
        isHidden: true,
        order: 2
      }
    ]
  };
}

export const CATALOG_PRACTICE_PROBLEMS: CatalogPracticeProblem[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. HTML Fundamentals (skill: html-css, topic: html-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-html-01", "html-css", "html-fundamentals",
    "Format HTML Paragraph Tag", "beginner",
    "Write a program that takes a string of text and outputs it wrapped inside standard HTML paragraph <p> and </p> tags.",
    "Hello World", "<p>Hello World</p>",
    "SkillBridge Platform", "<p>SkillBridge Platform</p>"
  ),
  createProblem(
    "prob-html-02", "html-css", "html-fundamentals",
    "Generate HTML Hyperlink", "beginner",
    "Given a URL and anchor label separated by a comma (e.g. 'https://skillbridge.dev,Home'), print the corresponding HTML anchor tag '<a href=\"URL\">Label</a>'.",
    "https://skillbridge.dev,Home", "<a href=\"https://skillbridge.dev\">Home</a>",
    "https://google.com,Search", "<a href=\"https://google.com\">Search</a>"
  ),
  createProblem(
    "prob-html-03", "html-css", "html-fundamentals",
    "Validate Image Tag Attributes", "beginner",
    "Given an image source URL and alt text separated by a comma, format the accessible self-closing <img> tag: '<img src=\"URL\" alt=\"ALT\" />'.",
    "/logo.png,SkillBridge Logo", "<img src=\"/logo.png\" alt=\"SkillBridge Logo\" />",
    "/avatar.jpg,User Avatar", "<img src=\"/avatar.jpg\" alt=\"User Avatar\" />"
  ),
  createProblem(
    "prob-html-04", "html-css", "html-fundamentals",
    "Construct Unordered List Items", "beginner",
    "Given a comma-separated list of items (e.g. 'HTML,CSS,JS'), output each item wrapped in <li> tags, separated by a newline.",
    "HTML,CSS,JS", "<li>HTML</li>\n<li>CSS</li>\n<li>JS</li>",
    "React,Node", "<li>React</li>\n<li>Node</li>"
  ),
  createProblem(
    "prob-html-05", "html-css", "html-fundamentals",
    "Semantic Heading Hierarchy", "beginner",
    "Given a heading level integer (1 to 6) and title text separated by a space (e.g. '1 Introduction'), output the correct heading tag (e.g. '<h1>Introduction</h1>').",
    "1 Welcome to SkillBridge", "<h1>Welcome to SkillBridge</h1>",
    "3 Chapter Details", "<h3>Chapter Details</h3>"
  ),
  // Intermediate (3)
  createProblem(
    "prob-html-06", "html-css", "html-fundamentals",
    "Sanitize HTML Entities", "intermediate",
    "Given a raw text string that may contain special characters like '<', '>', and '&', escape them into '&lt;', '&gt;', and '&amp;' to prevent XSS injection.",
    "5 > 3 & 2 < 4", "5 &gt; 3 &amp; 2 &lt; 4",
    "<script>alert(1)</script>", "&lt;script&gt;alert(1)&lt;/script&gt;"
  ),
  createProblem(
    "prob-html-07", "html-css", "html-fundamentals",
    "Generate Accessible Form Input", "intermediate",
    "Given an input ID, label text, and input type formatted as 'id|Label|type', generate the accessible HTML label and input pair with for/id pairing.",
    "email|Student Email|email", "<label for=\"email\">Student Email</label>\n<input id=\"email\" name=\"email\" type=\"email\" />",
    "pass|Password|password", "<label for=\"pass\">Password</label>\n<input id=\"pass\" name=\"pass\" type=\"password\" />"
  ),
  createProblem(
    "prob-html-08", "html-css", "html-fundamentals",
    "Extract Semantic Main Content", "intermediate",
    "Given an HTML string containing an article with tags, write a parser that strips outer wrapper tags and returns the inner content trimmed.",
    "<main><article><p>Crucial insight</p></article></main>", "<p>Crucial insight</p>",
    "<main><section>Content block</section></main>", "<section>Content block</section>"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CSS Fundamentals (skill: html-css, topic: css-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-css-01", "html-css", "css-fundamentals",
    "Calculate Box Model Total Width", "beginner",
    "Given content width, horizontal padding, and horizontal border width formatted as 'width,padding,border' in pixels, calculate the total outer width under content-box (width + 2*padding + 2*border).",
    "300,20,2", "344px",
    "200,10,5", "230px"
  ),
  createProblem(
    "prob-css-02", "html-css", "css-fundamentals",
    "Convert Hex Color to RGB", "beginner",
    "Given a 6-digit hexadecimal color string (e.g. '#3b82f6'), convert it to standard CSS 'rgb(R, G, B)' string notation.",
    "#3b82f6", "rgb(59, 130, 246)",
    "#ffffff", "rgb(255, 255, 255)"
  ),
  createProblem(
    "prob-css-03", "html-css", "css-fundamentals",
    "Format CSS Class Selector", "beginner",
    "Given a kebab-case class name and a property-value pair separated by '|' (e.g. 'card-header|color: #1e293b'), output the formatted CSS declaration rule block.",
    "btn-primary|background-color: #2563eb", ".btn-primary {\n  background-color: #2563eb;\n}",
    "card-title|font-weight: 700", ".card-title {\n  font-weight: 700;\n}"
  ),
  createProblem(
    "prob-css-04", "html-css", "css-fundamentals",
    "Parse Rem to Pixels", "beginner",
    "Assuming a base font size of 16px, given a rem value float (e.g. '1.5rem'), calculate and return the equivalent pixel value (e.g. '24px').",
    "1.5rem", "24px",
    "2.25rem", "36px"
  ),
  createProblem(
    "prob-css-05", "html-css", "css-fundamentals",
    "Flexbox Justify Content Mapper", "beginner",
    "Given an alignment shorthand string ('start', 'center', 'end', 'between', 'around'), return the full CSS justify-content declaration.",
    "center", "justify-content: center;",
    "between", "justify-content: space-between;"
  ),
  // Intermediate (3)
  createProblem(
    "prob-css-06", "html-css", "css-fundamentals",
    "CSS Specificity Calculator", "intermediate",
    "Given a CSS selector string, calculate its specificity score formatted as (Inline, IDs, Classes/Attributes, Elements). For example, '#nav .link' has 1 ID, 1 Class, 0 Elements -> '0,1,1,0'.",
    "#nav .active", "0,1,1,0",
    "ul.menu li.item a", "0,0,2,3"
  ),
  createProblem(
    "prob-css-07", "html-css", "css-fundamentals",
    "Generate Responsive Media Query Block", "intermediate",
    "Given a breakpoint pixel number and a CSS rule string separated by '|' (e.g. '768|.sidebar { display: none; }'), format the full @media (min-width: Xpx) block.",
    "768|.sidebar { display: block; }", "@media (min-width: 768px) {\n  .sidebar { display: block; }\n}",
    "1024|.grid { columns: 4; }", "@media (min-width: 1024px) {\n  .grid { columns: 4; }\n}"
  ),
  createProblem(
    "prob-css-08", "html-css", "css-fundamentals",
    "CSS Grid Column Track Expander", "intermediate",
    "Given a repeat shorthand string like 'repeat(3, 1fr)' or 'repeat(2, 200px)', expand it to its full space-separated list of track sizes (e.g. '1fr 1fr 1fr').",
    "repeat(3, 1fr)", "1fr 1fr 1fr",
    "repeat(4, 100px)", "100px 100px 100px 100px"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 3. JavaScript Fundamentals (skill: javascript, topic: js-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-js-01", "javascript", "js-fundamentals",
    "Reverse a String", "beginner",
    "Write a program that takes a string input and prints the reversed string to console.",
    "skillbridge", "egdirblliks",
    "javascript", "tpircsavaj"
  ),
  createProblem(
    "prob-js-02", "javascript", "js-fundamentals",
    "Filter Even Numbers", "beginner",
    "Given a comma-separated list of integers, filter and print only the even numbers separated by commas.",
    "1,2,3,4,5,6,7,8", "2,4,6,8",
    "11,13,18,20", "18,20"
  ),
  createProblem(
    "prob-js-03", "javascript", "js-fundamentals",
    "Check Palindrome String", "beginner",
    "Given a word string, check if it is a palindrome (reads identical forwards and backwards, ignoring case). Print 'true' or 'false'.",
    "Racecar", "true",
    "Frontend", "false"
  ),
  createProblem(
    "prob-js-04", "javascript", "js-fundamentals",
    "Calculate Factorial", "beginner",
    "Given a non-negative integer n, compute and print its factorial (n!).",
    "5", "120",
    "6", "720"
  ),
  createProblem(
    "prob-js-05", "javascript", "js-fundamentals",
    "Find Maximum in Number Array", "beginner",
    "Given a comma-separated list of integers, find and print the maximum number in the list.",
    "12,45,7,89,23,56", "89",
    "-10,-5,-20,-1", "-1"
  ),
  // Intermediate (3)
  createProblem(
    "prob-js-06", "javascript", "js-fundamentals",
    "Group By Frequency Counter", "intermediate",
    "Given a comma-separated string of words, count the frequency of each distinct word and output them sorted alphabetically in format 'word:count' line by line.",
    "apple,banana,apple,orange,banana,apple", "apple:3\nbanana:2\norange:1",
    "cat,dog,cat,cat", "cat:3\ndog:1"
  ),
  createProblem(
    "prob-js-07", "javascript", "js-fundamentals",
    "Deep Flatten Nested Array String", "intermediate",
    "Given a JSON string representation of an arbitrarily nested array of integers (e.g. '[1, [2, [3, 4], 5]]'), flatten it into a single-level comma-separated list of integers.",
    "[1, [2, [3, 4], 5]]", "1,2,3,4,5",
    "[[1, 2], [3, [4, 5]]]", "1,2,3,4,5"
  ),
  createProblem(
    "prob-js-08", "javascript", "js-fundamentals",
    "Validate Balanced Parentheses", "intermediate",
    "Given a string containing parentheses '(', ')', brackets '[', ']', and braces '{', '}', determine if the input string is valid (brackets close in the correct order). Print 'true' or 'false'.",
    "{[()]}", "true",
    "{[(])}", "false"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DOM and Events (skill: javascript, topic: dom-events)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-dom-01", "javascript", "dom-events",
    "Format Document Query Selector", "beginner",
    "Given an element type and ID separated by '#', generate the standard document.querySelector JavaScript code line.",
    "button#submit-btn", "document.querySelector(\"button#submit-btn\");",
    "div#app", "document.querySelector(\"div#app\");"
  ),
  createProblem(
    "prob-dom-02", "javascript", "dom-events",
    "Generate Event Listener Code", "beginner",
    "Given an element variable name, event name, and callback function name separated by '|' (e.g. 'btn|click|handleClick'), output the addEventListener statement.",
    "btn|click|handleClick", "btn.addEventListener(\"click\", handleClick);",
    "inputField|change|validateInput", "inputField.addEventListener(\"change\", validateInput);"
  ),
  createProblem(
    "prob-dom-03", "javascript", "dom-events",
    "Format classList Add and Remove", "beginner",
    "Given a variable name, class to remove, and class to add separated by comma ('element,old-class,new-class'), output the chain of classList operations.",
    "card,hidden,visible", "card.classList.remove(\"hidden\");\ncard.classList.add(\"visible\");",
    "modal,inactive,active", "modal.classList.remove(\"inactive\");\nmodal.classList.add(\"active\");"
  ),
  createProblem(
    "prob-dom-04", "javascript", "dom-events",
    "DOM Attribute Setter Formatter", "beginner",
    "Given an element variable, attribute name, and value separated by '|' (e.g. 'img|src|/banner.png'), format the setAttribute statement.",
    "link|href|https://skillbridge.dev", "link.setAttribute(\"href\", \"https://skillbridge.dev\");",
    "btn|disabled|true", "btn.setAttribute(\"disabled\", \"true\");"
  ),
  createProblem(
    "prob-dom-05", "javascript", "dom-events",
    "Create and Append Element Script", "beginner",
    "Given a tag name and text content separated by '|' (e.g. 'p|Hello World'), generate the JavaScript code to createElement, set textContent, and append to parent 'container'.",
    "p|Welcome Student", "const el = document.createElement(\"p\");\nel.textContent = \"Welcome Student\";\ncontainer.appendChild(el);",
    "li|Task item", "const el = document.createElement(\"li\");\nel.textContent = \"Task item\";\ncontainer.appendChild(el);"
  ),
  // Intermediate (3)
  createProblem(
    "prob-dom-06", "javascript", "dom-events",
    "Event Delegation Handler Generator", "intermediate",
    "Given a parent ID, child class selector, and action function name separated by '|' ('list|item-delete|handleDelete'), generate an event delegation listener checking event.target.closest.",
    "todoList|delete-btn|removeTodo", "document.querySelector(\"#todoList\").addEventListener(\"click\", (e) => {\n  const target = e.target.closest(\".delete-btn\");\n  if (target) removeTodo(target);\n});",
    "gallery|thumbnail|showModal", "document.querySelector(\"#gallery\").addEventListener(\"click\", (e) => {\n  const target = e.target.closest(\".thumbnail\");\n  if (target) showModal(target);\n});"
  ),
  createProblem(
    "prob-dom-07", "javascript", "dom-events",
    "DOM Tree Traversal Node Counter", "intermediate",
    "Given a JSON representation of a simplified DOM tree where each node has 'tag' and 'children' array, write a program that counts the total number of HTML nodes in the tree.",
    "{\"tag\":\"div\",\"children\":[{\"tag\":\"p\",\"children\":[]},{\"tag\":\"ul\",\"children\":[{\"tag\":\"li\",\"children\":[]}]}]}", "4",
    "{\"tag\":\"main\",\"children\":[{\"tag\":\"h1\",\"children\":[]}]}", "2"
  ),
  createProblem(
    "prob-dom-08", "javascript", "dom-events",
    "Debounce Timer Calculator", "intermediate",
    "Given an array of simulated event timestamps in ms and a debounce delay of 300ms, determine which timestamps actually trigger the debounced function (only events where no subsequent event occurs within 300ms, plus the final event).",
    "100,200,600,650,1100", "200,650,1100",
    "0,150,300,700", "300,700"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Web APIs / Fetch (skill: javascript, topic: web-apis-fetch)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-fetch-01", "javascript", "web-apis-fetch",
    "Parse URL Query Parameters", "beginner",
    "Given a URL string containing query parameters (e.g. 'https://example.com/search?role=student&page=2'), extract and print the value of parameter 'role'.",
    "https://example.com/search?role=student&page=2", "student",
    "https://api.skillbridge.dev/jobs?role=engineer", "engineer"
  ),
  createProblem(
    "prob-fetch-02", "javascript", "web-apis-fetch",
    "Construct Fetch Options Header", "beginner",
    "Given a bearer token string (e.g. 'xyz123'), generate the JSON string for the standard Authorization header object.",
    "xyz123", "{\"Authorization\":\"Bearer xyz123\"}",
    "token_abc_789", "{\"Authorization\":\"Bearer token_abc_789\"}"
  ),
  createProblem(
    "prob-fetch-03", "javascript", "web-apis-fetch",
    "Validate HTTP Response Ok Flag", "beginner",
    "Given an HTTP status code integer, determine if 'response.ok' would be true (status between 200 and 299 inclusive). Print 'true' or 'false'.",
    "200", "true",
    "404", "false"
  ),
  createProblem(
    "prob-fetch-04", "javascript", "web-apis-fetch",
    "JSON Stringify and Parse Roundtrip", "beginner",
    "Given a JSON string with user keys 'id' and 'name', parse it and output 'User: [name] (ID: [id])'.",
    "{\"id\":101,\"name\":\"Maya Lin\"}", "User: Maya Lin (ID: 101)",
    "{\"id\":202,\"name\":\"Carlos Ray\"}", "User: Carlos Ray (ID: 202)"
  ),
  createProblem(
    "prob-fetch-05", "javascript", "web-apis-fetch",
    "Construct POST Fetch Request Object", "beginner",
    "Given an endpoint URL and JSON payload string, format the standard fetch(url, { method: 'POST', ... }) declaration string.",
    "https://api.dev/data|{\"val\":1}", "fetch(\"https://api.dev/data\", { method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: '{\"val\":1}' });",
    "https://api.dev/users|{\"name\":\"Sam\"}", "fetch(\"https://api.dev/users\", { method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: '{\"name\":\"Sam\"}' });"
  ),
  // Intermediate (3)
  createProblem(
    "prob-fetch-06", "javascript", "web-apis-fetch",
    "Simulate Promise.all Aggregation", "intermediate",
    "Given two simulated API responses as JSON arrays of integers separated by '|' (e.g. '[1, 2]|[3, 4]'), write a function that merges both arrays and returns the combined sorted array.",
    "[1, 4, 2]|[5, 3]", "1,2,3,4,5",
    "[10, 30]|[20, 40]", "10,20,30,40"
  ),
  createProblem(
    "prob-fetch-07", "javascript", "web-apis-fetch",
    "API Retry Backoff Sequence Calculator", "intermediate",
    "Given initial delay in ms (e.g. 100) and max retries (e.g. 4), compute exponential backoff delays with formula (initial * 2^(attempt-1)) and print them comma-separated.",
    "100,4", "100,200,400,800",
    "250,3", "250,500,1000"
  ),
  createProblem(
    "prob-fetch-08", "javascript", "web-apis-fetch",
    "Parse Pagination Link Header", "intermediate",
    "Given a standard RFC 5988 Link header string like '<https://api.dev/items?page=3>; rel=\"next\"', extract and print just the target URL.",
    "<https://api.dev/items?page=3>; rel=\"next\"", "https://api.dev/items?page=3",
    "<https://skillbridge.dev/api/feed?cursor=abc>; rel=\"next\"", "https://skillbridge.dev/api/feed?cursor=abc"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Git and GitHub Fundamentals (skill: git-github, topic: git-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-git-01", "git-github", "git-fundamentals",
    "Format Git Commit Message", "beginner",
    "Given a conventional commit type (feat, fix, docs) and description separated by '|', format the standard commit command 'git commit -m \"type: description\"'.",
    "feat|add student profile page", "git commit -m \"feat: add student profile page\"",
    "fix|correct score calculation bug", "git commit -m \"fix: correct score calculation bug\""
  ),
  createProblem(
    "prob-git-02", "git-github", "git-fundamentals",
    "Branch Checkout Command Formatter", "beginner",
    "Given a new branch name, format the command to create and switch to that branch ('git checkout -b <branch>').",
    "feature/auth-hardening", "git checkout -b feature/auth-hardening",
    "fix/cors-headers", "git checkout -b fix/cors-headers"
  ),
  createProblem(
    "prob-git-03", "git-github", "git-fundamentals",
    "Git Status Analyzer", "beginner",
    "Given a status character ('M' for Modified, 'A' for Added, 'D' for Deleted, '?' for Untracked) and filename separated by space, output the human-readable explanation.",
    "M src/App.tsx", "Modified: src/App.tsx",
    "A src/types.ts", "Added: src/types.ts"
  ),
  createProblem(
    "prob-git-04", "git-github", "git-fundamentals",
    "Format Remote Push Command", "beginner",
    "Given a remote name and branch name separated by space, format the standard upstream tracking push command ('git push -u <remote> <branch>').",
    "origin main", "git push -u origin main",
    "origin feature/login", "git push -u origin feature/login"
  ),
  createProblem(
    "prob-git-05", "git-github", "git-fundamentals",
    "Generate .gitignore Entry Pattern", "beginner",
    "Given an environment name or folder (e.g. 'node_modules', '.env'), format the standard .gitignore directory or file exclusion pattern.",
    "node_modules", "node_modules/",
    ".env.local", ".env.local"
  ),
  // Intermediate (3)
  createProblem(
    "prob-git-06", "git-github", "git-fundamentals",
    "Detect Merge Conflict Markers", "intermediate",
    "Given a multi-line string containing code with Git merge markers ('<<<<<<< HEAD', '=======', '>>>>>>> branch'), extract the branch name that was being merged.",
    "<<<<<<< HEAD\nconst port = 3000;\n=======\nconst port = 8080;\n>>>>>>> feature/port-config", "feature/port-config",
    "<<<<<<< HEAD\nconsole.log(1);\n=======\nconsole.log(2);\n>>>>>>> hotfix/log-clean", "hotfix/log-clean"
  ),
  createProblem(
    "prob-git-07", "git-github", "git-fundamentals",
    "Parse Git Log Short Commit Hash", "intermediate",
    "Given a 40-character SHA-1 Git commit hash string, extract and return its standard 7-character abbreviated short hash.",
    "2fa13a48e7182937401bcae47589201948572019", "2fa13a4",
    "f166792abcde1234567890abcdef1234567890ab", "f166792"
  ),
  createProblem(
    "prob-git-08", "git-github", "git-fundamentals",
    "Simulate Fast-Forward Branch Check", "intermediate",
    "Given parent commit and head commit IDs for main and feature branch formatted as 'main:A-B-C|feature:A-B-C-D', determine if feature can fast-forward onto main. Print 'FAST_FORWARD' or 'MERGE_COMMIT_REQUIRED'.",
    "main:A-B-C|feature:A-B-C-D", "FAST_FORWARD",
    "main:A-B-C-E|feature:A-B-C-D", "MERGE_COMMIT_REQUIRED"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 7. React Fundamentals (skill: react, topic: react-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-react-01", "react", "react-fundamentals",
    "JSX Component Prop Formatter", "beginner",
    "Given a component name, prop name, and string value formatted as 'Component|prop|value', generate the JSX invocation string '<Component prop=\"value\" />'.",
    "Avatar|user|Alex Rivera", "<Avatar user=\"Alex Rivera\" />",
    "Badge|variant|success", "<Badge variant=\"success\" />"
  ),
  createProblem(
    "prob-react-02", "react", "react-fundamentals",
    "Format useState Declaration Hook", "beginner",
    "Given a state variable name (e.g. 'count') and initial value (e.g. '0'), generate the standard React useState hook line 'const [count, setCount] = useState(0);'.",
    "count,0", "const [count, setCount] = useState(0);",
    "isOpen,false", "const [isOpen, setIsOpen] = useState(false);"
  ),
  createProblem(
    "prob-react-03", "react", "react-fundamentals",
    "Conditional Rendering Guard", "beginner",
    "Given a condition boolean string ('true' or 'false') and message, return the JSX expression output of condition && message.",
    "true,Welcome back!", "Welcome back!",
    "false,Welcome back!", ""
  ),
  createProblem(
    "prob-react-04", "react", "react-fundamentals",
    "Render Key Prop Formatter", "beginner",
    "Given an item array index and entity ID, format the React list key prop string: 'key={item-ID}'.",
    "101", "key=\"item-101\"",
    "std_42", "key=\"item-std_42\""
  ),
  createProblem(
    "prob-react-05", "react", "react-fundamentals",
    "Format Functional Component Skeleton", "beginner",
    "Given a PascalCase component name, output the standard TypeScript functional component skeleton.",
    "UserProfile", "export function UserProfile() {\n  return <div>UserProfile</div>;\n}",
    "Navbar", "export function Navbar() {\n  return <div>Navbar</div>;\n}"
  ),
  // Intermediate (3)
  createProblem(
    "prob-react-06", "react", "react-fundamentals",
    "Immutable State Array Append", "intermediate",
    "Given a JSON array of items and a new item to append, write a pure function that returns the new array with the item added without mutating original array.",
    "[\"Task 1\",\"Task 2\"]|\"Task 3\"", "[\"Task 1\",\"Task 2\",\"Task 3\"]",
    "[1,2]|[3]", "[1,2,3]"
  ),
  createProblem(
    "prob-react-07", "react", "react-fundamentals",
    "Reducer Action Dispatch Simulator", "intermediate",
    "Given current state number and action object string formatted as 'count|{\"type\":\"INCREMENT\",\"by\":5}', compute and print the next state.",
    "10|{\"type\":\"INCREMENT\",\"by\":5}", "15",
    "20|{\"type\":\"DECREMENT\",\"by\":4}", "16"
  ),
  createProblem(
    "prob-react-08", "react", "react-fundamentals",
    "Custom Hook Dependency Extractor", "intermediate",
    "Given a comma-separated list of variable names referenced in an effect, remove duplicates and return the formatted dependency array string '[var1, var2]'.",
    "studentId,courseId,studentId", "[courseId, studentId]",
    "token,page,token,page", "[page, token]"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Programming Fundamentals (skill: javascript, topic: programming-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-prog-01", "javascript", "programming-fundamentals",
    "Binary Search Implementation", "beginner",
    "Given a sorted comma-separated list of integers and a target integer separated by '|' (e.g. '1,3,5,7,9|5'), return the 0-based index of target, or -1 if not found.",
    "1,3,5,7,9|5", "2",
    "2,4,6,8,10|7", "-1"
  ),
  createProblem(
    "prob-prog-02", "javascript", "programming-fundamentals",
    "Stack Implementation (LIFO)", "beginner",
    "Given a sequence of 'PUSH:x' and 'POP' commands separated by comma, process the stack and output the remaining items bottom-to-top as a comma-separated list.",
    "PUSH:1,PUSH:2,POP,PUSH:3", "1,3",
    "PUSH:A,PUSH:B,POP,POP,PUSH:C", "C"
  ),
  createProblem(
    "prob-prog-03", "javascript", "programming-fundamentals",
    "Queue Implementation (FIFO)", "beginner",
    "Given a sequence of 'ENQUEUE:x' and 'DEQUEUE' commands separated by comma, process the queue and output the remaining items front-to-back as comma-separated values.",
    "ENQUEUE:10,ENQUEUE:20,DEQUEUE,ENQUEUE:30", "20,30",
    "ENQUEUE:A,DEQUEUE,ENQUEUE:B,ENQUEUE:C", "B,C"
  ),
  createProblem(
    "prob-prog-04", "javascript", "programming-fundamentals",
    "Fibonacci Number Computation", "beginner",
    "Given an integer n (0 <= n <= 25), calculate the n-th Fibonacci number where Fib(0) = 0 and Fib(1) = 1.",
    "7", "13",
    "10", "55"
  ),
  createProblem(
    "prob-prog-05", "javascript", "programming-fundamentals",
    "Find Duplicate Number in Array", "beginner",
    "Given a comma-separated list of integers containing exactly one duplicate number, find and return that duplicate integer.",
    "1,3,4,2,2", "2",
    "5,1,3,4,5,2", "5"
  ),
  // Intermediate (3)
  createProblem(
    "prob-prog-06", "javascript", "programming-fundamentals",
    "Longest Substring Without Repeating Characters", "intermediate",
    "Given a string, find the length of the longest substring without repeating characters.",
    "abcabcbb", "3",
    "bbbbb", "1"
  ),
  createProblem(
    "prob-prog-07", "javascript", "programming-fundamentals",
    "Merge Two Sorted Lists", "intermediate",
    "Given two sorted comma-separated lists of numbers separated by '|', merge them into a single sorted list.",
    "1,3,5|2,4,6", "1,2,3,4,5,6",
    "10,20|5,15,25", "5,10,15,20,25"
  ),
  createProblem(
    "prob-prog-08", "javascript", "programming-fundamentals",
    "Maximum Subarray Sum (Kadane's)", "intermediate",
    "Given a comma-separated list of integers (which may include negative numbers), find the maximum sum of a contiguous subarray.",
    "-2,1,-3,4,-1,2,1,-5,4", "6",
    "1,2,3,4", "10"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 9. HTTP Fundamentals (skill: computer-networks, topic: http-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-http-01", "computer-networks", "http-fundamentals",
    "Identify Status Code Category", "beginner",
    "Given an HTTP status code integer (e.g. 200, 404, 503), print its category ('2xx Success', '3xx Redirection', '4xx Client Error', '5xx Server Error').",
    "404", "4xx Client Error",
    "500", "5xx Server Error"
  ),
  createProblem(
    "prob-http-02", "computer-networks", "http-fundamentals",
    "Map HTTP Verb to CRUD Operation", "beginner",
    "Given an HTTP method ('GET', 'POST', 'PUT', 'DELETE', 'PATCH'), output its primary CRUD equivalent ('Read', 'Create', 'Replace', 'Delete', 'Update').",
    "POST", "Create",
    "DELETE", "Delete"
  ),
  createProblem(
    "prob-http-03", "computer-networks", "http-fundamentals",
    "Extract Content-Type MIME Type", "beginner",
    "Given a full Content-Type header string (e.g. 'application/json; charset=utf-8'), extract and return only the primary MIME type (e.g. 'application/json').",
    "application/json; charset=utf-8", "application/json",
    "text/html; charset=UTF-8", "text/html"
  ),
  createProblem(
    "prob-http-04", "computer-networks", "http-fundamentals",
    "Format Basic Auth Header", "beginner",
    "Given username and password separated by colon ('user:pass'), return the base64 encoded Basic Authorization header string 'Basic <base64>'.",
    "admin:secret", "Basic YWRtaW46c2VjcmV0",
    "student:password123", "Basic c3R1ZGVudDpwYXNzd29yZDEyMw=="
  ),
  createProblem(
    "prob-http-05", "computer-networks", "http-fundamentals",
    "Determine HTTP Method Idempotency", "beginner",
    "Given an HTTP method name in uppercase, print 'IDEMPOTENT' if repeated identical requests yield the same server state, or 'NOT_IDEMPOTENT'.",
    "GET", "IDEMPOTENT",
    "POST", "NOT_IDEMPOTENT"
  ),
  // Intermediate (3)
  createProblem(
    "prob-http-06", "computer-networks", "http-fundamentals",
    "Validate CORS Origin Header", "intermediate",
    "Given an incoming request origin and an allowed origins list formatted as 'origin|allowed1,allowed2', determine if CORS Access-Control-Allow-Origin should be granted. Print 'ALLOWED' or 'BLOCKED'.",
    "https://skillbridge.dev|https://skillbridge.dev,https://app.skillbridge.dev", "ALLOWED",
    "https://evil.com|https://skillbridge.dev", "BLOCKED"
  ),
  createProblem(
    "prob-http-07", "computer-networks", "http-fundamentals",
    "Parse Cache-Control Max-Age Header", "intermediate",
    "Given a Cache-Control directive string (e.g. 'public, max-age=3600, must-revalidate'), extract and print the max-age seconds integer (e.g. '3600').",
    "public, max-age=3600, must-revalidate", "3600",
    "private, max-age=86400", "86400"
  ),
  createProblem(
    "prob-http-08", "computer-networks", "http-fundamentals",
    "Format Set-Cookie Secure Directives", "intermediate",
    "Given a cookie name and value, output the production security hardened Set-Cookie header with 'HttpOnly; Secure; SameSite=Strict'.",
    "sessionId=xyz987", "Set-Cookie: sessionId=xyz987; HttpOnly; Secure; SameSite=Strict; Path=/",
    "authToken=token456", "Set-Cookie: authToken=token456; HttpOnly; Secure; SameSite=Strict; Path=/"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 10. REST API Concepts (skill: rest-apis, topic: rest-api-concepts)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-rest-01", "rest-apis", "rest-api-concepts",
    "Format RESTful Resource URI", "beginner",
    "Given a resource name and ID separated by comma (e.g. 'courses,101'), format the standard RESTful resource URI ('/api/v1/courses/101').",
    "students,55", "/api/v1/students/55",
    "assessments,js-basics", "/api/v1/assessments/js-basics"
  ),
  createProblem(
    "prob-rest-02", "rest-apis", "rest-api-concepts",
    "Validate REST URL Noun vs Verb", "beginner",
    "Given an API path string (e.g. '/api/getStudents' or '/api/students'), determine if it violates REST noun conventions by using verbs like get, create, delete, or update. Print 'REST_VALID' or 'VIOLATION'.",
    "/api/students", "REST_VALID",
    "/api/getStudents", "VIOLATION"
  ),
  createProblem(
    "prob-rest-03", "rest-apis", "rest-api-concepts",
    "Select Correct REST Status Code", "beginner",
    "Given an API operation scenario ('resource_created', 'invalid_payload', 'not_found', 'server_crash'), return the appropriate HTTP status code.",
    "resource_created", "201",
    "invalid_payload", "400"
  ),
  createProblem(
    "prob-rest-04", "rest-apis", "rest-api-concepts",
    "Format Standard JSON Success Envelope", "beginner",
    "Given a key-value pair separated by colon (e.g. 'status:active'), format the standard API JSON envelope '{\"success\":true,\"data\":{\"status\":\"active\"}}'.",
    "id:101", "{\"success\":true,\"data\":{\"id\":\"101\"}}",
    "role:admin", "{\"success\":true,\"data\":{\"role\":\"admin\"}}"
  ),
  createProblem(
    "prob-rest-05", "rest-apis", "rest-api-concepts",
    "Construct Sub-Resource Nested Route", "beginner",
    "Given parent resource, parent ID, and child resource separated by '|' (e.g. 'courses|42|lessons'), output the RESTful nested URI ('/api/v1/courses/42/lessons').",
    "students|std_99|submissions", "/api/v1/students/std_99/submissions",
    "companies|cmp_1|challenges", "/api/v1/companies/cmp_1/challenges"
  ),
  // Intermediate (3)
  createProblem(
    "prob-rest-06", "rest-apis", "rest-api-concepts",
    "REST Pagination Metadata Calculator", "intermediate",
    "Given total items, page number, and page size formatted as 'total,page,pageSize' (e.g. '45,2,10'), calculate the totalPages and whether hasNext is true. Output 'totalPages:X,hasNext:Y'.",
    "45,2,10", "totalPages:5,hasNext:true",
    "50,5,10", "totalPages:5,hasNext:false"
  ),
  createProblem(
    "prob-rest-07", "rest-apis", "rest-api-concepts",
    "Idempotent PUT vs Non-Idempotent POST", "intermediate",
    "Given a batch of HTTP requests as strings, count how many are idempotent operations (GET, PUT, DELETE, HEAD).",
    "GET,POST,PUT,DELETE,POST,GET", "4",
    "POST,POST,POST", "0"
  ),
  createProblem(
    "prob-rest-08", "rest-apis", "rest-api-concepts",
    "API Field Filtering Parser", "intermediate",
    "Given a JSON string representing a student document and a comma-separated list of requested fields ('name,role'), return a new JSON containing only the requested fields.",
    "{\"id\":\"1\",\"name\":\"Sam\",\"role\":\"student\",\"secret\":\"123\"}|name,role", "{\"name\":\"Sam\",\"role\":\"student\"}",
    "{\"title\":\"Math\",\"level\":\"easy\",\"owner\":\"admin\"}|title,level", "{\"title\":\"Math\",\"level\":\"easy\"}"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Node.js Fundamentals (skill: nodejs, topic: nodejs-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-node-01", "nodejs", "nodejs-fundamentals",
    "Format Path Join in Node.js", "beginner",
    "Given two path segment strings separated by comma ('controllers,auth.ts'), format the path.join call output using forward slashes.",
    "routes,api.js", "routes/api.js",
    "src/lib,utils.ts", "src/lib/utils.ts"
  ),
  createProblem(
    "prob-node-02", "nodejs", "nodejs-fundamentals",
    "Process Environment Variable Getter", "beginner",
    "Given an env var name and fallback value separated by '|' (e.g. 'PORT|3000'), format the JavaScript expression 'process.env.PORT || \"3000\"'.",
    "PORT|3000", "process.env.PORT || \"3000\"",
    "NODE_ENV|development", "process.env.NODE_ENV || \"development\""
  ),
  createProblem(
    "prob-node-03", "nodejs", "nodejs-fundamentals",
    "Convert Buffer Hex to UTF-8", "beginner",
    "Given a hex-encoded string (e.g. '48656c6c6f'), convert it to its UTF-8 text equivalent ('Hello').",
    "48656c6c6f", "Hello",
    "536b696c6c", "Skill"
  ),
  createProblem(
    "prob-node-04", "nodejs", "nodejs-fundamentals",
    "Format CommonJS Module Export", "beginner",
    "Given a function or object name, format the CommonJS 'module.exports = <name>;' line.",
    "authMiddleware", "module.exports = authMiddleware;",
    "databasePool", "module.exports = databasePool;"
  ),
  createProblem(
    "prob-node-05", "nodejs", "nodejs-fundamentals",
    "Format ESM Named Import", "beginner",
    "Given a named export and module package path separated by '|' (e.g. 'readFile|fs/promises'), format the ESM import statement.",
    "readFile|fs/promises", "import { readFile } from \"fs/promises\";",
    "join|path", "import { join } from \"path\";"
  ),
  // Intermediate (3)
  createProblem(
    "prob-node-06", "nodejs", "nodejs-fundamentals",
    "Event Loop Phase Execution Order", "intermediate",
    "Given a snippet with process.nextTick, setTimeout(0), and Promise.resolve().then(), predict the exact console output order of the tags 'NEXT_TICK', 'PROMISE', 'TIMEOUT'.",
    "run_microtasks", "NEXT_TICK,PROMISE,TIMEOUT",
    "schedule_all", "NEXT_TICK,PROMISE,TIMEOUT"
  ),
  createProblem(
    "prob-node-07", "nodejs", "nodejs-fundamentals",
    "Stream Chunk Byte Accumulator", "intermediate",
    "Given a comma-separated list of buffer chunk sizes in bytes (e.g. '1024,2048,512'), calculate and output total KB to two decimal places.",
    "1024,2048,512", "3.50 KB",
    "4096,4096", "8.00 KB"
  ),
  createProblem(
    "prob-node-08", "nodejs", "nodejs-fundamentals",
    "Process Signal Exit Code Formatter", "intermediate",
    "Given a standard Unix termination signal ('SIGINT', 'SIGTERM', 'SIGKILL'), return the standard Node.js process exit code (128 + signal number: SIGINT=2 -> 130, SIGTERM=15 -> 143, SIGKILL=9 -> 137).",
    "SIGINT", "130",
    "SIGTERM", "143"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Express.js (skill: nodejs, topic: express-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-exp-01", "nodejs", "express-fundamentals",
    "Format Express Route Handler Skeleton", "beginner",
    "Given an HTTP method and route path separated by '|' (e.g. 'get|/api/health'), format the Express route registration call.",
    "get|/api/health", "app.get(\"/api/health\", (req, res) => {});",
    "post|/api/login", "app.post(\"/api/login\", (req, res) => {});"
  ),
  createProblem(
    "prob-exp-02", "nodejs", "express-fundamentals",
    "Extract Route Parameter", "beginner",
    "Given an Express route pattern '/users/:id/books/:bookId' and an incoming URL '/users/42/books/99', extract the value of parameter 'id'.",
    "/users/42/books/99", "42",
    "/users/100/books/5", "100"
  ),
  createProblem(
    "prob-exp-03", "nodejs", "express-fundamentals",
    "Format Express JSON Response", "beginner",
    "Given an HTTP status code and message string separated by '|' (e.g. '200|Success'), format the Express 'res.status(X).json({ message: Y })' line.",
    "200|Operation completed", "res.status(200).json({ message: \"Operation completed\" });",
    "404|Resource not found", "res.status(404).json({ message: \"Resource not found\" });"
  ),
  createProblem(
    "prob-exp-04", "nodejs", "express-fundamentals",
    "Middleware Next Invoker", "beginner",
    "Given a middleware condition boolean string ('true' or 'false'), output 'next();' if true or 'res.status(401).send();' if false.",
    "true", "next();",
    "false", "res.status(401).send();"
  ),
  createProblem(
    "prob-exp-05", "nodejs", "express-fundamentals",
    "Express Body Parser Registration", "beginner",
    "Output the standard Express 4.16+ built-in middleware registration line for parsing incoming JSON request bodies.",
    "json", "app.use(express.json());",
    "urlencoded", "app.use(express.urlencoded({ extended: true }));"
  ),
  // Intermediate (3)
  createProblem(
    "prob-exp-06", "nodejs", "express-fundamentals",
    "Centralized 4-Param Error Middleware", "intermediate",
    "Generate the exact signature and response structure of an Express error-handling middleware that catches 'err' and returns status 500 with sanitized message.",
    "error_handler", "app.use((err, req, res, next) => {\n  console.error(err);\n  res.status(500).json({ error: \"Internal server error\" });\n});",
    "custom_handler", "app.use((err, req, res, next) => {\n  console.error(err);\n  res.status(500).json({ error: \"Internal server error\" });\n});"
  ),
  createProblem(
    "prob-exp-07", "nodejs", "express-fundamentals",
    "Middleware Pipeline Simulator", "intermediate",
    "Given a chain of middleware names separated by comma and an index where an error is thrown (e.g. 'auth,validate,handler|validate'), output which middlewares execute before halting.",
    "logger,auth,handler|auth", "logger,auth",
    "cors,rateLimit,auth,controller|none", "cors,rateLimit,auth,controller"
  ),
  createProblem(
    "prob-exp-08", "nodejs", "express-fundamentals",
    "Validate Required Body Schema", "intermediate",
    "Given a JSON payload string and a comma-separated list of required fields ('email,password'), check if all required fields exist and are non-empty. Print 'VALID' or 'MISSING_FIELD'.",
    "{\"email\":\"a@b.com\",\"password\":\"12345678\"}|email,password", "VALID",
    "{\"email\":\"a@b.com\"}|email,password", "MISSING_FIELD"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Database Fundamentals (skill: sql, topic: database-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-sql-01", "sql", "database-fundamentals",
    "Write Basic SELECT Query", "beginner",
    "Given a table name and column name separated by comma ('students,email'), format the SQL query 'SELECT email FROM students;'.",
    "students,email", "SELECT email FROM students;",
    "assessments,score", "SELECT score FROM assessments;"
  ),
  createProblem(
    "prob-sql-02", "sql", "database-fundamentals",
    "Write Filtered WHERE Query", "beginner",
    "Given a table, column, and minimum value separated by comma ('scores,points,70'), format the SQL query selecting all columns where column >= value.",
    "scores,points,70", "SELECT * FROM scores WHERE points >= 70;",
    "users,age,18", "SELECT * FROM users WHERE age >= 18;"
  ),
  createProblem(
    "prob-sql-03", "sql", "database-fundamentals",
    "Write SQL INSERT Query", "beginner",
    "Given a table name, column, and value separated by '|' (e.g. 'roles|title|Frontend Developer'), format the standard SQL INSERT INTO statement.",
    "skills|name|JavaScript", "INSERT INTO skills (name) VALUES ('JavaScript');",
    "roles|title|Backend Developer", "INSERT INTO roles (title) VALUES ('Backend Developer');"
  ),
  createProblem(
    "prob-sql-04", "sql", "database-fundamentals",
    "Write SQL COUNT Aggregate Query", "beginner",
    "Given a table name, write the SQL query that counts all records aliasing the result as 'total_records'.",
    "students", "SELECT COUNT(*) AS total_records FROM students;",
    "challenges", "SELECT COUNT(*) AS total_records FROM challenges;"
  ),
  createProblem(
    "prob-sql-05", "sql", "database-fundamentals",
    "Write SQL ORDER BY and LIMIT Query", "beginner",
    "Given table name, sort column, and limit integer separated by comma ('students,score,5'), format the descending sorted query.",
    "students,score,5", "SELECT * FROM students ORDER BY score DESC LIMIT 5;",
    "products,price,10", "SELECT * FROM products ORDER BY price DESC LIMIT 10;"
  ),
  // Intermediate (3)
  createProblem(
    "prob-sql-06", "sql", "database-fundamentals",
    "Write INNER JOIN Query", "intermediate",
    "Given two table names ('students', 'submissions') and foreign key link ('student_id'), write an INNER JOIN query selecting student name and submission score.",
    "students,submissions,student_id", "SELECT students.name, submissions.score FROM students INNER JOIN submissions ON students.id = submissions.student_id;",
    "users,orders,user_id", "SELECT users.name, orders.score FROM users INNER JOIN orders ON users.id = orders.user_id;"
  ),
  createProblem(
    "prob-sql-07", "sql", "database-fundamentals",
    "Write GROUP BY with HAVING Query", "intermediate",
    "Given table 'orders', group column 'customer_id', and min sum threshold '500', format the GROUP BY with HAVING SUM(amount) >= threshold query.",
    "orders,customer_id,500", "SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id HAVING SUM(amount) >= 500;",
    "sales,rep_id,1000", "SELECT rep_id, SUM(amount) AS total FROM sales GROUP BY rep_id HAVING SUM(amount) >= 1000;"
  ),
  createProblem(
    "prob-sql-08", "sql", "database-fundamentals",
    "Detect SQL Injection Vulnerability", "intermediate",
    "Given a query string pattern, determine if it uses insecure string concatenation vs parameterized placeholder ($1 or ?). Output 'INSECURE' or 'SAFE'.",
    "SELECT * FROM users WHERE email = '\" + input + \"'", "INSECURE",
    "SELECT * FROM users WHERE email = $1", "SAFE"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Authentication Fundamentals (skill: auth-security, topic: auth-fundamentals)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-auth-01", "auth-security", "auth-fundamentals",
    "Password Minimum Length Validator", "beginner",
    "Given a password string, verify if it meets the minimum security threshold of at least 8 characters. Print 'VALID' or 'TOO_SHORT'.",
    "SkillBridge#2026", "VALID",
    "pass12", "TOO_SHORT"
  ),
  createProblem(
    "prob-auth-02", "auth-security", "auth-fundamentals",
    "Password Strength Complexity Checker", "beginner",
    "Given a password string, verify that it contains at least one uppercase letter, one lowercase letter, and one number. Print 'STRONG' or 'WEAK'.",
    "SecurePass2026", "STRONG",
    "alllowercase123", "WEAK"
  ),
  createProblem(
    "prob-auth-03", "auth-security", "auth-fundamentals",
    "Extract Bearer Token from Auth Header", "beginner",
    "Given an HTTP Authorization header string (e.g. 'Bearer eyJhbGciOi...'), extract and return only the raw token string.",
    "Bearer token_xyz_12345", "token_xyz_12345",
    "Bearer secret_abc_99", "secret_abc_99"
  ),
  createProblem(
    "prob-auth-04", "auth-security", "auth-fundamentals",
    "Format Salt Rounds Config", "beginner",
    "Output the standard recommended bcrypt salt rounds constant definition line.",
    "salt", "const SALT_ROUNDS = 12;",
    "bcrypt", "const SALT_ROUNDS = 12;"
  ),
  createProblem(
    "prob-auth-05", "auth-security", "auth-fundamentals",
    "Mask Email for Privacy Notice", "beginner",
    "Given an email address string (e.g. 'student@example.com'), mask the middle characters of the username so that only the first and last characters show ('s*****t@example.com').",
    "student@example.com", "s*****t@example.com",
    "alex@skillbridge.dev", "a**x@skillbridge.dev"
  ),
  // Intermediate (3)
  createProblem(
    "prob-auth-06", "auth-security", "auth-fundamentals",
    "JWT Expiration Validator", "intermediate",
    "Given a token expiration timestamp in epoch seconds and the current timestamp in epoch seconds separated by comma ('1700000500,1700000000'), check if the token is valid. Print 'VALID' or 'EXPIRED'.",
    "1700000500,1700000000", "VALID",
    "1700000000,1700000500", "EXPIRED"
  ),
  createProblem(
    "prob-auth-07", "auth-security", "auth-fundamentals",
    "Role-Based Access Control (RBAC) Guard", "intermediate",
    "Given user role and required endpoint roles formatted as 'userRole|allowedRole1,allowedRole2', determine if access is granted. Print 'ACCESS_GRANTED' or 'ACCESS_DENIED'.",
    "admin|admin,moderator", "ACCESS_GRANTED",
    "student|admin,recruiter", "ACCESS_DENIED"
  ),
  createProblem(
    "prob-auth-08", "auth-security", "auth-fundamentals",
    "Constant-Time String Comparison (Timing Attack Defense)", "intermediate",
    "Given two secret tokens of equal length, simulate constant-time comparison that inspects all characters without early return. Print 'MATCH' or 'MISMATCH'.",
    "secretToken123,secretToken123", "MATCH",
    "secretToken123,secretToken999", "MISMATCH"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 15. API Development (skill: rest-apis, topic: api-development)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-apidev-01", "rest-apis", "api-development",
    "Format Health Check API Response", "beginner",
    "Output the standard JSON payload returned by a production API /health endpoint with status 'healthy' and uptime in seconds.",
    "100", "{\"status\":\"healthy\",\"uptime\":100}",
    "500", "{\"status\":\"healthy\",\"uptime\":500}"
  ),
  createProblem(
    "prob-apidev-02", "rest-apis", "api-development",
    "Generate API Version Header", "beginner",
    "Given an API version string (e.g. 'v1'), format the standard 'X-API-Version' response header line.",
    "v1", "X-API-Version: v1",
    "v2.1", "X-API-Version: v2.1"
  ),
  createProblem(
    "prob-apidev-03", "rest-apis", "api-development",
    "Format Standardized Error JSON Payload", "beginner",
    "Given an error code string and message separated by '|' (e.g. 'INVALID_EMAIL|Email format is invalid'), format the JSON response object.",
    "INVALID_INPUT|Field is required", "{\"error\":{\"code\":\"INVALID_INPUT\",\"message\":\"Field is required\"}}",
    "NOT_FOUND|Item not found", "{\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"Item not found\"}}"
  ),
  createProblem(
    "prob-apidev-04", "rest-apis", "api-development",
    "Validate Content-Type Application JSON", "beginner",
    "Given a request Content-Type header string, return 'VALID' if it is or begins with 'application/json', else 'INVALID'.",
    "application/json", "VALID",
    "text/plain", "INVALID"
  ),
  createProblem(
    "prob-apidev-05", "rest-apis", "api-development",
    "Rate Limit Header Formatter", "beginner",
    "Given remaining quota integer and reset window seconds ('45,60'), format the standard 'X-RateLimit-Remaining' and 'X-RateLimit-Reset' header lines.",
    "45,60", "X-RateLimit-Remaining: 45\nX-RateLimit-Reset: 60",
    "0,120", "X-RateLimit-Remaining: 0\nX-RateLimit-Reset: 120"
  ),
  // Intermediate (3)
  createProblem(
    "prob-apidev-06", "rest-apis", "api-development",
    "Sanitize Internal Stack Trace from API Response", "intermediate",
    "Given an internal error object string containing stack traces and file paths, mask it so that in production it returns only generic 'Internal server error'.",
    "Error: ECONNREFUSED at /var/task/node_modules/db/index.js:42", "Internal server error",
    "TypeError: Cannot read properties of undefined at query.js:15", "Internal server error"
  ),
  createProblem(
    "prob-apidev-07", "rest-apis", "api-development",
    "Rate Limiter Token Bucket Decrementer", "intermediate",
    "Given current tokens integer and cost integer separated by comma ('10,3'), if tokens >= cost return remaining tokens, otherwise return -1 (rate limited).",
    "10,3", "7",
    "2,5", "-1"
  ),
  createProblem(
    "prob-apidev-08", "rest-apis", "api-development",
    "Idempotency Key Store Check", "intermediate",
    "Given an incoming Idempotency-Key and a comma-separated list of previously processed keys ('key1,key2'), print 'CACHED_RESPONSE' if key exists, else 'PROCESS_NEW'.",
    "key1|key1,key2,key3", "CACHED_RESPONSE",
    "key4|key1,key2,key3", "PROCESS_NEW"
  ),

  // ──────────────────────────────────────────────────────────────────────────
  // 16. Full Stack Integration (skill: fullstack-integration, topic: fullstack-integration)
  // ──────────────────────────────────────────────────────────────────────────
  createProblem(
    "prob-fs-01", "fullstack-integration", "fullstack-integration",
    "Format Environment-Aware API Base URL", "beginner",
    "Given an environment mode ('production' or 'development'), return the appropriate API base URL ('https://skillbridge.dev/api' vs 'http://localhost:3000/api').",
    "production", "https://skillbridge.dev/api",
    "development", "http://localhost:3000/api"
  ),
  createProblem(
    "prob-fs-02", "fullstack-integration", "fullstack-integration",
    "Format Optimistic UI Item Append", "beginner",
    "Given a current JSON array of tasks and a new task title ('[\"Task A\"]|\"Task B\"'), return the optimistic client state array with status 'pending'.",
    "[\"Task A\"]|\"Task B\"", "[{\"title\":\"Task A\",\"status\":\"saved\"},{\"title\":\"Task B\",\"status\":\"pending\"}]",
    "[]|\"First Task\"", "[{\"title\":\"First Task\",\"status\":\"pending\"}]"
  ),
  createProblem(
    "prob-fs-03", "fullstack-integration", "fullstack-integration",
    "Extract User Session from Cookie Header", "beginner",
    "Given a Cookie header string containing multiple cookies (e.g. 'theme=dark; sessionToken=abc123xyz; lang=en'), extract the sessionToken value.",
    "theme=dark; sessionToken=abc123xyz; lang=en", "abc123xyz",
    "sessionToken=sec999", "sec999"
  ),
  createProblem(
    "prob-fs-04", "fullstack-integration", "fullstack-integration",
    "Map Loading State to UI String", "beginner",
    "Given three boolean flags 'loading,error,hasData', determine the UI state string: 'LOADING', 'ERROR', 'DATA', or 'EMPTY'.",
    "true,false,false", "LOADING",
    "false,true,false", "ERROR"
  ),
  createProblem(
    "prob-fs-05", "fullstack-integration", "fullstack-integration",
    "Format CORS Preflight OPTIONS Response", "beginner",
    "Given an allowed origin URL, output the Access-Control-Allow-Origin header line for CORS preflight.",
    "https://skillbridge.dev", "Access-Control-Allow-Origin: https://skillbridge.dev",
    "http://localhost:3000", "Access-Control-Allow-Origin: http://localhost:3000"
  ),
  // Intermediate (3)
  createProblem(
    "prob-fs-06", "fullstack-integration", "fullstack-integration",
    "State Synchronization Reconciler", "intermediate",
    "Given a client-side optimistic list and a server-confirmed list of items with IDs, reconcile them by replacing pending items with confirmed items.",
    "{\"client\":[{\"id\":\"temp_1\",\"val\":\"A\"}],\"server\":[{\"id\":\"srv_1\",\"val\":\"A\"}]}", "[{\"id\":\"srv_1\",\"val\":\"A\"}]",
    "{\"client\":[],\"server\":[{\"id\":\"srv_2\",\"val\":\"B\"}]}", "[{\"id\":\"srv_2\",\"val\":\"B\"}]"
  ),
  createProblem(
    "prob-fs-07", "fullstack-integration", "fullstack-integration",
    "Full Stack Auth Flow Step Verifier", "intermediate",
    "Given an ordered sequence of full-stack auth steps ('ENTER_CREDS,POST_LOGIN,SET_COOKIE,REDIRECT_DASHBOARD'), verify if the sequence matches standard security flow. Print 'SECURE_FLOW' or 'INVALID_SEQUENCE'.",
    "ENTER_CREDS,POST_LOGIN,SET_COOKIE,REDIRECT_DASHBOARD", "SECURE_FLOW",
    "ENTER_CREDS,REDIRECT_DASHBOARD", "INVALID_SEQUENCE"
  ),
  createProblem(
    "prob-fs-08", "fullstack-integration", "fullstack-integration",
    "End-to-End Latency Budget Checker", "intermediate",
    "Given client network time, server execution time, and database query time in ms ('80,45,15'), compute total roundtrip latency and verify if it is under the 200ms budget. Print 'LATENCY:140ms (PASS)' or 'FAIL'.",
    "80,45,15", "LATENCY:140ms (PASS)",
    "120,80,30", "LATENCY:230ms (FAIL)"
  ),
];
