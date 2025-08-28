# NUTN EESA Website & Management System

## 專案簡介｜Introduction

This is the official website and internal management system for the National University of Tainan (NUTN) Department of Electrical Engineering Student Association (EESA). The project is built with a modern web stack, leveraging the Firebase platform for a robust, scalable, and serverless architecture.

This document serves as a comprehensive guide for developers, administrators, and AI assistants working on this project.

## 主要技術｜Core Technologies

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Backend:** Node.js with Express.js
*   **Platform:** Firebase (Serverless)
*   **Database:** Firestore (NoSQL)
*   **Deployment:** GitHub Actions for CI/CD

## Firebase 服務｜Firebase Services Used

This project heavily utilizes the Firebase ecosystem for its core functionality:

*   **Firebase Hosting:** Hosts the static frontend assets (`frontend/` directory) and provides global CDN, SSL, and custom domain support. It's configured with rewrites to direct API calls to the backend functions.
*   **Firebase Functions:** Powers the entire backend logic. A single Express.js application is deployed as a v2 Cloud Function, providing a robust API for the frontend.
*   **Firebase Authentication:** Manages user identity, including registration, login, email verification, and secure session management using ID tokens.
*   **Cloud Firestore:** The primary NoSQL database for storing all application data, including member profiles, events, news, form responses, and more.
*   **Firebase Storage:** Used for storing user-uploaded files, such as images for photo albums, restaurant menus, and documents for conference records.
*   **Firebase Analytics:** Provides insights into user engagement and application usage.

## 專案結構｜Project Structure

The repository is organized into two main parts: the frontend application and the backend functions.

```
/
├── frontend/           # All client-side code (HTML, CSS, JS, assets)
│   ├── src/            # CSS and JavaScript source files
│   ├── assets/         # Images, fonts, and other media
│   ├── global/         # Reusable HTML fragments (navbar, etc.)
│   └── *.html          # Main HTML pages (index, login, admin, etc.)
│
├── functions/          # All backend server-side code (Firebase Functions)
│   ├── node_modules/   # Backend dependencies
│   ├── .env.example    # Example environment file for local development
│   ├── adminServer.js  # API routes for administrators
│   ├── userServer.js   # API routes for public users
│   ├── utils.js        # Shared utility functions
│   ├── index.js        # Main entry point for the Express API
│   └── package.json    # Backend dependencies and scripts
│
├── .firebaserc         # Firebase project configuration
├── firebase.json       # Firebase deployment and emulator settings
├── package.json        # Root-level scripts and dependencies
└── README.md           # This file
```

## 本地開發環境設置｜Local Development Setup

Follow these steps to run the project on your local machine.

### 1. 先決條件｜Prerequisites

*   **Node.js:** Version 18 or higher.
*   **Firebase CLI:** Make sure you have the latest version installed (`npm install -g firebase-tools`).
*   **Firebase Project:** You must have access to the project on the [Firebase Console](https://console.firebase.google.com/).

### 2. 安裝｜Installation

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Root Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Functions Dependencies:**
    ```bash
    cd functions
    npm install
    cd ..
    ```

### 3. 設定｜Configuration

#### Backend (`functions/.env`)

The backend functions require environment variables for local development.

1.  Navigate to the `functions` directory.
2.  Create a `.env` file by copying the example: `cp .env.example .env`.
3.  Fill in the required values in the `.env` file. You will need secrets for:
    *   `SESSION_SECRET`: A random string for Express sessions.
    *   `SENDGRID_API_KEY`: Your API key for SendGrid (for sending verification emails).
    *   `GOOGLE_MAPS_API_KEY`: Your Google Maps API key.
    *   `RECAPTCHA_SERVER_SECRET`: Your reCAPTCHA v2 secret key.

    *Note: In the production Firebase environment, these are configured as environment variables directly in the Google Cloud console and do not need to be set in a file.*

#### Frontend (`frontend/src/env.js`)

The frontend needs to know the API endpoint URL and other client-side keys.

1.  Navigate to the `frontend/src` directory.
2.  Create an `env.js` file.
3.  Add the following content to `env.js`, filling in your project-specific Firebase configuration:

    ```javascript
    // For local development using Firebase Emulators
    const API_URL = "http://127.0.0.1:5001/nutneesa-b8ea5/us-central1";

    // For production, the API_URL can be a relative path
    // const API_URL = "";

    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID",
      measurementId: "YOUR_MEASUREMENT_ID"
    };

    const recaptchaSiteKey = "YOUR_RECAPTCHA_SITE_KEY";
    ```
    *Note: This `env.js` file should be added to `.gitignore` to avoid committing credentials to source control.*

### 4. 啟動 Firebase 模擬器｜Running the Emulators

The Firebase Local Emulator Suite is used to run the entire application locally.

1.  **Log in to Firebase:**
    ```bash
    firebase login
    ```

2.  **Select your Firebase Project:**
    ```bash
    firebase use <your-firebase-project-id>
    ```

3.  **Start the Emulators:**
    ```bash
    firebase emulators:start
    ```

This command will start emulators for Functions, Firestore, Hosting, Auth, and Storage. You can access the services at the following URLs:

*   **Website:** [http://127.0.0.1:5002](http://127.0.0.1:5002)
*   **Functions API Base:** `http://127.0.0.1:5001/<your-project-id>/<region>`
*   **Emulator Suite UI:** [http://127.0.0.1:4000](http://127.0.0.1:4000) (For viewing data in Firestore, Auth, etc.)

## 實用指令｜Useful Commands

*   `firebase deploy`: Deploy the entire project (hosting and functions).
*   `firebase deploy --only hosting`: Deploy only the frontend website.
*   `firebase deploy --only functions`: Deploy only the backend functions.
*   `cd functions && npm run lint`: Run the linter on the backend code.
*   `firebase functions:log`: View logs for the deployed functions in production.
