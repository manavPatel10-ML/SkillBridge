"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp, writeBatch, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const SKILLS = [
  { id: "python", name: "Python", category: "Programming Languages", description: "General-purpose programming language.", active: true },
  { id: "java", name: "Java", category: "Programming Languages", description: "Class-based, object-oriented programming language.", active: true },
  { id: "javascript", name: "JavaScript", category: "Programming Languages", description: "Core language of the web.", active: true },
  { id: "sql", name: "SQL", category: "Database", description: "Structured Query Language for managing databases.", active: true },
  { id: "html-css", name: "HTML & CSS", category: "Web Development", description: "Building blocks of web pages.", active: true },
  { id: "computer-networks", name: "Computer Networks", category: "Core CS", description: "Principles of networking and internet protocols.", active: true },
  { id: "data-structures", name: "Data Structures", category: "Core CS", description: "Fundamentals of storing and organizing data.", active: true },
  { id: "ml-basics", name: "Machine Learning Basics", category: "Artificial Intelligence", description: "Introductory concepts in ML.", active: true },
];

const ASSESSMENTS = [
  {
    id: "python-fundamentals",
    skillId: "python",
    title: "Python Fundamentals",
    description: "Test your basic understanding of Python syntax and core concepts.",
    difficulty: "Mixed",
    totalQuestions: 10,
    passingScore: 70,
    active: true,
  },
  {
    id: "js-fundamentals",
    skillId: "javascript",
    title: "JavaScript Fundamentals",
    description: "Assess your knowledge of core JavaScript concepts.",
    difficulty: "Mixed",
    totalQuestions: 10,
    passingScore: 70,
    active: true,
  },
  {
    id: "sql-fundamentals",
    skillId: "sql",
    title: "SQL Fundamentals",
    description: "Evaluate your understanding of basic SQL queries and database management.",
    difficulty: "Mixed",
    totalQuestions: 10,
    passingScore: 70,
    active: true,
  },
  {
    id: "html-css-fundamentals",
    skillId: "html-css",
    title: "HTML & CSS Fundamentals",
    description: "Verify your ability to structure and style web pages.",
    difficulty: "Mixed",
    totalQuestions: 10,
    passingScore: 70,
    active: true,
  },
  {
    id: "computer-networks-fundamentals",
    skillId: "computer-networks",
    title: "Computer Networks Fundamentals",
    description: "Test your understanding of core networking concepts and protocols.",
    difficulty: "Mixed",
    totalQuestions: 15,
    passingScore: 70,
    active: true,
  }
];

