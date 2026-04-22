# 🖥️ PIMS Frontend — React Application

> The React 18 + Vite single-page application for the Pharmacy Information Management System. Provides role-specific dashboards and workflows for Doctors, Pharmacists, Administrators, and Patients.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Design System](#design-system)
- [Routing & Access Control](#routing--access-control)
- [State Management](#state-management)
- [Pages Reference](#pages-reference)
- [Components Reference](#components-reference)
- [Hooks Reference](#hooks-reference)
- [API Layer](#api-layer)
- [Notification System](#notification-system)
- [Role Portals & Login Flow](#role-portals--login-flow)
- [Build & Deployment](#build--deployment)

---

## Overview

The PIMS frontend is a **React 18** single-page application built with **Vite**. It uses **Redux Toolkit** for global state management and **React Router v6** for client-side routing with role-based access control.

Key design goals:
- **Premium UI** — dark-mode-first design system with custom CSS variables, smooth transitions, and micro-animations
- **Role isolation** — every page, route, and UI action is gated by the authenticated user's role
- **No mock data** — 100% database-driven; all data fetched from the live backend API
- **Custom notification system** — all feedback uses a centralized toast + modal system (no browser `alert()` or `confirm()` dialogs)

---

## Project Structure

```
Frontend/
├── public/
├── index.html
│
├── src/
│   ├── App.jsx                    # Root app, auth bootstrapping
│   ├── main.jsx                   # React DOM entry point
│   │
│   ├── api/
│   │   └── pimsApi.js             # All axios API calls (single source of truth)
│   │
│   ├── components/                # Shared/reusable components
│   │   ├── AppIcon.jsx            # Centralized SVG icon registry
│   │   ├── DarkModeToggle.jsx     # Dark/light mode toggle button
│   │   ├── RolePicker.jsx         # Role selection on landing pages
│   │   ├── StatCard.jsx           # Dashboard metric card
│   │   ├── ToastViewport.jsx      # Global toast notification renderer
│   │   └── Topbar.jsx             # Top navigation bar (user info, search, logout)
│   │
│   ├── constants/
│   │   └── roles.js               # ROLES enum (doctor, pharmacist, admin, patient)
│   │
│   ├── hooks/
│   │   ├── useDebouncedValue.js   # Debounce hook for search inputs
│   │   └── useToast.js            # Toast notification hook (notifySuccess, notifyError, etc.)
│   │
│   ├── layouts/
│   │   ├── MainLayout.jsx         # Shell for staff roles (sidebar + topbar + content)
│   │   └── PatientLayout.jsx      # Shell for patient portal (different nav structure)
│   │
│   ├── pages/                     # All 27 page components
│   │   ├── (see Pages Reference below)
│   │
│   ├── routes/
│   │   ├── AppRoutes.jsx          # All route definitions + role guards
│   │   └── ProtectedRoute.jsx     # RBAC wrapper component
│   │
│   ├── store/
│   │   ├── index.js               # Redux store configuration
│   │   └── slices/
│   │       ├── authSlice.js       # Authentication state
│   │       ├── inventorySlice.js  # Inventory data
│   │       ├── prescriptionsSlice.js # Prescriptions data
│   │       ├── adminUsersSlice.js # Admin user management
│   │       └── toastSlice.js      # Toast notification queue
│   │
│   ├── styles/
│   │   └── global.css             # Entire design system (CSS variables, components, utilities)
│   │
│   └── utils/
│       └── session.js             # localStorage helpers (token, role, display name)
│
├── vite.config.js
├── vercel.json                    # Vercel SPA fallback config
└── package.json
```

---

## Getting Started

```bash
cd Frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL in .env
npm run dev
```

App runs at `http://localhost:5173`.

---

## Environment Variables

**`Frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

For production (Vercel):
```env
VITE_API_BASE_URL=https://pharmacy-information-management-system.onrender.com/api
```

---

## Design System

All styling lives in `src/styles/global.css`. The system is built on **CSS custom properties (variables)** for full theme consistency.

### Color Tokens
```css
--bg              /* Page background */
--surface         /* Card / panel background */
--surface-muted   /* Muted secondary surface */
--text            /* Primary text */
--text-muted      /* Secondary / helper text */
--accent          /* Brand teal (#0f9b8e) */
--accent-strong   /* Darker accent */
--line            /* Borders */
--danger          /* Error / critical red */
```

### Component Classes

| Class | Purpose |
|---|---|
| `.page` | Root page wrapper with padding |
| `.panel` | Card-style content block with border |
| `.table-panel` | Full-width table container |
| `.table-wrap` | Scrollable table wrapper |
| `.data-table` | Styled HTML table |
| `.toolbar` | Flex row for action buttons |
| `.toolbar-group` | Grouped toolbar buttons |
| `.search-field` | Search input with icon |
| `.field-label` | Form label + input stack |
| `.field-grid` | Responsive form grid |
| `.field-grid.two` | 2-column form grid |
| `.section-title` | Icon + heading row |
| `.page-title` | Page-level heading block |
| `.helper-text` | Small grey descriptive text |
| `.caption` | Tiny uppercase label |
| `.status-pill` | Coloured status badge |
| `.notice-banner` | In-page warning/error banner |
| `.mini-list` | Compact list of items |
| `.button-primary` | Filled accent button |
| `.button-secondary` | Outlined button |
| `.button-ghost` | Text-only button |
| `.user-modal-backdrop` | Full-screen modal overlay |
| `.user-modal` | Modal content box |

### Toast Notifications
Notifications appear in the **bottom-right corner** of the screen with `z-index: 9999`. They slide up from the bottom on entry.

```
.toast-viewport → fixed, bottom: 1.5rem, right: 1.5rem
.toast         → individual notification card
```

---

## Routing & Access Control

All application routes are defined in `src/routes/AppRoutes.jsx`.

### Route Protection

Every protected route is wrapped in `<ProtectedRoute allowedRoles={[...]}>`:

```jsx
<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PHARMACIST]}>
  <MainLayout>
    <Prescriptions />
  </MainLayout>
</ProtectedRoute>
```

If the user's role is not in `allowedRoles`, they are redirected to their role's home page.

### Complete Route Table

| Path | Component | Allowed Roles |
|---|---|---|
| `/doctor/access` | `DoctorLandingPage` | Public |
| `/doctor/login` | `DoctorLoginPage` | Public |
| `/pharmacist/access` | `PharmacistLandingPage` | Public |
| `/pharmacist/login` | `PharmacistLoginPage` | Public |
| `/admin/access` | `AdminAccess` | Public |
| `/admin/login` | `AdminLoginPage` | Public |
| `/patient/access` | `PatientLandingPage` | Public |
| `/patient/login` | `PatientLoginPage` | Public |
| `/forgot-password` | `ForgotPassword` | Public |
| `/reset-password` | `ResetPassword` | Public |
| `/dashboard` | `Dashboard` | Doctor |
| `/prescription/new` | `Prescription` | Doctor |
| `/prescriptions` | `Prescriptions` | Doctor, Pharmacist |
| `/patients/:id/details` | `PatientRecordDetails` | Doctor, Pharmacist, Admin |
| `/atc` | `ATCClassification` | Doctor, Admin |
| `/pharmacist` | `PharmacistDashboard` | Pharmacist |
| `/inventory` | `Inventory` | Pharmacist |
| `/inventory/audit` | `InventoryAudit` | Pharmacist, Admin |
| `/alerts` | `Alerts` | Pharmacist |
| `/admin` | `AdminDashboard` | Admin |
| `/admin/users` | `Admin` | Admin |
| `/reports` | `Reports` | Admin |
| `/change-password` | `ChangePassword` | Doctor, Pharmacist, Admin |
| `/patient` | `PatientDashboard` | Patient |
| `/patient/profile` | `PatientProfile` | Patient |
| `/patient/prescriptions` | `PatientPrescriptions` | Patient |
| `/patient/change-password` | `ChangePassword` | Patient |

---

## State Management

Redux Toolkit manages all shared application state.

### Store Slices

#### `authSlice`
```
state.auth.token        — JWT string
state.auth.user         — { _id, email, role, firstName, lastName }
state.auth.role         — role string
state.auth.status       — 'idle' | 'checking' | 'authenticated' | 'unauthenticated'
```

#### `prescriptionsSlice`
```
state.prescriptions.items        — prescription list
state.prescriptions.pagination   — { page, limit, total, totalPages }
state.prescriptions.selected     — currently selected prescription (full detail)
state.prescriptions.isLoading    — boolean
state.prescriptions.isUpdating   — boolean (status change in progress)
state.prescriptions.errorMessage — string
```

#### `inventorySlice`
```
state.inventory.items       — inventory batch list
state.inventory.medicines   — medicine options for dropdowns
state.inventory.isLoading   — boolean
state.inventory.isSubmitting — boolean
state.inventory.errorMessage — string
```

#### `adminUsersSlice`
```
state.adminUsers.users       — user list
state.adminUsers.pagination  — pagination meta
state.adminUsers.isLoading   — boolean
state.adminUsers.errorMessage — string
```

#### `toastSlice`
```
state.toast.notifications — array of { id, type, title, message, duration }
```

---

## Pages Reference

### Doctor Pages

| Page | File | Description |
|---|---|---|
| Doctor Landing | `DoctorLandingPage.jsx` | Welcome page with role description and login CTA |
| Dashboard | `Dashboard.jsx` | Today's prescriptions, patient stats, quick actions |
| New Prescription | `Prescription.jsx` | Full prescription creation form with medicine picker, patient search, validation |
| ATC Classification | `ATCClassification.jsx` | Interactive WHO drug classification tree browser with accordion expand/collapse |

### Pharmacist Pages

| Page | File | Description |
|---|---|---|
| Pharmacist Landing | `PharmacistLandingPage.jsx` | Welcome page with role description |
| Pharmacist Dashboard | `PharmacistDashboard.jsx` | Pending queue, today's fills, inventory alerts KPIs |
| Prescriptions | `Prescriptions.jsx` | Full prescription management: filter, sort, paginate, view detail panel, change status |
| Inventory | `Inventory.jsx` | Batch management: create, edit, delete, restock; status filtering |
| Inventory Audit | `InventoryAudit.jsx` | Immutable audit log of all inventory mutations |
| Alerts | `Alerts.jsx` | Low stock & near-expiry alert management |

### Admin Pages

| Page | File | Description |
|---|---|---|
| Admin Access | `AdminAccess.jsx` | Admin landing page |
| Admin Dashboard | `AdminDashboard.jsx` | System-wide KPIs |
| User Management | `Admin.jsx` | Full CRUD for all users; create patient portals; activate/deactivate/delete |
| Reports | `Reports.jsx` | Prescription, inventory, and revenue analytics with charts |
| Inventory Audit | `InventoryAudit.jsx` | Same audit log accessible to admins |

### Patient Pages

| Page | File | Description |
|---|---|---|
| Patient Landing | `PatientLandingPage.jsx` | Patient portal welcome page |
| Patient Dashboard | `PatientDashboard.jsx` | Health summary, upcoming prescriptions |
| Patient Prescriptions | `PatientPrescriptions.jsx` | Own prescription history with medicine details |
| Patient Profile | `PatientProfile.jsx` | Edit personal details, allergies, contact info |

### Shared Pages

| Page | File | Description |
|---|---|---|
| Patient Record Details | `PatientRecordDetails.jsx` | Full medical record: history, allergies, prescriptions, demographics |
| Change Password | `ChangePassword.jsx` | Password change form (works for all roles) |
| Forgot Password | `ForgotPassword.jsx` | Send password reset email |
| Reset Password | `ResetPassword.jsx` | Set new password via email token |
| Login | `Login.jsx` | Generic login form (role-agnostic) |

---

## Components Reference

| Component | File | Description |
|---|---|---|
| `AppIcon` | `AppIcon.jsx` | Centralized SVG icon registry. Pass `name="search"` to render any icon. All icons are inline SVG for performance. |
| `Topbar` | `Topbar.jsx` | Top navigation bar. Displays user name, role, quick search, dark mode toggle, and logout button. Uses `session.js` for display data. |
| `ToastViewport` | `ToastViewport.jsx` | Reads from `toastSlice` and renders all active notifications in the bottom-right corner. Handles auto-dismiss timers. |
| `DarkModeToggle` | `DarkModeToggle.jsx` | Toggles `data-theme="dark"` on `<html>`. Persists preference to `localStorage`. |
| `RolePicker` | `RolePicker.jsx` | Used on landing pages for role selection UI. |
| `StatCard` | `StatCard.jsx` | Reusable metric card for dashboards. |

---

## Hooks Reference

### `useToast()`
```js
const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useToast();

notifySuccess('Title', 'Message body', 4000); // duration in ms (optional, default 4000)
notifyError('Title', 'Message body');
notifyWarning('Title', 'Message body', 7000);
```

Dispatches to `toastSlice`. `ToastViewport` renders the notification.

### `useDebouncedValue(value, delayMs)`
```js
const debouncedQuery = useDebouncedValue(searchInput, 300);
// Returns the value only after 300ms of no changes
// Used on all search inputs to prevent excessive API calls
```

---

## API Layer

All HTTP calls are centralized in `src/api/pimsApi.js`. It uses a single **Axios instance** with:
- `baseURL` from `VITE_API_BASE_URL`
- Request interceptor: automatically attaches `Authorization: Bearer <token>` from `localStorage`
- Response interceptor: extracts error messages from backend JSON responses

```js
// Example usage (already set up in pimsApi.js)
import { listPrescriptions, createPrescription } from '../api/pimsApi';

const data = await listPrescriptions({ page: 1, limit: 20, status: 'Pending' });
```

---

## Notification System

PIMS uses a **custom notification system** with two display modes:

### 1. Toast Notifications (bottom-right)
Used for non-blocking feedback on async operations:
- ✅ Success messages (prescription created, inventory updated)
- ❌ Brief error messages
- ⚠️ Warnings (SMTP not configured, etc.)

### 2. Custom Confirm/Error Modals (center-screen)
Used in place of `window.confirm()` and `window.alert()` for:
- **Destructive actions** — delete user, delete inventory batch (red "Delete" button)
- **Status changes** — pharmacist marks prescription as Filled/Processing/Cancelled
- **Critical errors** — insufficient stock when filling a prescription (stays on screen until dismissed)
- **Credential display** — patient portal login URL + temporary password shown in a structured modal after creation

> No native browser `alert()`, `confirm()`, or `prompt()` dialogs are used anywhere in the application.

---

## Role Portals & Login Flow

Each role has a dedicated landing page and login page:

```
/doctor/access     → Doctor landing → /doctor/login     → /dashboard
/pharmacist/access → Pharmacist landing → /pharmacist/login → /pharmacist
/admin/access      → Admin landing → /admin/login       → /admin
/patient/access    → Patient landing → /patient/login   → /patient
```

On login:
1. `authSlice` calls `POST /api/auth/login`
2. JWT + user object stored in Redux state AND `localStorage`
3. `AppHomeRedirect` reads stored role and navigates to the role's home path

On logout:
1. Frontend calls `POST /api/auth/logout` (backend blacklists the token)
2. Redux state cleared
3. `localStorage` cleared
4. User redirected to role's login page

---

## Build & Deployment

### Development
```bash
npm run dev      # Vite dev server with HMR at http://localhost:5173
```

### Production Build
```bash
npm run build    # Outputs to Frontend/dist/
npm run preview  # Preview production build locally
```

### Deployment (Vercel)

- **Framework:** Vite (Static Build)
- **Output directory:** `dist`
- **SPA routing:** `vercel.json` routes all paths to `index.html`
- **Auto-deploy:** On push to `main` via GitHub integration

**Required environment variable in Vercel dashboard:**
```
VITE_API_BASE_URL=https://pharmacy-information-management-system.onrender.com/api
```

The app is live at: **https://pims-sys.vercel.app**

---

*PIMS Frontend v1.0.0 — React 18 + Vite + Redux Toolkit*
