# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Firebase Functions
- `cd functions && npm run serve` - Start Firebase Functions emulator on port 5001
- `cd functions && npm run lint` - Run ESLint on Functions code
- `cd functions && npm run deploy` - Deploy Functions to Firebase
- `cd functions && npm run logs` - View Function logs

### Firebase Hosting & Emulators
- `firebase emulators:start` - Start all emulators (Functions on 5001, Hosting on 5002, UI on 8888)
- `firebase deploy` - Deploy entire project
- `firebase deploy --only hosting` - Deploy only frontend
- `firebase serve` - Serve frontend locally

### Linting
- `npx eslint .` - Lint root project files
- `cd functions && npm run lint` - Lint Functions code

## Project Architecture

### Firebase Functions Backend (`/functions/`)
The backend uses Firebase Functions v2 with Express.js routing:

- **`index.js`** - Main entry point with Express app setup, CORS, and route mounting
- **`adminServer.js`** - Admin routes for managing members, events, forms, news, maps
- **`userServer.js`** - Public user routes with Firebase Auth middleware
- **`utils.js`** - Shared utilities including email sending, auth middleware, logging

**Key Collections:**
- `members` - User member data
- `events` - Event management
- `forms` - Dynamic form builder
- `responses` - Form responses
- `news` - News/announcements
- `history` - Activity logs
- `maps` - Map/location data
- `conferenceRecords` - Meeting records and file metadata

### Frontend (`/frontend/`)
Static HTML/CSS/JS website served by Firebase Hosting:

- **Main Pages:** `index.html`, `about.html`, `services.html`, `events.html`, `foodMaps.html`, `login.html`, `memberPage.html`, `admin.html`
- **Global Components:** `/global/navBar.html`, `/global/toTop.html`
- **JavaScript Structure:**
  - `src/env.js` - Environment configuration (localhost vs production API URLs)
  - `src/global.js` - Mobile navigation and scroll-to-top functionality
  - `src/utils.js` - Utility functions for datetime, auth state management
  - Page-specific JS files (e.g., `admin.js`, `events.js`, `foodMaps.js`)

### Authentication & API
- Uses Firebase Authentication with ID token verification
- Local development: Functions on `http://127.0.0.1:5002`
- Production: API routes via Firebase Hosting rewrites (`/api/**` → `api` function)
- CORS enabled for cross-origin requests

### Key Features
- **Admin Panel**: Full CRUD operations for all content types
- **Member System**: User registration, verification, profile management
- **Dynamic Forms**: Form builder with response collection
- **Food Maps**: Interactive Google Maps integration
- **Email Verification**: SendGrid integration for user verification
- **reCAPTCHA**: v2 integration for form protection
- **Conference Records**: File upload/download system with Firebase Storage integration

### Environment Variables
Functions require:
- `SESSION_SECRET` - For Express sessions
- SendGrid API key for email functionality
- Firebase Admin SDK credentials (auto-configured in production)

### Development Setup
1. Install dependencies: `npm install` (root) and `cd functions && npm install`
2. Set up Firebase project and authentication
3. Configure environment variables in `functions/.env` for local development
4. Start emulators: `firebase emulators:start`
5. Access: Frontend at localhost:5002, Functions at localhost:5001, Emulator UI at localhost:8888