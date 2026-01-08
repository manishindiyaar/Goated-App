# GoatedApp - Electron Setup Guide for Beginners

This guide explains everything about setting up the GoatedApp Electron project from scratch. It's written for developers who have never worked with Electron before.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [What is Electron?](#what-is-electron)
3. [Project Structure](#project-structure)
4. [Files Created](#files-created)
5. [Commands Used](#commands-used)
6. [How It All Works Together](#how-it-all-works-together)
7. [Running the App](#running-the-app)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, make sure you have these installed on your computer:

### 1. Node.js (v18 or higher)
Node.js is a JavaScript runtime that lets you run JavaScript outside the browser.

**Check if installed:**
```bash
node --version
# Should show v18.x.x or higher
```

**Install:** Download from [nodejs.org](https://nodejs.org/)

### 2. npm (comes with Node.js)
npm is the package manager for Node.js - it helps you install libraries.

**Check if installed:**
```bash
npm --version
# Should show 9.x.x or higher
```

### 3. Git (optional but recommended)
For version control.

**Check if installed:**
```bash
git --version
```

### 4. A Code Editor
We recommend [VS Code](https://code.visualstudio.com/) or [Kiro](https://kiro.dev/)

---

## What is Electron?

Electron is a framework that lets you build desktop applications using web technologies (HTML, CSS, JavaScript/TypeScript). 

**Key Concepts:**

| Concept | Description |
|---------|-------------|
| **Main Process** | The "backend" of your app. Runs in Node.js, has access to the file system, can spawn processes, etc. |
| **Renderer Process** | The "frontend" of your app. Runs in a Chromium browser window, displays your UI (React in our case). |
| **Preload Script** | A bridge between Main and Renderer. Runs before the webpage loads and can expose safe APIs. |
| **IPC** | Inter-Process Communication - how Main and Renderer talk to each other. |

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON APP                            │
│                                                             │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │  MAIN PROCESS   │   IPC   │    RENDERER PROCESS     │   │
│  │  (Node.js)      │◄───────►│    (Chromium/React)     │   │
│  │                 │         │                         │   │
│  │  - File system  │         │  - UI Components        │   │
│  │  - Spawn Python │         │  - User interactions    │   │
│  │  - System APIs  │         │  - Display data         │   │
│  └────────┬────────┘         └────────────┬────────────┘   │
│           │                               │                 │
│           │         PRELOAD SCRIPT        │                 │
│           └──────────────┬────────────────┘                 │
│                          │                                  │
│                   window.api                                │
│                   (safe bridge)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

Here's what each folder and file does:

```
GoatedApp/
├── .gitignore              # Files Git should ignore
├── package.json            # Project config & dependencies
├── tsconfig.json           # TypeScript config for renderer
├── tsconfig.main.json      # TypeScript config for main process
├── tsconfig.preload.json   # TypeScript config for preload
├── vite.config.ts          # Vite bundler configuration
│
├── src/
│   ├── main/               # MAIN PROCESS (Node.js backend)
│   │   └── index.ts        # Entry point, creates window, IPC handlers
│   │
│   ├── preload/            # PRELOAD SCRIPT (bridge)
│   │   └── index.ts        # Exposes window.api to renderer
│   │
│   └── renderer/           # RENDERER PROCESS (React frontend)
│       ├── index.html      # HTML entry point
│       ├── main.tsx        # React entry point
│       ├── App.tsx         # Main React component
│       └── styles/
│           ├── global.css  # Global styles & CSS variables
│           └── App.css     # App-specific styles
│
├── dist/                   # Compiled output (generated)
│   ├── main/               # Compiled main process
│   ├── preload/            # Compiled preload script
│   └── renderer/           # Compiled React app
│
└── node_modules/           # Installed packages (generated)
```

---

## Files Created

### 1. `package.json` - Project Configuration

This file defines your project and its dependencies.

**Key sections:**

```json
{
  "name": "goated-app",           // Project name
  "version": "1.0.0",             // Version number
  "main": "dist/main/index.js",   // Entry point for Electron
  
  "scripts": {                    // Commands you can run
    "dev": "...",                 // Start development mode
    "build": "...",               // Build for production
    "package": "..."              // Create installer
  },
  
  "dependencies": {               // Runtime libraries
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  
  "devDependencies": {            // Development-only libraries
    "electron": "^34.0.0",
    "typescript": "^5.7.3",
    "vite": "^6.0.7"
    // ... more
  },
  
  "build": {                      // electron-builder config
    "appId": "com.goatedapp.app",
    "productName": "GoatedApp"
    // ... platform-specific settings
  }
}
```

### 2. `tsconfig.json` - TypeScript Configuration

TypeScript is JavaScript with types. This file tells TypeScript how to compile your code.

**We have 3 tsconfig files because each process has different needs:**

| File | Purpose | Output |
|------|---------|--------|
| `tsconfig.json` | Renderer (React) | No output (Vite handles it) |
| `tsconfig.main.json` | Main process | `dist/main/` |
| `tsconfig.preload.json` | Preload script | `dist/preload/` |

### 3. `vite.config.ts` - Vite Configuration

Vite is a fast build tool for web apps. It bundles your React code.

```typescript
export default defineConfig({
  plugins: [react()],           // Enable React support
  base: './',                   // Use relative paths
  root: 'src/renderer',         // Where React code lives
  build: {
    outDir: '../../dist/renderer'  // Where to output
  },
  server: {
    port: 5173                  // Dev server port
  }
});
```

### 4. `src/main/index.ts` - Main Process

This is the "backend" of your Electron app.

**What it does:**
- Creates the application window
- Sets up security settings
- Registers IPC handlers (API endpoints for the frontend)
- Manages app lifecycle (startup, shutdown)

**Key code explained:**

```typescript
// Create a window with security settings
mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    contextIsolation: true,      // Security: isolate contexts
    nodeIntegration: false,      // Security: no Node in renderer
    preload: path.join(__dirname, '../preload/index.js')
  }
});

// IPC handler example - frontend can call this
ipcMain.handle('app:getInfo', () => {
  return {
    name: app.getName(),
    version: app.getVersion()
  };
});
```

### 5. `src/preload/index.ts` - Preload Script

This creates a safe bridge between Main and Renderer.

**Why do we need this?**
- Renderer can't directly access Node.js APIs (security)
- Preload runs in a special context with limited access
- We expose only specific, safe functions via `window.api`

```typescript
// Expose safe API to renderer
contextBridge.exposeInMainWorld('api', {
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo')
  },
  backend: {
    getStatus: () => ipcRenderer.invoke('backend:status')
  }
  // ... more methods
});
```

**In your React code, you can then do:**
```typescript
const info = await window.api.app.getInfo();
```

### 6. `src/renderer/` - React Frontend

Standard React application structure:

- `index.html` - HTML template
- `main.tsx` - React entry point (renders App)
- `App.tsx` - Main component
- `styles/` - CSS files

### 7. CSS Design System

We use CSS variables for consistent styling:

```css
:root {
  /* Colors */
  --color-primary: #10A37F;        /* Green - main brand color */
  --color-bg-sidebar: #202123;     /* Dark sidebar */
  
  /* Typography */
  --font-family: 'Inter', sans-serif;
  --font-size-body: 15px;
  
  /* Spacing */
  --spacing-md: 16px;
  
  /* Border Radius */
  --radius-card: 8px;
}
```

---

## Commands Used

Here are all the commands we ran to set up the project:

### Step 1: Initialize the project
```bash
npm init -y
```
Creates a basic `package.json` file.

### Step 2: Install Electron
```bash
npm install --save-dev electron@latest
```
Installs Electron as a development dependency.

### Step 3: Install build tools
```bash
npm install --save-dev typescript vite @vitejs/plugin-react electron-builder concurrently wait-on
```

| Package | Purpose |
|---------|---------|
| `typescript` | TypeScript compiler |
| `vite` | Fast build tool for React |
| `@vitejs/plugin-react` | React support for Vite |
| `electron-builder` | Creates installers for Mac/Windows |
| `concurrently` | Run multiple commands at once |
| `wait-on` | Wait for dev server before starting Electron |

### Step 4: Install React
```bash
npm install react react-dom
npm install --save-dev @types/react @types/react-dom @types/node
```

### Step 5: Build the TypeScript
```bash
npm run build:main
```
Compiles `src/main/` and `src/preload/` to JavaScript in `dist/`.

---

## How It All Works Together

### Development Flow

```
1. You run: npm run dev

2. This runs two things concurrently:
   a) Vite dev server (http://localhost:5173)
      - Serves your React app
      - Hot reloads on changes
   
   b) Electron app
      - Waits for Vite to be ready
      - Opens a window pointing to localhost:5173

3. When you edit React code:
   - Vite instantly updates the browser
   - No restart needed!

4. When you edit Main/Preload code:
   - You need to restart the app
   - (We'll add hot reload for this later)
```

### Production Flow

```
1. You run: npm run build

2. This:
   a) Compiles TypeScript (main + preload)
   b) Bundles React with Vite

3. You run: npm run package

4. electron-builder creates:
   - Mac: .dmg installer
   - Windows: .exe installer
```

### IPC Communication Flow

```
RENDERER                    PRELOAD                     MAIN
   │                           │                          │
   │  window.api.app.getInfo() │                          │
   │ ─────────────────────────►│                          │
   │                           │  ipcRenderer.invoke()    │
   │                           │ ────────────────────────►│
   │                           │                          │
   │                           │                          │ (process request)
   │                           │                          │
   │                           │        response          │
   │                           │ ◄────────────────────────│
   │        response           │                          │
   │ ◄─────────────────────────│                          │
   │                           │                          │
```

---

## Running the App

### Development Mode

```bash
# First time: install dependencies
npm install

# Start the app
npm run dev
```

This will:
1. Compile TypeScript
2. Start Vite dev server
3. Open Electron window

### Production Build

```bash
# Build everything
npm run build

# Create installer
npm run package
```

---

## Troubleshooting

### "Cannot find module 'electron'"
```bash
# Reinstall electron
npm install --save-dev electron@latest
```

### "Port 5173 already in use"
```bash
# Find and kill the process
lsof -i :5173
kill -9 <PID>
```

### "window.api is undefined"
- Make sure preload script is compiled: `npm run build:main`
- Check the preload path in `src/main/index.ts`

### TypeScript errors
```bash
# Check for errors
npx tsc --noEmit

# Fix common issues
npm install --save-dev @types/node @types/react @types/react-dom
```

### Electron window is blank
- Check browser console (View → Toggle Developer Tools)
- Make sure Vite is running on port 5173
- Check for errors in terminal

---

## Next Steps

After this setup, the next tasks are:

1. **Task 1.2**: Configure Electron main process with security settings
2. **Task 1.3**: Create preload script with secure IPC bridge
3. **Task 2**: Checkpoint - Verify Electron shell launches correctly

See `tasks.md` for the full implementation plan.

---

## Glossary

| Term | Definition |
|------|------------|
| **Electron** | Framework for building desktop apps with web tech |
| **Main Process** | Node.js backend of Electron app |
| **Renderer Process** | Browser/UI part of Electron app |
| **Preload Script** | Bridge script between Main and Renderer |
| **IPC** | Inter-Process Communication |
| **Vite** | Fast build tool for web applications |
| **TypeScript** | JavaScript with static types |
| **React** | UI library for building interfaces |
| **npm** | Node Package Manager |

---

## File Reference

| File | Location | Purpose |
|------|----------|---------|
| `package.json` | Root | Project config |
| `tsconfig.json` | Root | TS config for renderer |
| `tsconfig.main.json` | Root | TS config for main |
| `tsconfig.preload.json` | Root | TS config for preload |
| `vite.config.ts` | Root | Vite bundler config |
| `index.ts` | `src/main/` | Main process entry |
| `index.ts` | `src/preload/` | Preload script |
| `index.html` | `src/renderer/` | HTML template |
| `main.tsx` | `src/renderer/` | React entry |
| `App.tsx` | `src/renderer/` | Main React component |
| `global.css` | `src/renderer/styles/` | Global styles |
| `App.css` | `src/renderer/styles/` | App styles |
