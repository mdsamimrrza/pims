# ⚙️ PIMS Backend — REST API

> Node.js + Express.js REST API for the Pharmacy Information Management System. Handles all business logic, database operations, authentication, PDF generation, and email delivery.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
  - [Auth](#auth-apiauthxx)
  - [Users](#users-apiusers)
  - [Patients](#patients-apipatients)
  - [Prescriptions](#prescriptions-apiprescriptions)
  - [Medicines](#medicines-apimedicines)
  - [Inventory](#inventory-apiinventory)
  - [Alerts](#alerts-apialerts)
  - [ATC Classification](#atc-classification-apiatc)
  - [Reports](#reports-apireports)
  - [Health](#health-apihealth)
- [Data Models](#data-models)
- [Middleware Stack](#middleware-stack)
- [Services Layer](#services-layer)
- [Security](#security)
- [Testing](#testing)
- [Scripts](#scripts)
- [Deployment](#deployment)

---

## Overview

The PIMS backend is a RESTful API built with **Express.js** following a layered architecture:

```
HTTP Request
    ↓
Route (express router)
    ↓
Middleware (auth, role guard, rate limiter)
    ↓
Controller (validates input, calls service)
    ↓
Service (all business logic, DB calls)
    ↓
Mongoose Model (MongoDB)
```

The service layer is intentionally "fat" — controllers are thin request/response handlers, and all domain logic lives in services.

---

## Project Structure

```
Backend/
├── src/
│   ├── app.js                      # Express app (CORS, helmet, rate limit, routes)
│   ├── server.js                   # Entry point — connects DB, starts server
│   │
│   ├── config/
│   │   └── db.js                   # Mongoose connection setup
│   │
│   ├── controllers/                # Thin HTTP handlers
│   │   ├── auth.controller.js
│   │   ├── inventory.controller.js
│   │   ├── medicine.controller.js
│   │   ├── patient.controller.js
│   │   ├── prescription.controller.js
│   │   ├── report.controller.js
│   │   ├── user.controller.js
│   │   └── alert.controller.js
│   │
│   ├── services/                   # All business logic
│   │   ├── auth.service.js         # JWT, login, signup, password reset
│   │   ├── inventory.service.js    # Stock management, audit log, alerts
│   │   ├── medicine.service.js     # Medicine catalog CRUD
│   │   ├── patient.service.js      # Patient records, portal account creation
│   │   ├── prescription.service.js # Prescription lifecycle, inventory deduction
│   │   ├── report.service.js       # Analytics aggregations
│   │   ├── user.service.js         # Admin user management
│   │   ├── alert.service.js        # Low stock & near-expiry alert management
│   │   ├── atc.service.js          # ATC code tree queries
│   │   ├── email.service.js        # Nodemailer email delivery
│   │   └── pdf.service.js          # PDFKit prescription PDF generation
│   │
│   ├── models/                     # Mongoose schemas
│   │   ├── User.model.js
│   │   ├── Patient.model.js
│   │   ├── Prescription.model.js
│   │   ├── Medicine.model.js
│   │   ├── Inventory.model.js
│   │   ├── Alert.model.js
│   │   ├── ATCCode.model.js
│   │   └── BlacklistedToken.model.js
│   │
│   ├── routes/                     # Express routers
│   │   ├── index.js                # Root router (mounts all sub-routers)
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── patient.routes.js
│   │   ├── prescription.routes.js
│   │   ├── medicine.routes.js
│   │   ├── inventory.routes.js
│   │   ├── alert.routes.js
│   │   ├── atc.routes.js
│   │   ├── report.routes.js
│   │   └── health.routes.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js       # JWT verification
│   │   ├── role.middleware.js       # RBAC role guard
│   │   ├── rateLimiter.middleware.js # Rate limiting
│   │   └── error.middleware.js      # Global error handler + 404
│   │
│   ├── validators/                 # Request body validators
│   ├── utils/                      # Shared utility functions
│   ├── jobs/                       # One-off seed jobs
│   └── data/                       # Static JSON seed data
│
├── scripts/
│   ├── master-seed.mjs             # Full database reset & re-seed
│   ├── build.mjs                   # Production build script
│   ├── check-atlas.mjs             # MongoDB Atlas connectivity check
│   └── verify-modules.mjs         # ESM module verification
│
├── tests/                          # Jest integration tests
├── .env                            # Local environment variables (gitignored)
├── .env.example                    # Environment variable template
└── package.json
```

---

## Getting Started

```bash
cd Backend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

Server starts at `http://localhost:5000`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pims

# JWT
JWT_SECRET=a_long_random_secret_string
JWT_EXPIRES_IN=7d

# CORS — comma-separated list of allowed frontend origins
CLIENT_URL=http://localhost:5173

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM=PIMS System <your@gmail.com>
```

> **Gmail tip:** Use an App Password (not your main password). Enable 2FA → Google Account → Security → App Passwords.

---

## Database

**Database:** MongoDB Atlas (cloud) or local MongoDB  
**ODM:** Mongoose 8.x  
**Connection:** `src/config/db.js` — connects once on server start

### Collections Overview

| Collection | Model File | Purpose |
|---|---|---|
| `users` | `User.model.js` | All system users (Doctor, Pharmacist, Admin, Patient) |
| `patients` | `Patient.model.js` | Patient medical records |
| `prescriptions` | `Prescription.model.js` | Prescriptions with line items |
| `medicines` | `Medicine.model.js` | Medicine catalog |
| `inventories` | `Inventory.model.js` | Stock batches with audit log |
| `alerts` | `Alert.model.js` | Low stock & near-expiry alerts |
| `atccodes` | `ATCCode.model.js` | WHO ATC classification hierarchy |
| `blacklistedtokens` | `BlacklistedToken.model.js` | Invalidated JWT tokens |

---

## API Reference

All endpoints require `Authorization: Bearer <token>` unless marked as **public**.

### Auth `/api/auth/**`

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/auth/login` | Public | — | Login with email + password. Returns JWT |
| POST | `/api/auth/logout` | ✅ | Any | Blacklists current token |
| POST | `/api/auth/forgot-password` | Public | — | Sends password reset email |
| POST | `/api/auth/reset-password` | Public | — | Resets password using email token |
| POST | `/api/auth/change-password` | ✅ | Any | Changes authenticated user's password |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "doctor@pims.local",
  "password": "Doctor@123"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "_id": "...",
    "email": "doctor@pims.local",
    "role": "doctor",
    "firstName": "John",
    "lastName": "Smith"
  }
}
```

---

### Users `/api/users`

> Admin role required for all endpoints.

| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List all users (paginated, filterable by role/status/search) |
| GET | `/api/users/:id` | Get single user |
| POST | `/api/users` | Create a new system user |
| PATCH | `/api/users/:id/status` | Activate or deactivate a user |
| DELETE | `/api/users/:id` | Permanently delete a user |
| POST | `/api/users/patient-portal` | Create patient portal account for existing patient |

**Query Parameters (GET /users):**
```
?page=1&limit=20&role=doctor&isActive=true&q=search_term
```

---

### Patients `/api/patients`

| Method | Path | Auth Role | Description |
|---|---|---|---|
| GET | `/api/patients` | Doctor, Admin | List patients (paginated, searchable) |
| GET | `/api/patients/:id` | Doctor, Admin, Pharmacist | Get full patient record |
| POST | `/api/patients` | Doctor | Create new patient |
| PATCH | `/api/patients/:id` | Doctor, Admin, Patient (own) | Update patient record |

---

### Prescriptions `/api/prescriptions`

| Method | Path | Auth Role | Description |
|---|---|---|---|
| GET | `/api/prescriptions` | Doctor, Pharmacist | List prescriptions (paginated, filtered) |
| GET | `/api/prescriptions/:id` | Doctor, Pharmacist | Get full prescription with populated references |
| POST | `/api/prescriptions` | Doctor | Create prescription (optionally creates new patient) |
| PATCH | `/api/prescriptions/:id/status` | Pharmacist | Update status (Processing / Filled / Cancelled) |
| GET | `/api/prescriptions/:id/pdf` | Doctor, Pharmacist | Download prescription as PDF |

**Create Prescription Request:**
```json
POST /api/prescriptions
{
  "patientId": "...",              // OR provide 'patient' object for new patient
  "patientEmail": "patient@email.com",
  "diagnosis": "Type 2 Diabetes",
  "isUrgent": false,
  "allowRefills": 0,
  "items": [
    {
      "medicineId": "...",
      "atcCode": "A10BK03",
      "dose": "10mg",
      "frequency": "Once daily",
      "route": "Oral",
      "durationDays": 30,
      "instructions": "Take with food"
    }
  ]
}
```

**Status Update (Pharmacist):**
> When marked `Filled`, the service **automatically deducts stock** from inventory. If stock is insufficient, a `400` error is returned with details.
```json
PATCH /api/prescriptions/:id/status
{ "status": "Filled" }
```

---

### Medicines `/api/medicines`

| Method | Path | Auth Role | Description |
|---|---|---|---|
| GET | `/api/medicines` | Any authenticated | List/search medicines |
| GET | `/api/medicines/:id` | Any authenticated | Get single medicine |
| POST | `/api/medicines` | Pharmacist, Admin | Create medicine |
| PATCH | `/api/medicines/:id` | Pharmacist, Admin | Update medicine |
| DELETE | `/api/medicines/:id` | Admin | Delete medicine |

**Query Parameters:**
```
?q=paracetamol&atcCode=N02BE&limit=10&page=1
```

---

### Inventory `/api/inventory`

| Method | Path | Auth Role | Description |
|---|---|---|---|
| GET | `/api/inventory` | Pharmacist, Admin | List inventory batches (filterable by status) |
| GET | `/api/inventory/:id` | Pharmacist, Admin | Get single batch |
| POST | `/api/inventory` | Pharmacist | Create inventory batch |
| PATCH | `/api/inventory/:id` | Pharmacist | Update batch details |
| DELETE | `/api/inventory/:id` | Pharmacist, Admin | Delete batch |
| POST | `/api/inventory/:id/restock` | Pharmacist | Restock a batch |
| GET | `/api/inventory/audit` | Pharmacist, Admin | Paginated audit log |

**Stock Status Values:**
- `STABLE` — stock above threshold, well before expiry
- `LOW STOCK` — current stock ≤ threshold
- `NEAR EXPIRY` — expiry date within 60 days
- `EXPIRED` — expiry date has passed

All inventory mutations are written to an **immutable audit log** stored on the inventory document itself.

---

### Alerts `/api/alerts`

| Method | Path | Auth Role | Description |
|---|---|---|---|
| GET | `/api/alerts` | Pharmacist | List active alerts |
| PATCH | `/api/alerts/:id/dismiss` | Pharmacist | Dismiss an alert |
| POST | `/api/alerts/generate` | Pharmacist, Admin | Manually trigger alert generation |

Alerts are auto-generated when inventory status becomes `LOW STOCK` or `NEAR EXPIRY`.

---

### ATC Classification `/api/atc`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/atc` | ✅ Any | List root ATC categories (level 1) |
| GET | `/api/atc/:code` | ✅ Any | Get children of a given ATC code |
| GET | `/api/atc/search` | ✅ Any | Search ATC codes by name or code |

The ATC (Anatomical Therapeutic Chemical) classification is the WHO standard for drug categorisation. The tree has 5 levels (A → A10 → A10B → A10BK → A10BK03).

---

### Reports `/api/reports`

> Admin role required.

| Method | Path | Description |
|---|---|---|
| GET | `/api/reports/prescriptions` | Prescription volume over time |
| GET | `/api/reports/inventory` | Inventory turnover, low stock trends |
| GET | `/api/reports/revenue` | Estimated revenue from filled prescriptions |

---

### Health `/api/health`

```
GET /api/health
→ 200 OK  { "status": "ok", "timestamp": "..." }
```

Public endpoint for uptime monitoring.

---

## Data Models

### User
```
_id, email, password (hashed), role (doctor|pharmacist|admin|patient),
firstName, lastName, isActive, createdAt, updatedAt
```

### Patient
```
_id, patientId (e.g. PAT-20260422-A1B2), name, dob, gender, email,
phone, address, bloodGroup, allergies[{substance, severity}],
medicalHistory, userId (→ User), createdAt, updatedAt
```

### Prescription
```
_id, rxId (e.g. RX-9011), patientId (→ Patient), doctorId (→ User),
diagnosis, isUrgent, allowRefills, status (Pending|Processing|Filled|Cancelled),
digitalSignature, items[{medicineId, atcCode, dose, frequency, route,
durationDays, instructions}], createdAt, updatedAt
```

### Inventory
```
_id, medicineId (→ Medicine), atcCode, batchId, currentStock, threshold,
expiryDate, storage, status (STABLE|LOW STOCK|NEAR EXPIRY|EXPIRED),
auditLog[{action, quantity, performedBy, note, timestamp}],
createdAt, updatedAt
```

### Medicine
```
_id, name, genericName, atcCode, brand, strength, dosageForm,
manufacturer, mrp, createdAt, updatedAt
```

---

## Middleware Stack

Requests pass through middleware in this order:

1. **CORS** — whitelist-based origin validation (supports multiple origins via `CLIENT_URL`)
2. **Helmet** — sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
3. **Morgan** — request/response logging in `dev` format
4. **express.json()** — body parsing
5. **apiLimiter** — rate limiter: 100 requests per 15 minutes per IP
6. **protect** (per-route) — JWT verification, attaches `req.user`
7. **requireRoles(...)** (per-route) — validates `req.user.role` against allowed roles
8. **errorHandler** — catches all unhandled errors, formats JSON error response
9. **notFound** — 404 handler for unmatched routes

---

## Services Layer

The service layer contains all business logic. Key responsibilities:

| Service | Key Logic |
|---|---|
| `auth.service.js` | bcrypt compare, JWT sign/verify, token blacklist, password reset tokens |
| `prescription.service.js` | Stock deduction on fill, new patient creation, portal account creation |
| `inventory.service.js` | Status computation, audit log appending, batch deduction |
| `email.service.js` | Nodemailer transport, invite email, password reset email |
| `pdf.service.js` | PDFKit prescription document generation with patient/doctor/medication details |
| `report.service.js` | MongoDB aggregation pipelines for analytics |
| `alert.service.js` | Scans inventory for alert conditions, upserts alert documents |

---

## Security

| Concern | Implementation |
|---|---|
| Authentication | JWT (`jsonwebtoken`), 7-day expiry |
| Token invalidation | `BlacklistedToken` collection — logout stores token hash |
| Authorization | `requireRoles([...])` middleware on every protected route |
| Password hashing | bcrypt with salt rounds = 12 |
| Rate limiting | 100 req / 15 min / IP via `express-rate-limit` |
| HTTP headers | Helmet.js |
| CORS | Origin whitelist from `CLIENT_URL` env variable |
| Input validation | Validators layer before controllers |

---

## Testing

```bash
# Run all tests
npm test

# Tests use an in-memory MongoDB instance (mongodb-memory-server)
# No real database is touched during tests
```

Tests are located in `Backend/tests/` and `Backend/src/services/__tests__/`.

---

## Scripts

```bash
npm run dev            # Start with nodemon (hot reload)
npm run start          # Start production server
npm run build          # Build/bundle for production
npm run test           # Run Jest test suite
npm run seed:atc       # Seed ATC classification data
npm run seed:medicines # Seed medicine catalog
npm run seed:users     # Seed default users
npm run verify:modules # Check all ESM imports resolve correctly
```

**Master seed (full reset):**
```bash
node scripts/master-seed.mjs
```

---

## Deployment

Hosted on **Render** as a Node.js web service.

- **Start Command:** `node src/server.js`
- **Build Command:** `npm install`
- **Auto-deploy:** On push to `main`

**Production environment variables** (set in Render dashboard):
```
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
CLIENT_URL=https://pims-sys.vercel.app
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

> The backend URL is: `https://pharmacy-information-management-system.onrender.com`

---

*PIMS Backend v1.0.0 — Express.js + MongoDB*
