# PIMS — Pharmacy Information Management System

> **Version:** 1.2.0-stable | **Status:** Active Development | **Sprint:** April 2025
>
> A role-based, full-stack healthcare web application for managing ATC-classified prescriptions, drug inventory, and pharmacy workflows. Built on the **MERN stack** — **MongoDB** (database), **Express.js + Node.js** (backend), and **React + Vite** (frontend).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Roles](#2-system-roles)
3. [Screen Inventory (UI Reference)](#3-screen-inventory-ui-reference)
4. [Tech Stack](#4-tech-stack)
5. [ATC Classification](#5-atc-classification)
6. [Full Folder Structure — Frontend](#6-full-folder-structure--frontend)
7. [Full Folder Structure — Backend](#7-full-folder-structure--backend)
8. [Database Models](#8-database-models)
9. [API Routes Reference](#9-api-routes-reference)
10. [RBAC — Role Based Access Control](#10-rbac--role-based-access-control)
11. [Business Logic](#11-business-logic)
12. [Environment Variables](#12-environment-variables)
13. [Setup & Run Instructions](#13-setup--run-instructions)
14. [MVP Scope — April 2025](#14-mvp-scope--april-2025)
15. [April Sprint Plan](#15-april-sprint-plan)
16. [Dataset Sources & References](#16-dataset-sources--references)
17. [Open Source References](#17-open-source-references)
18. [Viva / Demo Line](#18-viva--demo-line)

---

## 1. Project Overview

PIMS is a role-based healthcare application designed to manage prescriptions, medicines, and inventory using the **WHO ATC (Anatomical Therapeutic Chemical)** classification system.

**Three user roles** interact with the system:

- **Doctor** — creates patient profiles, generates ATC-based prescriptions, views history
- **Pharmacist** — manages drug inventory, monitors stock levels and expiry, dispenses prescriptions
- **Admin** — manages system users, assigns roles, monitors audit logs and system health

**Core user journey:**

```
Doctor logs in → Searches ATC drug tree → Builds prescription → Submits to Pharmacy
Pharmacist receives prescription → Checks inventory → Dispenses → Updates stock
Admin monitors → Manages users → Views reports → Gets system alerts
```

**Platforms delivered:**

| Platform    | Technology          | Status       |
|-------------|---------------------|--------------|
| Web App     | React + Vite        | Primary MVP  |

---

## 2. System Roles

| Role        | Dashboard         | Key Permissions                                                  |
|-------------|-------------------|------------------------------------------------------------------|
| `DOCTOR`    | Doctor Dashboard  | Create prescription, search ATC tree, view patient records       |
| `PHARMACIST`| Pharmacist Dashboard | View/dispense prescriptions, manage inventory, receive alerts |
| `ADMIN`     | Admin Dashboard   | Manage users, assign roles, view audit logs, sync ATC database   |

Role is selected at login. JWT token carries the role. All routes are protected by `role.middleware.js`.

---

## 3. Screen Inventory (UI Reference)

All screens are designed in Visily. Use these as the **exact build specification** — every screen = one task in the backlog.

| # | Screen Name             | Role        | File to Build              | Key Components                                                   |
|---|-------------------------|-------------|----------------------------|------------------------------------------------------------------|
| 1 | Login / Role Select     | All         | `Login.jsx`                | Role selector (Doctor/Pharmacist/Admin), email, password, JWT    |
| 2 | Doctor Dashboard        | Doctor      | `Dashboard.jsx`            | Create Prescription CTA, Patient Lookup, Quick ATC Search, Recent Rx table, stat cards |
| 3 | Pharmacist Dashboard    | Pharmacist  | `Dashboard.jsx`            | Inventory Health cards, Incoming Prescriptions feed, Urgent Alerts panel, Quick Inventory Check |
| 4 | Admin Dashboard         | Admin       | `Dashboard.jsx`            | System stats (Active Users, Daily Rx, Inventory Value, Security Score), User Activity Log, Quick Actions, System Health Alerts |
| 5 | ATC Drug Classification | Doctor      | `ATCClassification.jsx`    | Classification tree (left panel), Drug detail panel (right), Matched medicines table, Clinical notes |
| 6 | New Prescription        | Doctor      | `Prescription.jsx`         | Patient Info form, Medicine Picker (ATC search), Prescription Items table, Validation Status, Submit to Pharmacy |
| 7 | Prescription Management | Doctor      | `Prescriptions.jsx`        | Prescriptions table with filters, Prescription Detail side panel, Print PDF, Share with Pharmacy |
| 8 | Inventory Management    | Pharmacist  | `Inventory.jsx`            | Inventory stats, Medicine table (ATC Code, Stock, Batch, Expiry Status), Add Medicine, Audit Logs |
| 9 | System Alerts           | Pharmacist  | `Alerts.jsx`               | Critical Low Stock alerts, Expiring Soon alerts, Standard Warnings, Acknowledge/Restock actions |
| 10| Reports & Analytics     | Admin       | `Reports.jsx`              | Prescription volume chart, Stock flow chart, Fulfillment Performance table, Top ATC Usage list |
| 11| User Management         | Admin       | `Admin.jsx`                | System Users table, Create New User modal (role assignment), Security protocol auto-password    |

---

## 4. Tech Stack — MERN

> **M** — MongoDB · **E** — Express.js · **R** — React · **N** — Node.js

### Frontend (React)

| Technology        | Version  | Purpose                                      |
|-------------------|----------|----------------------------------------------|
| React             | ^18.x    | UI component framework                       |
| Vite              | ^5.x     | Build tool and dev server                    |
| Redux Toolkit     | ^2.x     | Global state management                      |
| React Router DOM  | ^6.x     | Client-side routing and protected routes     |
| Axios             | ^1.x     | HTTP client for API calls                    |
| Ant Design (AntD) | ^5.x     | UI component library matching Visily designs |
| React Hook Form   | ^7.x     | Form state and validation                    |

### Backend (Express + Node + MongoDB)

| Technology    | Version | Purpose                                        |
|---------------|---------|------------------------------------------------|
| Node.js       | v20 LTS | JavaScript runtime                             |
| Express.js    | ^4.x    | REST API framework                             |
| MongoDB       | ^7.x    | Primary database (NoSQL)                       |
| Mongoose      | ^8.x    | MongoDB ODM (schema + models)                  |
| JWT           | ^9.x    | Authentication tokens                          |
| bcryptjs      | ^2.x    | Password hashing                               |
| Puppeteer     | ^22.x   | Headless Chrome — PDF prescription generation |
| Nodemailer    | ^6.x    | Email — share Rx to pharmacy                   |
| node-cron     | ^3.x    | Scheduled jobs (expiry checks)                 |
| cors          | ^2.x    | Cross-Origin Resource Sharing                  |
| dotenv        | ^16.x   | Environment variable management                |
| express-validator | ^7.x| Request validation                             |
| helmet        | ^7.x    | HTTP security headers                          |

### DevOps

| Technology   | Purpose                     |
|--------------|-----------------------------|
| Docker       | Containerisation            |
| Nginx        | Reverse proxy + static serve|
| MongoDB Atlas| Cloud database hosting      |

---

## 5. ATC Classification

**ATC = Anatomical Therapeutic Chemical** — WHO standard for classifying drugs.

```
Level 1 — Anatomical group     → A        (Alimentary tract & metabolism)
Level 2 — Therapeutic subgroup → A10      (Drugs used in diabetes)
Level 3 — Pharmacological      → A10B     (Blood glucose lowering drugs)
Level 4 — Chemical             → A10BA    (Biguanides)
Level 5 — Chemical substance   → A10BA02  (Metformin)
```

**How your app uses ATC:**

- ATC tree stored in `atc_codes` collection in MongoDB
- Doctor browses the tree from Level 1 → Level 5 to find a drug
- Each drug in inventory has an `atcCode` field (e.g. `J01CA04`)
- Reports group prescriptions by ATC category (screen 10)
- Inventory table shows ATC code per medicine (screen 8)

**Dataset source:**

```
Primary:  github.com/fabkury/atcd         → Free CSV · 6,331 codes · All 5 levels
Official: atcddd.fhi.no                   → WHO WHOCC · Free with registration
Kaggle:   kaggle.com/datasets/remulusbi/who-atcddd → Pre-packaged CSV
```

**Seeding the ATC database (P2 owns this — Day 1):**

```bash
cd backend
node src/jobs/seedATC.js
# Reads atc_codes.csv → inserts into MongoDB atc_codes collection
```

---

## 6. Full Folder Structure — Frontend

```
/frontend
│
├── /public
│   └── favicon.ico
│
├── /src
│   │
│   ├── /assets
│   │   ├── logo.png                    # PIMS logo (used in topbar + login)
│   │   └── icons/                      # SVG icons
│   │
│   ├── /components                     # Reusable UI components (used across pages)
│   │   ├── Button.jsx                  # Primary, secondary, danger variants
│   │   ├── Input.jsx                   # Text, password, search input
│   │   ├── Modal.jsx                   # Generic modal wrapper (used in User Management)
│   │   ├── Table.jsx                   # Sortable, filterable data table
│   │   ├── Sidebar.jsx                 # Left nav — role-aware menu items
│   │   ├── Topbar.jsx                  # Top bar — search, alerts bell, user info
│   │   ├── StatCard.jsx                # Dashboard metric cards (Total Rx, Low Stock etc)
│   │   ├── AlertBadge.jsx              # Critical / Warning / Stable badge pill
│   │   ├── RolePicker.jsx              # Login screen role selector (Doctor/Pharmacist/Admin)
│   │   └── ATCTreeNode.jsx             # Recursive tree node for ATC classification tree
│   │
│   ├── /layouts
│   │   ├── MainLayout.jsx              # Sidebar + Topbar shell — wraps all authenticated pages
│   │   └── AuthLayout.jsx             # Centered layout for Login page only
│   │
│   ├── /pages                          # One file per screen in the UI reference
│   │   ├── Login.jsx                   # Screen 1: Role select + email + password
│   │   ├── Dashboard.jsx               # Screen 2/3/4: Renders Doctor/Pharmacist/Admin dashboard by role
│   │   ├── ATCClassification.jsx       # Screen 5: ATC tree + drug detail panel
│   │   ├── Prescription.jsx            # Screen 6: New prescription form
│   │   ├── Prescriptions.jsx           # Screen 7: Prescription management list
│   │   ├── Inventory.jsx               # Screen 8: Inventory management table
│   │   ├── Alerts.jsx                  # Screen 9: System alerts
│   │   ├── Reports.jsx                 # Screen 10: Reports & analytics
│   │   └── Admin.jsx                   # Screen 11: User management
│   │
│   ├── /features                       # Redux slices — one folder per domain
│   │   │
│   │   ├── /auth
│   │   │   ├── authSlice.js            # user, token, role state; login/logout reducers
│   │   │   └── authAPI.js              # POST /api/auth/login, POST /api/auth/logout
│   │   │
│   │   ├── /atc
│   │   │   ├── atcSlice.js             # ATC tree data, selected node, matched medicines
│   │   │   └── atcAPI.js               # GET /api/atc/tree, GET /api/atc/:code
│   │   │
│   │   ├── /inventory
│   │   │   ├── inventorySlice.js       # medicines list, filters, pagination state
│   │   │   └── inventoryAPI.js         # GET/POST/PUT/DELETE /api/inventory
│   │   │
│   │   ├── /prescription
│   │   │   ├── prescriptionSlice.js    # current Rx draft, Rx list, selected Rx detail
│   │   │   └── prescriptionAPI.js      # GET/POST /api/prescriptions
│   │   │
│   │   ├── /patient
│   │   │   ├── patientSlice.js         # patient search results, selected patient
│   │   │   └── patientAPI.js           # GET /api/patients, POST /api/patients
│   │   │
│   │   ├── /alerts
│   │   │   ├── alertsSlice.js          # alerts list, critical count, acknowledge state
│   │   │   └── alertsAPI.js            # GET /api/alerts, PUT /api/alerts/:id/acknowledge
│   │   │
│   │   └── /admin
│   │       ├── adminSlice.js           # users list, system stats, activity log
│   │       └── adminAPI.js             # GET/POST /api/admin/users, GET /api/admin/stats
│   │
│   ├── /services
│   │   ├── api.js                      # Axios instance — base URL, auth header interceptor
│   │   ├── authService.js              # login(), logout(), refreshToken()
│   │   ├── inventoryService.js         # getMedicines(), addMedicine(), updateStock()
│   │   ├── prescriptionService.js      # createPrescription(), getPrescriptions(), printPDF()
│   │   ├── patientService.js           # getPatient(), createPatient(), lookupByID()
│   │   ├── atcService.js               # getATCTree(), getATCDetail(), searchATC()
│   │   └── alertService.js             # getAlerts(), acknowledgeAlert(), restockRequest()
│   │
│   ├── /hooks
│   │   ├── useAuth.js                  # Returns { user, role, isAuthenticated, logout }
│   │   ├── useDebounce.js              # Debounce hook for ATC search input
│   │   └── useAlerts.js                # Poll alerts endpoint every 60s
│   │
│   ├── /utils
│   │   ├── formatDate.js               # formatDate(iso) → "Oct 24, 2023"
│   │   ├── formatCurrency.js           # formatCurrency(1200000) → "$1.2M"
│   │   ├── helpers.js                  # getStatusColor(), getRoleBadge(), truncate()
│   │   └── pdfExport.js                # Trigger PDF download from prescription data
│   │
│   ├── /constants
│   │   ├── roles.js                    # export const ROLES = { DOCTOR, PHARMACIST, ADMIN }
│   │   └── apiEndpoints.js             # All API URL strings in one place
│   │
│   ├── /store
│   │   └── store.js                    # Redux store — combines all slices
│   │
│   ├── /routes
│   │   ├── AppRoutes.jsx               # All routes defined here with role guards
│   │   └── ProtectedRoute.jsx          # Redirects to /login if not authenticated or wrong role
│   │
│   ├── App.jsx                         # Root component — wraps Router + Redux Provider
│   └── main.jsx                        # Entry point — mounts App into #root
│
├── index.html
├── package.json
└── vite.config.js
```

### Frontend Routing Map

| Path                    | Component              | Roles Allowed              |
|-------------------------|------------------------|----------------------------|
| `/`                     | → redirect to `/login` | Public                     |
| `/login`                | `Login.jsx`            | Public                     |
| `/dashboard`            | `Dashboard.jsx`        | DOCTOR, PHARMACIST, ADMIN  |
| `/atc`                  | `ATCClassification.jsx`| DOCTOR                     |
| `/prescription/new`     | `Prescription.jsx`     | DOCTOR                     |
| `/prescriptions`        | `Prescriptions.jsx`    | DOCTOR, PHARMACIST         |
| `/inventory`            | `Inventory.jsx`        | PHARMACIST                 |
| `/alerts`               | `Alerts.jsx`           | PHARMACIST                 |
| `/reports`              | `Reports.jsx`          | ADMIN                      |
| `/admin/users`          | `Admin.jsx`            | ADMIN                      |

---

## 7. Full Folder Structure — Backend

```
/backend
│
├── /src
│   │
│   ├── /config
│   │   ├── db.js                       # MongoDB connection via Mongoose
│   │   └── env.js                      # Validates required env vars on startup
│   │
│   ├── /models                         # Mongoose schemas — one file per collection
│   │   ├── user.model.js               # _id, name, email, passwordHash, role, isActive, createdAt
│   │   ├── atc.model.js                # code, name, level, parentCode, description
│   │   ├── medicine.model.js           # name, genericName, brand, atcCode, strength, form, manufacturer
│   │   ├── patient.model.js            # patientId, name, dob, gender, allergies[], medicalHistory[]
│   │   ├── prescription.model.js       # rxId, patientId, doctorId, items[], status, digitalSignature, createdAt
│   │   ├── inventory.model.js          # medicineId, atcCode, batchId, currentStock, threshold, expiryDate, storage, status
│   │   └── alert.model.js              # type, medicineId, message, severity, isAcknowledged, createdAt
│   │
│   ├── /controllers                    # HTTP handlers — one per domain
│   │   ├── auth.controller.js          # login(), logout(), getMe()
│   │   ├── user.controller.js          # getAllUsers(), createUser(), updateUser(), deleteUser()
│   │   ├── atc.controller.js           # getTree(), getByCode(), searchATC()
│   │   ├── medicine.controller.js      # getAllMedicines(), getMedicineById(), createMedicine(), updateMedicine()
│   │   ├── patient.controller.js       # getPatient(), createPatient(), updatePatient(), lookupById()
│   │   ├── prescription.controller.js  # createPrescription(), getPrescriptions(), getById(), updateStatus(), generatePDF()
│   │   ├── inventory.controller.js     # getInventory(), addStock(), updateStock(), getAuditLog()
│   │   └── alert.controller.js         # getAlerts(), acknowledgeAlert(), dismissAlert()
│   │
│   ├── /services                       # Business logic — called by controllers
│   │   ├── auth.service.js             # verifyCredentials(), generateJWT(), hashPassword()
│   │   ├── user.service.js             # createUserWithTempPassword(), sendInviteEmail()
│   │   ├── atc.service.js              # buildTreeFromDB(), resolveATCCode(), searchByName()
│   │   ├── medicine.service.js         # getMedicinesByATC(), checkDrugInteractions()
│   │   ├── patient.service.js          # findOrCreatePatient(), getAllergyCheck()
│   │   ├── prescription.service.js     # buildPrescriptionDoc(), calculateTotalItems(), validatePrescription()
│   │   ├── inventory.service.js        # deductStock(), checkThreshold(), getExpiringItems()
│   │   ├── alert.service.js            # createAlert(), getByCritical(), resolveAlert()
│   │   └── pdf.service.js              # generateRxPDF() — Puppeteer renders HTML → PDF
│   │
│   ├── /routes                         # Express routers — one file per domain
│   │   ├── auth.routes.js              # POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
│   │   ├── user.routes.js              # GET /api/users, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
│   │   ├── atc.routes.js               # GET /api/atc/tree, GET /api/atc/:code, GET /api/atc/search?q=
│   │   ├── medicine.routes.js          # GET /api/medicines, GET /api/medicines/:id, POST, PUT, DELETE
│   │   ├── patient.routes.js           # GET /api/patients, GET /api/patients/:id, POST /api/patients
│   │   ├── prescription.routes.js      # GET /api/prescriptions, POST, GET /:id, PUT /:id/status, GET /:id/pdf
│   │   ├── inventory.routes.js         # GET /api/inventory, POST /api/inventory, PUT /api/inventory/:id
│   │   └── alert.routes.js             # GET /api/alerts, PUT /api/alerts/:id/acknowledge, PUT /:id/dismiss
│   │
│   ├── /middlewares
│   │   ├── auth.middleware.js          # Verifies JWT token on every protected route
│   │   ├── role.middleware.js          # requireRole('DOCTOR') — checks req.user.role
│   │   └── error.middleware.js         # Global error handler — formats error responses
│   │
│   ├── /utils
│   │   ├── generateToken.js            # jwt.sign({ id, role }, SECRET, { expiresIn: '7d' })
│   │   ├── responseHandler.js          # success(res, data), error(res, msg, code)
│   │   ├── constants.js                # ROLES, ALERT_TYPES, SEVERITY, PRESCRIPTION_STATUS
│   │   └── emailTemplates.js           # HTML templates for invite email + Rx share email
│   │
│   ├── /validators                     # express-validator rule chains
│   │   ├── auth.validator.js           # Validates login body: email format, password length
│   │   ├── prescription.validator.js   # Validates Rx body: patientId, items[], dosage
│   │   └── user.validator.js           # Validates new user: name, email, role
│   │
│   ├── /jobs                           # Scheduled background tasks (node-cron)
│   │   ├── expiryCheck.job.js          # Runs daily 00:00 — finds items expiring in < 30 days → creates alert
│   │   ├── lowStockCheck.job.js        # Runs every 6 hours — checks inventory < threshold → creates alert
│   │   └── seedATC.js                  # One-time seed script: reads CSV → inserts ATC codes into MongoDB
│   │
│   ├── app.js                          # Express app setup — middleware stack, route mounting
│   └── server.js                       # HTTP server start — listens on PORT from .env
│
├── package.json
└── .env                                # See Environment Variables section
```

### Backend Flow

```
Request → auth.middleware.js (verify JWT)
        → role.middleware.js (check role)
        → route handler
        → controller (parse req, call service)
        → service (business logic)
        → model (Mongoose query)
        → MongoDB
        → response via responseHandler.js
```

---

## 8. Database Models

### user

```js
{
  _id:          ObjectId,
  firstName:    String,        // "Sarah"
  lastName:     String,        // "Jenkins"
  email:        String,        // unique, "sarah@hospital.com"
  passwordHash: String,        // bcrypt hash
  role:         String,        // "DOCTOR" | "PHARMACIST" | "ADMIN"
  isActive:     Boolean,
  createdAt:    Date,
  lastLogin:    Date
}
```

### atc_code

```js
{
  _id:        ObjectId,
  code:       String,   // "A10BA02"
  name:       String,   // "Metformin"
  level:      Number,   // 1-5
  parentCode: String,   // "A10BA"
  description:String
}
```

### medicine

```js
{
  _id:           ObjectId,
  name:          String,   // "Metformin HCl 500mg"
  genericName:   String,   // "Metformin"
  brand:         String,   // "Glucophage"
  atcCode:       String,   // "A10BA02"
  strength:      String,   // "500mg"
  dosageForm:    String,   // "Tablet" | "Injection" | "Capsule"
  manufacturer:  String,   // "Merck Group"
  mrp:           Number,   // 23.22
  createdAt:     Date
}
```

### patient

```js
{
  _id:        ObjectId,
  patientId:  String,    // "P-123456"
  name:       String,
  dob:        Date,
  gender:     String,    // "Male" | "Female" | "Other"
  weight:     Number,    // kg
  allergies: [{
    substance: String,   // "Penicillin"
    severity:  String    // "Severe" | "Moderate" | "Mild"
  }],
  medicalHistory: [String],
  createdAt:  Date
}
```

### prescription

```js
{
  _id:             ObjectId,
  rxId:            String,     // "RX-9021"
  patientId:       ObjectId,   // ref: patient
  doctorId:        ObjectId,   // ref: user
  diagnosis:       String,
  items: [{
    medicineId:    ObjectId,   // ref: medicine
    atcCode:       String,
    dose:          String,     // "500mg"
    frequency:     String,     // "TID" | "BID" | "PRN"
    route:         String,     // "Oral" | "Injection"
    durationDays:  Number,
    instructions:  String
  }],
  status:          String,     // "Pending" | "Processing" | "Filled" | "Cancelled"
  isUrgent:        Boolean,
  allowRefills:    Number,     // max 3
  digitalSignature:String,     // "DSIG-SMITH-9921-X"
  pdfUrl:          String,     // S3 or local path
  createdAt:       Date,
  updatedAt:       Date
}
```

### inventory

```js
{
  _id:          ObjectId,
  medicineId:   ObjectId,   // ref: medicine
  atcCode:      String,
  batchId:      String,     // "AX-2023-001"
  currentStock: Number,
  threshold:    Number,     // alert if currentStock < threshold
  expiryDate:   Date,
  storage:      String,     // "Shelf A-12" | "Cold Storage"
  status:       String,     // "STABLE" | "NEAR EXPIRY" | "EXPIRED" | "LOW STOCK"
  updatedAt:    Date
}
```

### alert

```js
{
  _id:            ObjectId,
  type:           String,   // "LOW_STOCK" | "NEAR_EXPIRY" | "EXPIRED"
  severity:       String,   // "CRITICAL" | "WARNING" | "INFO"
  medicineId:     ObjectId,
  message:        String,
  isAcknowledged: Boolean,
  acknowledgedBy: ObjectId,
  createdAt:      Date
}
```

---

## 9. API Routes Reference

### Auth

| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | `/api/auth/login`     | Public  | Login + get JWT token    |
| POST   | `/api/auth/logout`    | Auth    | Invalidate token         |
| GET    | `/api/auth/me`        | Auth    | Get current user profile |

### Users (Admin only)

| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| GET    | `/api/users`          | ADMIN   | List all users           |
| POST   | `/api/users`          | ADMIN   | Create user + send invite|
| PUT    | `/api/users/:id`      | ADMIN   | Update role / status     |
| DELETE | `/api/users/:id`      | ADMIN   | Deactivate user          |

### ATC Classification

| Method | Endpoint              | Access        | Description                   |
|--------|-----------------------|---------------|-------------------------------|
| GET    | `/api/atc/tree`       | DOCTOR, ADMIN | Full ATC tree (Level 1-3)     |
| GET    | `/api/atc/:code`      | DOCTOR, ADMIN | ATC node detail + children    |
| GET    | `/api/atc/search?q=`  | DOCTOR        | Search by name or code        |

### Medicines

| Method | Endpoint              | Access     | Description                  |
|--------|-----------------------|------------|------------------------------|
| GET    | `/api/medicines`      | All auth   | List with ATC code filter    |
| GET    | `/api/medicines/:id`  | All auth   | Single medicine detail       |
| POST   | `/api/medicines`      | ADMIN      | Add new medicine             |
| PUT    | `/api/medicines/:id`  | ADMIN      | Update medicine              |

### Patients

| Method | Endpoint              | Access  | Description                       |
|--------|-----------------------|---------|-----------------------------------|
| GET    | `/api/patients`       | DOCTOR  | Search patients by name/ID        |
| GET    | `/api/patients/:id`   | DOCTOR  | Patient detail + allergy alerts   |
| POST   | `/api/patients`       | DOCTOR  | Create new patient                |

### Prescriptions

| Method | Endpoint                      | Access              | Description                          |
|--------|-------------------------------|---------------------|--------------------------------------|
| GET    | `/api/prescriptions`          | DOCTOR, PHARMACIST  | List with status filter              |
| POST   | `/api/prescriptions`          | DOCTOR              | Create + submit to pharmacy          |
| GET    | `/api/prescriptions/:id`      | DOCTOR, PHARMACIST  | Prescription detail                  |
| PUT    | `/api/prescriptions/:id/status`| PHARMACIST         | Update status (Processing → Filled)  |
| GET    | `/api/prescriptions/:id/pdf`  | DOCTOR, PHARMACIST  | Generate + return PDF                |

### Inventory

| Method | Endpoint              | Access      | Description                     |
|--------|-----------------------|-------------|---------------------------------|
| GET    | `/api/inventory`      | PHARMACIST  | Full inventory with filters     |
| POST   | `/api/inventory`      | PHARMACIST  | Add new stock entry             |
| PUT    | `/api/inventory/:id`  | PHARMACIST  | Update stock / batch            |
| GET    | `/api/inventory/audit`| ADMIN       | Full audit log                  |

### Alerts

| Method | Endpoint                          | Access      | Description             |
|--------|-----------------------------------|-------------|-------------------------|
| GET    | `/api/alerts`                     | PHARMACIST  | All active alerts       |
| PUT    | `/api/alerts/:id/acknowledge`     | PHARMACIST  | Mark acknowledged       |
| PUT    | `/api/alerts/:id/dismiss`         | PHARMACIST  | Dismiss warning         |

### Reports (Admin)

| Method | Endpoint              | Access  | Description                        |
|--------|-----------------------|---------|------------------------------------|
| GET    | `/api/reports/summary`| ADMIN   | Rx volume, inventory value, uptime |
| GET    | `/api/reports/atcUsage`| ADMIN  | Top ATC categories by prescription |
| GET    | `/api/reports/fulfillment`| ADMIN| Pharmacist performance metrics    |

---

## 10. RBAC — Role Based Access Control

```
Middleware stack for every protected route:
  1. auth.middleware.js  → checks Bearer token, sets req.user
  2. role.middleware.js  → requireRole('ADMIN') checks req.user.role

Usage in routes:
  router.get('/users', authMiddleware, requireRole('ADMIN'), userController.getAll)
  router.post('/prescriptions', authMiddleware, requireRole('DOCTOR'), prescriptionController.create)
  router.get('/inventory', authMiddleware, requireRole('PHARMACIST'), inventoryController.getAll)
```

| Feature                   | DOCTOR | PHARMACIST | ADMIN |
|---------------------------|--------|------------|-------|
| View own dashboard        | ✅     | ✅         | ✅    |
| Create prescription       | ✅     | ❌         | ❌    |
| View ATC tree             | ✅     | ✅         | ✅    |
| Manage inventory          | ❌     | ✅         | ❌    |
| View + act on alerts      | ❌     | ✅         | ✅    |
| Manage users              | ❌     | ❌         | ✅    |
| View reports              | ❌     | ❌         | ✅    |
| Sync ATC database         | ❌     | ❌         | ✅    |

---

## 11. Business Logic

### Auto Alerts (background jobs)

```
expiryCheck.job.js   → runs daily at 00:00
  → finds all inventory where expiryDate < (today + 30 days)
  → creates alert { type: "NEAR_EXPIRY", severity: "WARNING" }
  → if expiryDate < today → severity: "CRITICAL"

lowStockCheck.job.js → runs every 6 hours
  → finds all inventory where currentStock < threshold
  → creates alert { type: "LOW_STOCK", severity: "CRITICAL" if stock < 10% of threshold }
```

### Prescription → Inventory Flow

```
Doctor creates Rx → status: "Pending"
Pharmacist opens Rx → status: "Processing"
Pharmacist dispenses → inventory.currentStock -= quantity for each item
                     → status: "Filled"
                     → alert created if stock falls below threshold
```

### PDF Generation (Puppeteer)

```
GET /api/prescriptions/:id/pdf
  → prescription.service.js fetches Rx + patient + doctor data
  → pdf.service.js renders HTML template with letterhead
  → Puppeteer converts HTML → PDF buffer
  → Returns as application/pdf download
```

### Drug Interaction Check

```
New prescription creation:
  → medicine.service.js checks each new drug against patient's existing medications
  → Returns { status: "Clear" | "Warning" | "Critical", interactions: [] }
  → Shown on screen 6 as Validation Status
```

---

## 12. Environment Variables

Create `/backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB (MERN stack — primary database)
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pims

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Email (Nodemailer — for user invites + Rx sharing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# PDF (Puppeteer)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

Create `/frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 13. Setup & Run Instructions

### Prerequisites (all 6 team machines must have these)

```
Node.js v20 LTS    → nodejs.org/en/download
npm v10+           → comes with Node
MongoDB v7+        → mongodb.com/try/download (or use MongoDB Atlas free tier)
Git                → git-scm.com
VS Code            → code.visualstudio.com
Flutter 3.x        → flutter.dev/docs/get-started/install (mobile dev only)
```

### Step 1 — Clone the repo

```bash
git clone https://github.com/your-org/pims-project.git
cd pims-project
```

### Step 2 — Backend setup

```bash
cd backend
npm install
cp .env.example .env           # fill in your values
node src/jobs/seedATC.js       # seed ATC drug data (P2 runs this once on Day 1)
npm run dev                    # starts Express on port 5000
```

### Step 3 — Frontend setup

```bash
cd frontend
npm install
cp .env.example .env           # set VITE_API_BASE_URL
npm run dev                    # starts Vite on port 5173
```

### Step 4 — Verify

```
Backend:  http://localhost:5000/api/health  → { status: "ok" }
Frontend: http://localhost:5173             → Login screen
```

### Git branching strategy

```
main        → production-ready only. No direct commits.
dev         → integration branch. Merge feature branches here.
feature/*   → one branch per task e.g. feature/atc-tree-api

Workflow:
  git checkout dev
  git pull origin dev
  git checkout -b feature/your-task
  # make changes
  git push origin feature/your-task
  # open Pull Request → dev
```

---

## 14. MVP Scope — April 2025

### Included in MVP

| Feature                     | Who builds it    |
|-----------------------------|------------------|
| Login with role select      | P1 (backend auth), P3 (login UI) |
| ATC tree browser + search   | P2 (seed + API), P3 (UI)         |
| New prescription form       | P1 (Rx API), P4 (UI)             |
| Prescription management     | P1, P4                           |
| Inventory management        | P2, P4                           |
| System alerts               | P1 (jobs), P4 (UI)               |
| PDF prescription generation | P6 (Puppeteer)                   |
| Share Rx to pharmacy        | P6 (Nodemailer)                  |
| Admin user management       | P1, P3                           |
| Reports dashboard           | P2 (API), P3 (charts)            |
| Android APK                 | P5 (Flutter)                     |
| Desktop app                 | P3 (Electron wrap — Day 20)      |

### Excluded from MVP

- iOS App Store release (Apple Dev account needed — post April)
- Advanced drug interaction engine
- External EHR/HL7 integrations
- Payment / billing module
- Multi-hospital / multi-tenant support

---

## 15. April Sprint Plan

### Team Assignment

| Person | Role             | Tech                          |
|--------|------------------|-------------------------------|
| P1     | Tech Lead        | MERN — Express + Node + MongoDB      |
| P2     | Backend Dev      | MERN — Express + Node + ATC seeding  |
| P6     | Backend Dev      | MERN — Express + Node + Puppeteer    |
| P3     | Frontend Dev 1   | React + TypeScript + Vite     |
| P4     | Frontend Dev 2   | React + TypeScript            |
| P5     | Mobile Dev       | Flutter + Dart                |

### Week-by-week

| Week | Dates        | Focus                                                               |
|------|--------------|---------------------------------------------------------------------|
| 1    | Apr 1–5      | DB models, API skeleton, Auth, ATC CSV seed, React setup, Login UI  |
| 2    | Apr 7–11     | ATC tree API + UI, Drug search, Patient CRUD — **API FREEZE Apr 11**|
| 3    | Apr 14–19    | Prescription flow, Inventory, PDF gen, Puppeteer, Flutter screens   |
| 4    | Apr 22–30    | Alerts, Reports, Polish, Electron wrap, Android APK, Deploy, Demo   |

> **API Freeze — April 11.** After this date no backend contract changes without lead approval. Frontend and mobile build against stable endpoints.

---

## 16. Dataset Sources & References

| # | Source | URL | Type | Notes |
|---|--------|-----|------|-------|
| 1 | WHO ATC/DDD Toolkit | [who.int/tools/atc-ddd-toolkit](https://www.who.int/tools/atc-ddd-toolkit) | Official reference | Gold standard — cite in project report |
| 2 | WHO WHOCC ATC Index | [atcddd.fhi.no](https://atcddd.fhi.no) | Official dataset | Free with registration, Excel/XML download |
| 3 | fabkury/atcd | [github.com/fabkury/atcd](https://github.com/fabkury/atcd) | Free CSV | 6,331 ATC codes — **use this for seeding** |
| 4 | Kaggle WHO ATC/DDD | [kaggle.com/datasets/remulusbi/who-atcddd](https://www.kaggle.com/datasets/remulusbi/who-atcddd) | Pre-packaged CSV | Alternative seed source |
| 5 | DrugBank | [go.drugbank.com](https://go.drugbank.com) | Drug reference API | Academic license — for drug detail info |

**Formal citation:**
> WHO Collaborating Centre for Drug Statistics Methodology, *ATC classification index with DDDs*, 2026. Oslo, Norway, 2025.

---

## 17. Open Source References

Study these repos before building — do not copy, use for learning DB schema and API patterns.

| Repo | Stack | What to study |
|------|-------|---------------|
| [mahadevm6/Pharmacy-Management-System](https://github.com/mahadevm6/-Pharmacy-Management-System) | React + Node + Express + MongoDB | API structure, CRUD patterns — close to our MERN stack |
| [malithJayasinghe2000/Pharmacy-management-system](https://github.com/malithJayasinghe2000/Pharmacy-management-system) | MERN (MongoDB + Express + React + Node) | Full MERN reference — identical stack |
| [LalanaChami/Pharmacy-Mangment-System](https://github.com/LalanaChami/Pharmacy-Mangment-System) | MEAN + JWT + Nodemailer | Email share feature reference |
| [github.com/topics/pharmacy-management-system](https://github.com/topics/pharmacy-management-system) | Various | 50+ repos to browse |

---

## 18. Viva / Demo Line

> *"PIMS is a role-based full-stack pharmacy management system built on the MERN stack — MongoDB, Express.js, React, and Node.js — that integrates WHO ATC drug classification with prescription creation, inventory tracking, and automated alerts, delivered as a web application, desktop app via Electron, and Android APK via Flutter."*

---

## Quick Commands Cheat Sheet

```bash
# Backend
npm run dev          # Start dev server (nodemon)
npm run start        # Start production server
npm run seed:atc     # Seed ATC drug data
npm run seed:users   # Seed test users (Doctor + Pharmacist + Admin)

# Frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
```

---

*PIMS — Pharmacy Information Management System | MERN Stack | SIT Bangalore | B.E. CSE 2022–2026 | April 2025*
