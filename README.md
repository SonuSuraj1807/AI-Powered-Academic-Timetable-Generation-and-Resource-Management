# VBIT Academic Timetable & Resource Management System

An AI-powered academic scheduling system designed for Vignana Bharathi Institute of Technology (VBIT). Features constraint-solving timetable generation, DSatur/Welsh-Powell exam scheduling, real-time notification streams, and styled Excel/PDF exports.

---

## 🚀 How to Run Locally

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18 or newer recommended).

### 2. Install Dependencies
In the project root directory, install all required packages:
```bash
npm install
```

### 3. Start Development Server
Launch the local Vite server:
```bash
npm run dev
```
Open your browser to `http://localhost:5173/` to view the portal gateway.

---

## 🔑 How to Access Each Portal

The system uses Firebase Authentication for login and verifies the user's role against their profile in Cloud Firestore.

### Option A: Set Up Real Firebase Accounts (Recommended)
To sign in using the landing page login cards:
1. Open the **Firebase Console** for your project.
2. Go to **Authentication** and create a user account (Email/Password).
3. Copy the account `UID`.
4. Go to **Cloud Firestore** and create a document in the `users` collection with the document ID set to the user's `UID`:
   * **Admin Account:**
     ```json
     {
       "email": "admin@example.com",
       "displayName": "Admin Name",
       "role": "admin",
       "department": "CSE-DS"
     }
     ```
   * **Faculty Account:**
     ```json
     {
       "email": "faculty@example.com",
       "displayName": "Professor Name",
       "role": "faculty",
       "department": "CSE-DS"
     }
     ```
   * **Student Account:**
     ```json
     {
       "email": "student@example.com",
       "displayName": "Student Name",
       "role": "student",
       "department": "CSE-DS",
       "regulation": "R25",
       "section": "A"
     }
     ```
5. Log in through the corresponding card on the landing page (e.g. log in with the admin email through the Admin portal card).

---

### Option B: Quick Developer Preview (Bypass Authentication)
If you want to quickly inspect and review each dashboard UI without setting up Firestore database entries:

Open [src/App.jsx](file:///Users/apple/Desktop/AI-Powered%20Academic%20Timetable%20Generation%20and%20Resource%20Management/src/App.jsx) and edit the `ProtectedRoute` component around line 37 to immediately return `children` instead of redirecting:

```jsx
// Change this:
function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading, initialized } = useAuthStore();

  if (!initialized || loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && role !== requiredRole) {
    const roleRoutes = { admin: '/admin', faculty: '/faculty', student: '/student' };
    return <Navigate to={roleRoutes[role] || '/'} replace />;
  }

  return children;
}

// To this (Temporary Developer Bypass):
function ProtectedRoute({ children, requiredRole }) {
  return children;
}
```

Once modified, you can directly access the dashboards by typing these URLs in your browser:
* **Admin Dashboard:** `http://localhost:5173/admin`
* **Faculty Dashboard:** `http://localhost:5173/faculty`
* **Student Dashboard:** `http://localhost:5173/student`

---

## 🛠️ Project Structure & Key Modules
* **Timetable Constraint Solver:** `src/lib/scheduling/TimetableEngine.js`
* **Smart Swap Sub Finder:** `src/lib/scheduling/SmartSwapEngine.js`
* **Exam Graph-Coloring DSatur Solver:** `src/lib/scheduling/ExamScheduler.js`
* **Excel Export Worker:** `src/lib/export/excelExporter.js`
* **PDF Export Worker:** `src/lib/export/pdfExporter.js`
* **Hardware Attendance Mock Service:** `src/services/BiometricRFIDIntegrationService.js`