const QUESTIONS = {
  "python-fundamentals": [
    // Easy
    { question: "What is the output of print(2 ** 3)?", options: ["5", "6", "8", "9"], correctAnswer: "8", explanation: "The ** operator performs exponentiation. 2 to the power of 3 is 8.", difficulty: "easy", points: 10 },
    { question: "Which of these is a mutable data type in Python?", options: ["Tuple", "String", "List", "Integer"], correctAnswer: "List", explanation: "Lists can be modified after creation, making them mutable.", difficulty: "easy", points: 10 },
    { question: "How do you insert comments in Python code?", options: ["// This is a comment", "/* This is a comment */", "# This is a comment", "<!-- This is a comment -->"], correctAnswer: "# This is a comment", explanation: "Python uses the hash (#) symbol for single-line comments.", difficulty: "easy", points: 10 },
    { question: "What function is used to get the length of a list?", options: ["length()", "len()", "count()", "size()"], correctAnswer: "len()", explanation: "The len() function returns the number of items in an object.", difficulty: "easy", points: 10 },
    { question: "Which keyword is used to define a function?", options: ["def", "function", "func", "define"], correctAnswer: "def", explanation: "The 'def' keyword is used to declare a function in Python.", difficulty: "easy", points: 10 },
    { question: "What is the correct file extension for Python files?", options: [".pyt", ".pt", ".py", ".pyth"], correctAnswer: ".py", explanation: "Python scripts are saved with the .py extension.", difficulty: "easy", points: 10 },
    
    // Medium
    { question: "What does the 'yield' keyword do?", options: ["Returns a value and exits", "Pauses the function and saves state", "Throws an exception", "Ends a loop"], correctAnswer: "Pauses the function and saves state", explanation: "'yield' produces a generator, returning a value and pausing execution.", difficulty: "medium", points: 10 },
    { question: "How do you handle exceptions in Python?", options: ["try/except", "catch/throw", "try/catch", "do/except"], correctAnswer: "try/except", explanation: "Python uses try/except blocks to handle exceptions.", difficulty: "medium", points: 10 },
    { question: "Which statement is true about dictionaries?", options: ["They are ordered in Python 3.7+", "They allow duplicate keys", "They cannot be nested", "Keys must be lists"], correctAnswer: "They are ordered in Python 3.7+", explanation: "Since Python 3.7, dictionaries maintain insertion order.", difficulty: "medium", points: 10 },
    { question: "What is the purpose of 'self' in a class?", options: ["It refers to the parent class", "It is an instance variable", "It refers to the current instance", "It is a reserved keyword"], correctAnswer: "It refers to the current instance", explanation: "'self' is the convention used to refer to the instance calling the method.", difficulty: "medium", points: 10 },
    { question: "What does the map() function do?", options: ["Creates a dictionary", "Applies a function to all items in an iterable", "Finds the location of a variable", "Combines two lists"], correctAnswer: "Applies a function to all items in an iterable", explanation: "map() executes a specified function for each item in an iterable.", difficulty: "medium", points: 10 },
    { question: "Which method adds an element to the end of a list?", options: ["insert()", "add()", "push()", "append()"], correctAnswer: "append()", explanation: "The append() method adds a single item to the end of a list.", difficulty: "medium", points: 10 },
    
    // Hard
    { question: "What is a Python decorator?", options: ["A class that inherits from another", "A function that takes another function and extends its behavior", "A syntax for formatting strings", "A tool for GUI development"], correctAnswer: "A function that takes another function and extends its behavior", explanation: "Decorators wrap a function, modifying its behavior.", difficulty: "hard", points: 10 },
    { question: "What is the Global Interpreter Lock (GIL)?", options: ["A security mechanism", "A mutex that protects access to Python objects", "A library for networking", "A tool to lock files"], correctAnswer: "A mutex that protects access to Python objects", explanation: "The GIL prevents multiple native threads from executing Python bytecodes at once.", difficulty: "hard", points: 10 },
    { question: "How does Python handle memory management?", options: ["Manual allocation", "Garbage collection and reference counting", "Only reference counting", "The OS handles it completely"], correctAnswer: "Garbage collection and reference counting", explanation: "Python uses reference counting and a generational garbage collector.", difficulty: "hard", points: 10 },
    { question: "What is a metaclass in Python?", options: ["A class that defines the behavior of other classes", "A base class for all objects", "A class with no methods", "A class used for metadata extraction"], correctAnswer: "A class that defines the behavior of other classes", explanation: "Metaclasses are the 'classes of classes', defining how a class behaves.", difficulty: "hard", points: 10 },
    { question: "What is the output of `[x for x in range(5) if x % 2 == 0]`?", options: ["[0, 1, 2, 3, 4]", "[2, 4]", "[0, 2, 4]", "Error"], correctAnswer: "[0, 2, 4]", explanation: "This list comprehension filters for even numbers in the range 0-4.", difficulty: "hard", points: 10 }
  ],
  "js-fundamentals": [
    // Easy
    { question: "Which symbol is used for strict equality?", options: ["=", "==", "===", "=>"], correctAnswer: "===", explanation: "The === operator checks for both value and type equality.", difficulty: "easy", points: 10 },
    { question: "How do you declare a block-scoped variable?", options: ["var", "let", "global", "def"], correctAnswer: "let", explanation: "'let' and 'const' provide block-level scoping.", difficulty: "easy", points: 10 },
    { question: "What does 'NaN' stand for?", options: ["Not a Number", "New array Notation", "Null and Negative", "None available Now"], correctAnswer: "Not a Number", explanation: "NaN represents a computational error when a math operation fails.", difficulty: "easy", points: 10 },
    { question: "Which array method removes the last element?", options: ["shift()", "pop()", "push()", "slice()"], correctAnswer: "pop()", explanation: "The pop() method removes the last element from an array.", difficulty: "easy", points: 10 },
    { question: "What is the output of 'typeof null'?", options: ["null", "undefined", "object", "number"], correctAnswer: "object", explanation: "In JavaScript, typeof null is notoriously evaluated as 'object' due to a historical bug.", difficulty: "easy", points: 10 },
    
    // Medium
    { question: "What is a closure?", options: ["A locked object", "A function bundled with its lexical environment", "A method to end a loop", "A way to hide HTML elements"], correctAnswer: "A function bundled with its lexical environment", explanation: "A closure gives you access to an outer function's scope from an inner function.", difficulty: "medium", points: 10 },
    { question: "What does Array.prototype.map() return?", options: ["A single value", "A boolean", "A new array with the results", "Undefined"], correctAnswer: "A new array with the results", explanation: "map() creates a new array populated with the results of calling a provided function.", difficulty: "medium", points: 10 },
    { question: "What is the event loop?", options: ["A loop that iteraters over events", "A mechanism that handles asynchronous callbacks", "An infinite while loop", "A UI component"], correctAnswer: "A mechanism that handles asynchronous callbacks", explanation: "The event loop pushes callbacks from the task queue to the call stack when it's empty.", difficulty: "medium", points: 10 },
    { question: "What does 'this' refer to in an arrow function?", options: ["The window object", "The element that fired the event", "The lexical scope's 'this'", "Undefined"], correctAnswer: "The lexical scope's 'this'", explanation: "Arrow functions do not bind their own 'this', they inherit it from the parent scope.", difficulty: "medium", points: 10 },
    { question: "How do you handle a Promise that rejects?", options: ["using .catch()", "using .reject()", "using .error()", "using .fail()"], correctAnswer: "using .catch()", explanation: "The .catch() method is used to handle rejected Promises.", difficulty: "medium", points: 10 },
    
    // Hard
    { question: "What is variable hoisting?", options: ["Lifting variables to another file", "JavaScript moving declarations to the top", "A security vulnerability", "Converting types automatically"], correctAnswer: "JavaScript moving declarations to the top", explanation: "Hoisting is JS's default behavior of moving declarations to the top of the current scope.", difficulty: "hard", points: 10 },
    { question: "What is the difference between 'apply' and 'call'?", options: ["Call takes an array of arguments, apply takes them individually", "Apply takes an array of arguments, call takes them individually", "There is no difference", "Apply is only for arrays"], correctAnswer: "Apply takes an array of arguments, call takes them individually", explanation: "The apply() method accepts arguments as an array.", difficulty: "hard", points: 10 },
    { question: "What is a generator function?", options: ["A function that creates other functions", "A function that can be paused and resumed", "A function that generates random numbers", "A constructor for objects"], correctAnswer: "A function that can be paused and resumed", explanation: "Generator functions use 'yield' to pause execution and can be resumed later.", difficulty: "hard", points: 10 },
    { question: "What is a Proxy object?", options: ["A network interceptor", "An object that wraps another object and intercepts operations", "A fallback object", "A type of Promise"], correctAnswer: "An object that wraps another object and intercepts operations", explanation: "The Proxy object enables you to create a proxy for another object, which can intercept and redefine operations.", difficulty: "hard", points: 10 },
    { question: "Explain the concept of 'currying'.", options: ["Adding spice to code", "Transforming a function with multiple arguments into a sequence of nested functions", "Minifying JavaScript", "Converting callbacks to Promises"], correctAnswer: "Transforming a function with multiple arguments into a sequence of nested functions", explanation: "Currying breaks down a function that takes multiple arguments into a series of functions that each take a single argument.", difficulty: "hard", points: 10 }
  ],
  "sql-fundamentals": [
    // Easy
    { question: "What does SQL stand for?", options: ["Strong Question Language", "Structured Query Language", "Structured Question Language", "Simple Query Language"], correctAnswer: "Structured Query Language", explanation: "SQL is the standard language for relational database management systems.", difficulty: "easy", points: 10 },
    { question: "Which statement is used to extract data from a database?", options: ["GET", "EXTRACT", "SELECT", "OPEN"], correctAnswer: "SELECT", explanation: "The SELECT statement is used to retrieve data from tables.", difficulty: "easy", points: 10 },
    { question: "Which statement is used to update data in a database?", options: ["SAVE", "UPDATE", "MODIFY", "SAVE AS"], correctAnswer: "UPDATE", explanation: "The UPDATE statement modifies existing records in a table.", difficulty: "easy", points: 10 },
    { question: "Which statement is used to insert new data?", options: ["INSERT INTO", "ADD RECORD", "ADD NEW", "INSERT NEW"], correctAnswer: "INSERT INTO", explanation: "The INSERT INTO statement is used to add new rows to a table.", difficulty: "easy", points: 10 },
    { question: "Which keyword is used to filter records?", options: ["WHERE", "FILTER", "SEARCH", "MATCH"], correctAnswer: "WHERE", explanation: "The WHERE clause is used to extract only those records that fulfill a specified condition.", difficulty: "easy", points: 10 },
    { question: "Which operator is used to search for a specified pattern in a column?", options: ["GET", "LIKE", "PATTERN", "SEARCH"], correctAnswer: "LIKE", explanation: "The LIKE operator is used in a WHERE clause to search for a specified pattern.", difficulty: "easy", points: 10 },
    
    // Medium
    { question: "What is an INNER JOIN?", options: ["Returns all records from both tables", "Returns records that have matching values in both tables", "Returns records from the left table only", "Merges two tables permanently"], correctAnswer: "Returns records that have matching values in both tables", explanation: "INNER JOIN selects records that have matching values in both tables.", difficulty: "medium", points: 10 },
    { question: "What does the GROUP BY statement do?", options: ["Sorts the results", "Groups rows that have the same values into summary rows", "Combines two tables", "Filters results based on a condition"], correctAnswer: "Groups rows that have the same values into summary rows", explanation: "GROUP BY is often used with aggregate functions (COUNT(), MAX(), MIN(), SUM(), AVG()) to group the result-set.", difficulty: "medium", points: 10 },
    { question: "What is a primary key?", options: ["The first column in a table", "A password for the database", "A unique identifier for a record in a table", "A keyword used to start a query"], correctAnswer: "A unique identifier for a record in a table", explanation: "A primary key uniquely identifies each record in a database table.", difficulty: "medium", points: 10 },
    { question: "What is the difference between HAVING and WHERE?", options: ["No difference", "HAVING is for aggregate functions, WHERE is for individual rows", "WHERE is for numbers, HAVING is for text", "HAVING is used before GROUP BY"], correctAnswer: "HAVING is for aggregate functions, WHERE is for individual rows", explanation: "The HAVING clause was added because the WHERE keyword cannot be used with aggregate functions.", difficulty: "medium", points: 10 },
    
    // Hard
    { question: "What is a UNION operator used for?", options: ["Combining multiple tables", "Combining the result-set of two or more SELECT statements", "Joining tables based on a relationship", "Adding a new column"], correctAnswer: "Combining the result-set of two or more SELECT statements", explanation: "The UNION operator combines the results of two or more queries into a single result set.", difficulty: "hard", points: 10 },
    { question: "What is a foreign key?", options: ["A key from another database", "A field that uniquely identifies a row in another table", "An encrypted column", "A key used for external APIs"], correctAnswer: "A field that uniquely identifies a row in another table", explanation: "A foreign key is a key used to link two tables together.", difficulty: "hard", points: 10 },
    { question: "What is a subquery?", options: ["A query that runs slower", "A query nested inside another query", "A query that returns no results", "A query written in a different language"], correctAnswer: "A query nested inside another query", explanation: "A subquery or inner query is a query within another SQL query and embedded within the WHERE clause.", difficulty: "hard", points: 10 },
    { question: "What is an index in SQL?", options: ["A table of contents for the database", "A data structure that improves the speed of data retrieval", "The primary key of a table", "A list of all tables"], correctAnswer: "A data structure that improves the speed of data retrieval", explanation: "Indexes are used to retrieve data from the database very fast.", difficulty: "hard", points: 10 },
    { question: "What does ACID stand for in database transactions?", options: ["Atomicity, Consistency, Isolation, Durability", "Accuracy, Completeness, Integrity, Data", "Automated, Computed, Isolated, Distributed", "Always Check Individual Data"], correctAnswer: "Atomicity, Consistency, Isolation, Durability", explanation: "ACID properties ensure that database transactions are processed reliably.", difficulty: "hard", points: 10 }
  ],
  "html-css-fundamentals": [
    // Easy
    { question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Markup Language"], correctAnswer: "Hyper Text Markup Language", explanation: "HTML is the standard markup language for creating web pages.", difficulty: "easy", points: 10 },
    { question: "Who is making the Web standards?", options: ["Mozilla", "Google", "The World Wide Web Consortium", "Microsoft"], correctAnswer: "The World Wide Web Consortium", explanation: "The W3C is the main international standards organization for the World Wide Web.", difficulty: "easy", points: 10 },
    { question: "What does CSS stand for?", options: ["Creative Style Sheets", "Computer Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"], correctAnswer: "Cascading Style Sheets", explanation: "CSS is used for describing the presentation of a document written in HTML.", difficulty: "easy", points: 10 },
    { question: "Which HTML element is used to define an internal style sheet?", options: ["<css>", "<script>", "<style>", "<design>"], correctAnswer: "<style>", explanation: "The <style> element is used to embed CSS within an HTML document.", difficulty: "easy", points: 10 },
    
    // Medium
    { question: "Which CSS property controls the text size?", options: ["font-style", "text-style", "text-size", "font-size"], correctAnswer: "font-size", explanation: "The font-size property sets the size of the font.", difficulty: "medium", points: 10 },
    { question: "How do you select an element with id 'demo'?", options: [".demo", "#demo", "demo", "*demo"], correctAnswer: "#demo", explanation: "The # symbol is used to select an element by its ID.", difficulty: "medium", points: 10 },
    { question: "How do you select elements with class name 'test'?", options: ["#test", ".test", "test", "*test"], correctAnswer: ".test", explanation: "The dot (.) symbol is used to select elements by class name.", difficulty: "medium", points: 10 },
    { question: "What is the purpose of media queries in CSS?", options: ["To add images", "To make layouts responsive to screen sizes", "To animate elements", "To query databases"], correctAnswer: "To make layouts responsive to screen sizes", explanation: "Media queries allow you to apply CSS styles conditionally based on device characteristics like screen width.", difficulty: "medium", points: 10 },
    
    // Hard
    { question: "What is the default value of the position property?", options: ["relative", "fixed", "absolute", "static"], correctAnswer: "static", explanation: "HTML elements are positioned static by default.", difficulty: "hard", points: 10 },
    { question: "Which property is used to change the background color?", options: ["color", "bgcolor", "background-color", "bg-color"], correctAnswer: "background-color", explanation: "The background-color property sets the background color of an element.", difficulty: "hard", points: 10 },
    { question: "What does the z-index property control?", options: ["Transparency", "The vertical stacking order of elements", "Font weight", "Animation speed"], correctAnswer: "The vertical stacking order of elements", explanation: "z-index specifies the z-order of an element and its descendants, determining what overlaps what.", difficulty: "hard", points: 10 },
    { question: "Which CSS property is used to create space inside an element's border?", options: ["margin", "padding", "spacing", "border-spacing"], correctAnswer: "padding", explanation: "Padding clears an area around the content, inside the border.", difficulty: "hard", points: 10 }
  ],
  "computer-networks-fundamentals": [
    // Easy
    { question: "Which layer of the OSI model is responsible for routing packets?", options: ["Data Link Layer", "Network Layer", "Transport Layer", "Application Layer"], correctAnswer: "Network Layer", explanation: "The Network Layer (Layer 3) handles routing of data packets across different networks using logical addresses like IP addresses.", difficulty: "easy", points: 10 },
    { question: "What does DNS stand for?", options: ["Domain Name System", "Data Network Service", "Digital Name Server", "Domain Network Security"], correctAnswer: "Domain Name System", explanation: "DNS translates human-readable domain names (like www.google.com) into machine-readable IP addresses.", difficulty: "easy", points: 10 },
    { question: "Which protocol is typically used for sending emails?", options: ["FTP", "HTTP", "SMTP", "SNMP"], correctAnswer: "SMTP", explanation: "Simple Mail Transfer Protocol (SMTP) is the standard protocol for email transmission.", difficulty: "easy", points: 10 },
    { question: "What is the primary difference between HTTP and HTTPS?", options: ["HTTPS is faster", "HTTPS is encrypted", "HTTPS only works on Wi-Fi", "HTTPS is for mobile devices only"], correctAnswer: "HTTPS is encrypted", explanation: "HTTPS uses TLS/SSL to encrypt data transmitted between the client and server.", difficulty: "easy", points: 10 },
    { question: "Which device is primarily used to connect different networks together?", options: ["Switch", "Hub", "Router", "Modem"], correctAnswer: "Router", explanation: "A router forwards data packets between computer networks.", difficulty: "easy", points: 10 },
    
    // Medium
    { question: "How many bits are in an IPv4 address?", options: ["16 bits", "32 bits", "64 bits", "128 bits"], correctAnswer: "32 bits", explanation: "An IPv4 address is 32 bits long, usually represented as 4 octets separated by dots.", difficulty: "medium", points: 10 },
    { question: "Which protocol provides reliable, connection-oriented data delivery?", options: ["UDP", "IP", "ICMP", "TCP"], correctAnswer: "TCP", explanation: "Transmission Control Protocol (TCP) ensures reliable, ordered, and error-checked delivery of a stream of octets.", difficulty: "medium", points: 10 },
    { question: "What is a MAC address?", options: ["A logical address assigned by ISP", "A physical address assigned to a network interface", "An encrypted web address", "A routing protocol identifier"], correctAnswer: "A physical address assigned to a network interface", explanation: "A Media Access Control (MAC) address is a unique identifier assigned to a network interface controller (NIC) for communications at the data link layer.", difficulty: "medium", points: 10 },
    { question: "What is the purpose of DHCP?", options: ["To encrypt data", "To block unauthorized access", "To automatically assign IP addresses", "To resolve domain names"], correctAnswer: "To automatically assign IP addresses", explanation: "Dynamic Host Configuration Protocol (DHCP) automatically assigns IP addresses and other network configuration parameters to devices on a network.", difficulty: "medium", points: 10 },
    { question: "Which OSI layer is responsible for logical addressing?", options: ["Layer 2 (Data Link)", "Layer 3 (Network)", "Layer 4 (Transport)", "Layer 7 (Application)"], correctAnswer: "Layer 3 (Network)", explanation: "The Network layer handles logical addressing (e.g., IP addresses) to route data.", difficulty: "medium", points: 10 },
    
    // Hard
    { question: "In a TCP/IP model, which layer corresponds to the OSI model's Session, Presentation, and Application layers?", options: ["Internet Layer", "Transport Layer", "Network Access Layer", "Application Layer"], correctAnswer: "Application Layer", explanation: "The TCP/IP Application layer encompasses the functions of the OSI Session, Presentation, and Application layers.", difficulty: "hard", points: 10 },
    { question: "What is a subnet mask used for?", options: ["To hide an IP address", "To separate the network and host portions of an IP address", "To encrypt network traffic", "To prevent DDoS attacks"], correctAnswer: "To separate the network and host portions of an IP address", explanation: "A subnet mask is a 32-bit number that masks an IP address and divides the IP address into network address and host address.", difficulty: "hard", points: 10 },
    { question: "Which of the following ports is used by default for SSH?", options: ["21", "22", "23", "80"], correctAnswer: "22", explanation: "Secure Shell (SSH) uses port 22 by default for secure terminal connections.", difficulty: "hard", points: 10 },
    { question: "What happens during a TCP three-way handshake?", options: ["SYN, SYN-ACK, ACK", "SYN, ACK, FIN", "ACK, SYN-ACK, SYN", "SYN, FIN, ACK"], correctAnswer: "SYN, SYN-ACK, ACK", explanation: "A client sends a SYN, the server replies with a SYN-ACK, and the client confirms with an ACK.", difficulty: "hard", points: 10 },
    { question: "How many bits are in an IPv6 address?", options: ["32 bits", "64 bits", "128 bits", "256 bits"], correctAnswer: "128 bits", explanation: "An IPv6 address is 128 bits long, allowing for a vastly larger number of addresses than IPv4.", difficulty: "hard", points: 10 }
  ]
};

const PRACTICAL_TASKS = [
  {
    id: "python-grade-calculator",
    title: "Student Grade Calculator",
    description: "Build a Python script that calculates student grades based on marks.",
    skillId: "python",
    difficulty: "Beginner",
    durationMinutes: 30,
    instructions: "Write a complete Python script that calculates the average marks and assigns a grade. Your script must gracefully handle invalid inputs (e.g. non-numeric inputs or marks outside 0-100).",
    requirements: [
      "Accept a list of student marks as input.",
      "Calculate the average of the marks.",
      "Assign a grade: A (90-100), B (80-89), C (70-79), F (<70).",
      "Handle invalid input gracefully (e.g. non-numeric inputs)."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 40,
      codeQuality: 25,
      problemSolving: 25,
      explanation: 10
    },
    active: true
  },
  {
    id: "js-todo-logic",
    title: "Build a To-Do Task Manager Logic",
    description: "Implement the core logic for a To-Do list application.",
    skillId: "javascript",
    difficulty: "Beginner",
    durationMinutes: 30,
    instructions: "Write JavaScript functions or a class to manage a to-do list. You do not need to build the UI, just the logical data structure and methods.",
    requirements: [
      "Implement a method to add a new task.",
      "Implement a method to delete a task by ID.",
      "Implement a method to mark a task as complete.",
      "Implement a method to filter tasks (all, active, completed)."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 40,
      codeQuality: 25,
      problemSolving: 25,
      explanation: 10
    },
    active: true
  },
  {
    id: "sql-student-db",
    title: "Student Database Query Challenge",
    description: "Write SQL queries to extract meaningful statistics from a student database.",
    skillId: "sql",
    difficulty: "Beginner",
    durationMinutes: 30,
    instructions: "Assuming you have a 'Students' table and a 'Grades' table, write queries that meet the specified requirements. Assume standard relational schemas.",
    requirements: [
      "Write a SELECT query to get all students with a GPA over 3.5.",
      "Use WHERE conditions to find students enrolled in the 'Computer Science' department.",
      "Use ORDER BY to sort students by their enrollment date, newest first.",
      "Use GROUP BY to count the number of students in each department."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 40,
      codeQuality: 25,
      problemSolving: 25,
      explanation: 10
    },
    active: true
  },
  {
    id: "python-api-parser",
    title: "JSON API Data Parser",
    description: "Build a Python function to parse and extract data from a JSON response.",
    skillId: "python",
    difficulty: "Intermediate",
    durationMinutes: 45,
    instructions: "Write a Python script that takes a JSON string representing user data and returns a list of active users sorted by age.",
    requirements: [
      "Parse the JSON string using the built-in json module.",
      "Filter out users where 'isActive' is false.",
      "Sort the remaining users by 'age' in descending order.",
      "Return a list of user names."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 50,
      codeQuality: 20,
      problemSolving: 20,
      explanation: 10
    },
    active: true
  },
  {
    id: "js-async-fetch",
    title: "Async Data Fetch & Render",
    description: "Implement an async function to fetch data and prepare it for rendering.",
    skillId: "javascript",
    difficulty: "Intermediate",
    durationMinutes: 45,
    instructions: "Write an async JavaScript function that fetches a list of posts from a dummy API and formats them into an array of HTML string cards.",
    requirements: [
      "Use the fetch API to retrieve data.",
      "Handle network errors with a try-catch block.",
      "Map the data to an array of template strings.",
      "Return the formatted array."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 40,
      codeQuality: 30,
      problemSolving: 20,
      explanation: 10
    },
    active: true
  },
  {
    id: "sql-advanced-joins",
    title: "Advanced SQL Joins",
    description: "Write a complex SQL query to join multiple tables and aggregate data.",
    skillId: "sql",
    difficulty: "Intermediate",
    durationMinutes: 45,
    instructions: "Given 'Orders', 'Customers', and 'Products' tables, write a query to find the top 5 customers by total spending.",
    requirements: [
      "JOIN the Orders and Customers tables.",
      "JOIN the Orders and Products tables to calculate total cost.",
      "Use SUM and GROUP BY to aggregate total spending per customer.",
      "ORDER BY total spending DESC and LIMIT to 5."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 50,
      codeQuality: 20,
      problemSolving: 20,
      explanation: 10
    },
    active: true
  },
  {
    id: "html-css-landing",
    title: "Responsive Landing Page",
    description: "Create a simple, responsive HTML/CSS landing page.",
    skillId: "html-css",
    difficulty: "Beginner",
    durationMinutes: 60,
    instructions: "Write the HTML and CSS for a landing page that includes a header, a hero section with a call-to-action button, and a 3-column feature section.",
    requirements: [
      "Use semantic HTML5 tags (header, main, section).",
      "Use Flexbox or CSS Grid for the 3-column layout.",
      "Ensure the layout stacks vertically on screens smaller than 768px using media queries.",
      "Include hover effects on the CTA button."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 40,
      codeQuality: 30,
      problemSolving: 20,
      explanation: 10
    },
    active: true
  },
  {
    id: "html-css-dashboard",
    title: "CSS Grid Dashboard Layout",
    description: "Design a dashboard layout using CSS Grid.",
    skillId: "html-css",
    difficulty: "Intermediate",
    durationMinutes: 45,
    instructions: "Create a CSS Grid layout for an admin dashboard with a sidebar, header, and main content area.",
    requirements: [
      "Define a grid container with appropriate columns and rows.",
      "Place the sidebar, header, and main content in their respective grid areas.",
      "Ensure the sidebar collapses or hides on mobile devices.",
      "Use clean, maintainable CSS classes."
    ],
    submissionTypes: ["code", "explanation"],
    evaluationCriteria: {
      correctness: 40,
      codeQuality: 30,
      problemSolving: 20,
      explanation: 10
    },
    active: true
  }
];


export default function SeedPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [forceReset, setForceReset] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const handleSeed = async () => {
    setLoading(true);
    setLogs([]);
    addLog("Starting seed process...");

    try {
      if (forceReset) {
        addLog("Force Reset enabled. Clearing old data...");
        // Delete all assessment questions
        const questionsSnapshot = await getDocs(collection(db, "assessmentQuestions"));
        const batchDeleteQs = writeBatch(db);
        questionsSnapshot.forEach((doc) => batchDeleteQs.delete(doc.ref));
        await batchDeleteQs.commit();
        
        // Delete assessments
        const assessmentsSnapshot = await getDocs(collection(db, "assessments"));
        const batchDeleteAs = writeBatch(db);
        assessmentsSnapshot.forEach((doc) => batchDeleteAs.delete(doc.ref));
        await batchDeleteAs.commit();

        // Delete practical tasks
        const pTasksSnapshot = await getDocs(collection(db, "practicalTasks"));
        const batchDeletePt = writeBatch(db);
        pTasksSnapshot.forEach((doc) => batchDeletePt.delete(doc.ref));
        await batchDeletePt.commit();
        
        // Delete practical task attempts
        const ptAttemptsSnapshot = await getDocs(collection(db, "practicalTaskAttempts"));
        const batchDeletePta = writeBatch(db);
        ptAttemptsSnapshot.forEach((doc) => batchDeletePta.delete(doc.ref));
        await batchDeletePta.commit();

        // Delete skills
        const skillsSnapshot = await getDocs(collection(db, "skills"));
        const batchDeleteSk = writeBatch(db);
        skillsSnapshot.forEach((doc) => batchDeleteSk.delete(doc.ref));
        await batchDeleteSk.commit();

        addLog("Cleared old skills, assessments, questions, and practical tasks.");
      } else {
        // 1. Check if skills already exist
        const skillsSnapshot = await getDocs(collection(db, "skills"));
        if (!skillsSnapshot.empty) {
          addLog("Data already exists. Check 'Force Reset' if you want to wipe old questions and re-seed.");
          setLoading(false);
          return;
        }
      }

      addLog("Seeding skills...");
      const batch = writeBatch(db);

      for (const skill of SKILLS) {
        const ref = doc(db, "skills", skill.id);
        batch.set(ref, {
          ...skill,
          createdAt: serverTimestamp()
        });
      }

      addLog("Seeding assessments...");
      for (const assessment of ASSESSMENTS) {
        const ref = doc(db, "assessments", assessment.id);
        batch.set(ref, {
          ...assessment,
          createdAt: serverTimestamp()
        });
      }

      addLog("Seeding questions...");
      let qCount = 0;
      for (const [assessmentId, qs] of Object.entries(QUESTIONS)) {
        const assessmentInfo = ASSESSMENTS.find(a => a.id === assessmentId);
        qs.forEach((q) => {
          const ref = doc(collection(db, "assessmentQuestions"));
          batch.set(ref, {
            ...q,
            assessmentId,
            skillId: assessmentInfo ? assessmentInfo.skillId : null,
            active: true
          });
          qCount++;
        });
      }

      addLog("Seeding practical tasks...");
      let ptCount = 0;
      for (const task of PRACTICAL_TASKS) {
        const ref = doc(db, "practicalTasks", task.id);
        batch.set(ref, {
          ...task,
          createdAt: serverTimestamp()
        });
        ptCount++;
      }

      await batch.commit();
      addLog(`Seed complete successfully! Inserted ${qCount} questions and ${ptCount} practical tasks.`);

    } catch (error: any) {
      console.error(error);
      addLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user || role !== "admin") {
    return <div className="p-8">Please log in as an admin to run the seeder.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 p-8 bg-white border rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold mb-4">Development Seed Script</h1>
      <p className="text-gray-600 mb-6">
        This will populate the Firestore database with initial skills, assessments, and questions.
      </p>

      <div className="flex items-center mb-6">
        <input 
          type="checkbox" 
          id="forceReset" 
          checked={forceReset}
          onChange={(e) => setForceReset(e.target.checked)}
          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
        />
        <label htmlFor="forceReset" className="text-sm text-gray-700 font-medium">
          Force Reset (Deletes old skills, assessments, and questions before re-seeding)
        </label>
      </div>

      <button
        onClick={handleSeed}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {loading ? "Seeding Data..." : "Run Seed"}
      </button>

      {logs.length > 0 && (
        <div className="mt-8 bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
