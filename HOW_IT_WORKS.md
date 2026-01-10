# How FoundIt Works - A Beginner's Guide

Welcome! This guide explains everything about how this website works, written for someone with zero coding experience. By the end, you'll understand what every part does!

---

## Table of Contents
1. [The Big Picture](#1-the-big-picture)
2. [What is a Website Really?](#2-what-is-a-website-really)
3. [Project Structure](#3-project-structure)
4. [The Backend (Server)](#4-the-backend-server)
5. [The Database](#5-the-database)
6. [APIs - How Frontend Talks to Backend](#6-apis---how-frontend-talks-to-backend)
7. [The Frontend (What Users See)](#7-the-frontend-what-users-see)
8. [CSS - Making It Pretty](#8-css---making-it-pretty)
9. [JavaScript - Making It Interactive](#9-javascript---making-it-interactive)
10. [How Everything Connects](#10-how-everything-connects)
11. [Glossary](#11-glossary)

---

## 1. The Big Picture

Think of a website like a restaurant:

| Restaurant | Website |
|------------|---------|
| The dining area (what customers see) | **Frontend** (HTML, CSS, JavaScript) |
| The kitchen (where food is made) | **Backend** (Node.js server) |
| The recipe book & ingredient storage | **Database** (JSON files) |
| The waiter (takes orders, brings food) | **API** (connects frontend to backend) |
| The menu | **Routes** (URLs you can visit) |

When you visit our website:
1. Your browser asks our server for the page
2. The server sends back HTML, CSS, and JavaScript files
3. Your browser displays them as a pretty website
4. When you click buttons or submit forms, JavaScript sends requests to the server
5. The server processes them, saves/retrieves data, and sends back responses

---

## 2. What is a Website Really?

### The Three Languages of the Web

Every website is built with three core technologies:

#### HTML (HyperText Markup Language)
- **What it is**: The skeleton/structure of a webpage
- **Analogy**: Like the wooden frame of a house
- **Example**: 
```html
<h1>Welcome to FoundIt</h1>
<p>Find your lost items here.</p>
<button>Search Items</button>
```
This creates a heading, a paragraph, and a button.

#### CSS (Cascading Style Sheets)
- **What it is**: The styling and appearance
- **Analogy**: Like the paint, furniture, and decorations of a house
- **Example**:
```css
button {
    background-color: teal;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
}
```
This makes buttons teal with white text and rounded corners.

#### JavaScript (JS)
- **What it is**: The behavior and interactivity
- **Analogy**: Like the electricity and plumbing that make things work
- **Example**:
```javascript
button.addEventListener('click', function() {
    alert('You clicked the button!');
});
```
This makes something happen when you click a button.

---

## 3. Project Structure

Here's what each file in our project does:

```
foundit/
│
├── server.js              ← The brain of our website (backend)
├── package.json           ← List of tools/libraries we use
├── README.md              ← Basic project info
├── HOW_IT_WORKS.md        ← This file!
│
├── data/                  ← Where we store information
│   ├── items.json         ← All found items
│   ├── claims.json        ← All claim requests
│   └── admin.json         ← Admin login credentials
│
└── public/                ← Everything users see (frontend)
    ├── index.html         ← Main website structure
    ├── admin.html         ← Admin panel structure
    ├── styles.css         ← Main website styling
    ├── admin.css          ← Admin panel styling
    ├── app.js             ← Main website interactivity
    ├── admin.js           ← Admin panel interactivity
    └── uploads/           ← Uploaded photos stored here
```

---

## 4. The Backend (Server)

### What is a Server?

A **server** is just a computer program that:
1. Waits for requests (like someone visiting a URL)
2. Does something (like looking up data)
3. Sends back a response (like a webpage or data)

### What is Node.js?

**Node.js** lets us run JavaScript outside of a web browser - on a server! Before Node.js, JavaScript could only run in browsers.

### What is Express?

**Express** is a helper library that makes building servers easier. Instead of writing hundreds of lines of code, we can write a few.

### Our Server Explained (server.js)

Let's break down the key parts:

#### 1. Importing Tools (Lines 1-5)
```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
```

This is like gathering your cooking tools before making a meal:
- `express` - Makes building the server easy
- `multer` - Handles file uploads (photos)
- `path` - Helps work with file locations
- `fs` - Lets us read/write files (our database)
- `uuid` - Generates unique IDs (like `a1b2c3d4-e5f6-...`)

#### 2. Creating the Server (Lines 7-8)
```javascript
const app = express();
const PORT = 3000;
```

- `app` is our server
- `PORT = 3000` means our website lives at `localhost:3000`

#### 3. Setting Up Folders (Lines 10-20)
```javascript
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
```

This creates folders if they don't exist - like setting up filing cabinets before opening an office.

#### 4. Routes (The Menu)

Routes are like menu items - they define what happens when someone visits a URL:

```javascript
app.get('/api/items', (req, res) => {
    // This runs when someone visits /api/items
    // req = the request (what they asked for)
    // res = the response (what we send back)
});
```

| Method | URL | What it does |
|--------|-----|--------------|
| `GET` | `/api/items` | Get list of all items |
| `POST` | `/api/items` | Submit a new found item |
| `POST` | `/api/claims` | Submit a claim for an item |
| `GET` | `/api/admin/stats` | Get dashboard statistics |

#### 5. Starting the Server (Last lines)
```javascript
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
```

This tells the server to start listening for visitors!

---

## 5. The Database

### What is a Database?

A **database** is where we permanently store information. Without it, all data would disappear when the server restarts!

### Our Simple Database: JSON Files

We use **JSON (JavaScript Object Notation)** files to store data. JSON is a way to write data that both humans and computers can read.

#### items.json - Stores Found Items
```json
[
    {
        "id": "abc123",
        "title": "Blue Backpack",
        "category": "accessories",
        "location": "Library",
        "date_found": "2024-01-15",
        "finder_name": "John Smith",
        "finder_email": "john@school.edu",
        "photo": "/uploads/photo123.jpg",
        "status": "approved",
        "created_at": "2024-01-15T10:30:00Z"
    },
    {
        "id": "def456",
        "title": "iPhone 13",
        "category": "electronics",
        ...
    }
]
```

Each item is an **object** (the `{ }` parts) with **properties** like title, category, etc.

The square brackets `[ ]` mean it's an **array** (a list) of items.

#### claims.json - Stores Claim Requests
```json
[
    {
        "id": "claim789",
        "item_id": "abc123",
        "claimant_name": "Jane Doe",
        "claimant_email": "jane@school.edu",
        "description": "It's my bag, has my notebook inside",
        "status": "pending"
    }
]
```

#### admin.json - Stores Admin Login
```json
{
    "username": "admin",
    "password": "school2024"
}
```

### How We Read/Write Data

```javascript
// READING data from a file
function readData(file) {
    const fileContents = fs.readFileSync(file, 'utf8');  // Read file as text
    return JSON.parse(fileContents);  // Convert text to JavaScript object
}

// WRITING data to a file
function writeData(file, data) {
    const text = JSON.stringify(data, null, 2);  // Convert object to text
    fs.writeFileSync(file, text);  // Save text to file
}
```

---

## 6. APIs - How Frontend Talks to Backend

### What is an API?

**API (Application Programming Interface)** is how different programs talk to each other. 

Think of it like a waiter at a restaurant:
- You (frontend) tell the waiter (API) what you want
- The waiter goes to the kitchen (backend)
- The kitchen prepares your food (processes the request)
- The waiter brings back your food (response)

### HTTP Methods

When making API requests, we use different **methods** to say what we want to do:

| Method | Purpose | Example |
|--------|---------|---------|
| `GET` | Retrieve/read data | "Show me all items" |
| `POST` | Create new data | "Add this new item" |
| `PATCH` | Update existing data | "Change status to approved" |
| `DELETE` | Remove data | "Delete this item" |

### Our API Endpoints

An **endpoint** is a specific URL that does a specific thing:

#### Public Endpoints (anyone can use)
```
GET  /api/items          → Get all approved items
GET  /api/items/:id      → Get one specific item
POST /api/items          → Submit a new found item
POST /api/claims         → Submit a claim
```

#### Admin Endpoints (need to be logged in)
```
POST   /api/admin/login      → Log in as admin
GET    /api/admin/items      → Get ALL items (including pending)
PATCH  /api/admin/items/:id  → Update an item's status
DELETE /api/admin/items/:id  → Delete an item
GET    /api/admin/claims     → Get all claims
PATCH  /api/admin/claims/:id → Update a claim's status
GET    /api/admin/stats      → Get dashboard numbers
```

### Example: What Happens When You Submit an Item

1. **You fill out the form** on the website
2. **JavaScript collects the data** from the form
3. **JavaScript sends a POST request** to `/api/items`:
   ```javascript
   fetch('/api/items', {
       method: 'POST',
       body: formData  // Your form data
   });
   ```
4. **The server receives it** and runs this code:
   ```javascript
   app.post('/api/items', (req, res) => {
       // Get data from the request
       const { title, category, location } = req.body;
       
       // Create new item object
       const newItem = { id: generateId(), title, category, ... };
       
       // Save to database
       items.push(newItem);
       writeData(ITEMS_FILE, items);
       
       // Send success response
       res.json({ message: 'Item submitted!' });
   });
   ```
5. **JavaScript receives the response** and shows you a success message

---

## 7. The Frontend (What Users See)

### HTML Structure (index.html)

Our HTML is organized into sections:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Meta info and links to CSS -->
    <title>FoundIt</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Navigation Bar -->
    <nav class="navbar">...</nav>
    
    <!-- Home Page -->
    <main id="home" class="page active">
        <section class="hero">...</section>
        <section class="how-it-works">...</section>
        <section class="recent-items">...</section>
    </main>
    
    <!-- Browse Page -->
    <main id="browse" class="page">...</main>
    
    <!-- Report Page -->
    <main id="report" class="page">...</main>
    
    <!-- Footer -->
    <footer>...</footer>
    
    <!-- Link to JavaScript -->
    <script src="app.js"></script>
</body>
</html>
```

### Key HTML Concepts

#### Tags
Everything in HTML uses **tags** that look like `<tagname>content</tagname>`:
```html
<h1>This is a heading</h1>
<p>This is a paragraph</p>
<button>Click me</button>
```

#### Classes and IDs
We give elements names so CSS and JavaScript can find them:
```html
<div class="item-card">        <!-- class: can be used multiple times -->
<div id="search-input">        <!-- id: should be unique on the page -->
```

#### Attributes
Extra information on elements:
```html
<input type="text" placeholder="Search..." required>
<img src="/uploads/photo.jpg" alt="Item photo">
<a href="/admin.html">Admin Panel</a>
```

---

## 8. CSS - Making It Pretty

### How CSS Works

CSS uses **selectors** to target HTML elements, then applies **styles**:

```css
selector {
    property: value;
    property: value;
}
```

### Types of Selectors

```css
/* Element selector - targets all <h1> tags */
h1 {
    font-size: 32px;
}

/* Class selector - targets elements with class="btn" */
.btn {
    background: teal;
    padding: 10px 20px;
}

/* ID selector - targets the element with id="header" */
#header {
    height: 72px;
}

/* Descendant selector - targets <a> tags inside .navbar */
.navbar a {
    color: white;
}
```

### CSS Variables (Custom Properties)

We define colors once and reuse them everywhere:

```css
:root {
    --color-primary: #0d9488;    /* Teal */
    --color-accent: #f59e0b;     /* Amber */
    --color-text: #0f172a;       /* Dark blue */
}

/* Then use them like this: */
.btn-primary {
    background: var(--color-primary);
}
```

### The Box Model

Every HTML element is a box with:
```
┌─────────────────────────────────────┐
│             MARGIN                   │  ← Space outside the border
│  ┌───────────────────────────────┐  │
│  │          BORDER               │  │  ← The border line
│  │  ┌─────────────────────────┐  │  │
│  │  │        PADDING          │  │  │  ← Space inside the border
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │     CONTENT       │  │  │  │  ← Your actual content
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

```css
.item-card {
    padding: 20px;       /* Inside spacing */
    margin: 16px;        /* Outside spacing */
    border: 1px solid gray;
    border-radius: 12px; /* Rounded corners */
}
```

### Flexbox and Grid (Layout)

#### Flexbox - Arranging items in a row or column
```css
.navbar {
    display: flex;
    justify-content: space-between;  /* Spread items apart */
    align-items: center;             /* Center vertically */
}
```

#### Grid - Creating a grid layout
```css
.items-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* 3 equal columns */
    gap: 24px;                               /* Space between items */
}
```

### Responsive Design

Making the website look good on all screen sizes:

```css
/* Default styles for large screens */
.items-grid {
    grid-template-columns: repeat(3, 1fr);  /* 3 columns */
}

/* When screen is 768px or smaller (tablets) */
@media (max-width: 768px) {
    .items-grid {
        grid-template-columns: repeat(2, 1fr);  /* 2 columns */
    }
}

/* When screen is 480px or smaller (phones) */
@media (max-width: 480px) {
    .items-grid {
        grid-template-columns: 1fr;  /* 1 column */
    }
}
```

---

## 9. JavaScript - Making It Interactive

### What JavaScript Does

JavaScript makes the website **do things**:
- Show/hide elements
- Handle form submissions
- Fetch data from the server
- Update the page without reloading

### Key Concepts

#### Variables - Storing Data
```javascript
let userName = "John";           // Can be changed
const maxItems = 100;            // Cannot be changed
```

#### Functions - Reusable Code Blocks
```javascript
function greet(name) {
    return "Hello, " + name + "!";
}

greet("Sarah");  // Returns "Hello, Sarah!"
```

#### Event Listeners - Responding to User Actions
```javascript
// When the button is clicked, run this function
button.addEventListener('click', function() {
    alert('Button clicked!');
});
```

#### DOM Manipulation - Changing the Page
```javascript
// Find an element
const title = document.getElementById('page-title');

// Change its content
title.textContent = "New Title";

// Change its style
title.style.color = "red";

// Add a class
title.classList.add('highlighted');
```

### Fetch API - Talking to the Server

```javascript
// GET request - fetch data
async function loadItems() {
    const response = await fetch('/api/items');
    const items = await response.json();
    console.log(items);  // Array of item objects
}

// POST request - send data
async function submitItem(formData) {
    const response = await fetch('/api/items', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    console.log(result.message);  // "Item submitted!"
}
```

### Our JavaScript Explained (app.js)

#### 1. Navigation
```javascript
function navigateTo(page) {
    // Hide all pages
    pages.forEach(p => p.classList.remove('active'));
    
    // Show the selected page
    document.getElementById(page).classList.add('active');
    
    // If going to browse page, load items
    if (page === 'browse') {
        loadItems();
    }
}
```

#### 2. Loading Items from Server
```javascript
async function loadItems() {
    // Show loading spinner
    loading.style.display = 'block';
    
    // Fetch items from server
    const response = await fetch('/api/items');
    const items = await response.json();
    
    // Hide loading spinner
    loading.style.display = 'none';
    
    // Display the items
    renderItems(items);
}
```

#### 3. Rendering Items (Creating HTML)
```javascript
function renderItems(items) {
    container.innerHTML = items.map(item => `
        <div class="item-card">
            <h3>${item.title}</h3>
            <p>${item.location}</p>
        </div>
    `).join('');
}
```

This uses **template literals** (the backticks `` ` ``) to create HTML strings with dynamic data.

---

## 10. How Everything Connects

### The Complete Flow: Reporting a Found Item

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
├─────────────────────────────────────────────────────────────────┤
│  1. User fills out the form:                                    │
│     - Item name: "Blue Backpack"                                │
│     - Category: "Accessories"                                   │
│     - Location: "Library"                                       │
│     - Uploads a photo                                           │
│                                                                 │
│  2. User clicks "Submit"                                        │
│                                                                 │
│  3. JavaScript (app.js) handles the click:                      │
│     - Collects all form data                                    │
│     - Creates a FormData object                                 │
│     - Sends POST request to /api/items                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST Request
                              │ with form data
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (server.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  4. Express receives the request at /api/items                  │
│                                                                 │
│  5. Multer middleware:                                          │
│     - Saves the uploaded photo to /public/uploads/              │
│     - Generates unique filename                                 │
│                                                                 │
│  6. Route handler:                                              │
│     - Extracts data from request body                           │
│     - Creates new item object with unique ID                    │
│     - Sets status to "pending"                                  │
│     - Reads current items.json                                  │
│     - Adds new item to array                                    │
│     - Writes updated array back to items.json                   │
│     - Sends success response                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Response
                              │ { message: "Success!" }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
├─────────────────────────────────────────────────────────────────┤
│  7. JavaScript receives response                                │
│                                                                 │
│  8. Shows success toast notification                            │
│                                                                 │
│  9. Clears the form                                             │
│                                                                 │
│  10. Item now exists in database with status "pending"          │
│      (won't show publicly until admin approves)                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Complete Flow: Admin Approving an Item

```
Admin logs in → Views pending items → Clicks "Approve"
                                           │
                                           ▼
JavaScript sends: PATCH /api/admin/items/abc123
                  Body: { status: "approved" }
                                           │
                                           ▼
Server: Finds item with id "abc123"
        Changes status from "pending" to "approved"
        Saves to items.json
        Sends success response
                                           │
                                           ▼
Item now appears on public Browse page!
```

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **API** | Application Programming Interface - how programs communicate |
| **Backend** | Server-side code that processes data and logic |
| **CSS** | Cascading Style Sheets - styles the appearance |
| **Database** | Where data is permanently stored |
| **DOM** | Document Object Model - the page structure JavaScript can modify |
| **Endpoint** | A specific URL that performs a specific action |
| **Express** | A Node.js framework for building web servers |
| **Frontend** | Client-side code that users see and interact with |
| **HTML** | HyperText Markup Language - structures the content |
| **HTTP** | Protocol for transferring data on the web |
| **JavaScript** | Programming language that adds interactivity |
| **JSON** | JavaScript Object Notation - data format |
| **Middleware** | Code that runs between request and response |
| **Node.js** | Runtime that lets JavaScript run on servers |
| **Route** | A URL path that triggers specific server code |
| **Server** | A program that responds to requests |
| **UUID** | Universally Unique Identifier - random unique ID |

---

## Need More Help?

### Learning Resources
- **HTML/CSS**: [MDN Web Docs](https://developer.mozilla.org/)
- **JavaScript**: [JavaScript.info](https://javascript.info/)
- **Node.js**: [Node.js Guides](https://nodejs.org/en/docs/guides/)

### Debugging Tips
1. **Check the browser console** (Right-click → Inspect → Console tab) for JavaScript errors
2. **Check the terminal** where the server is running for server errors
3. **Use `console.log()`** to print values and see what's happening

---

*Created for the FoundIt School Lost & Found Project*

