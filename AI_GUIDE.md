# 🧠 PIMS FULL-STACK DEVELOPMENT GUIDE (AI INSTRUCTION FILE)

## 🚨 CRITICAL RULES FOR AI

* Follow architecture strictly
* Do NOT skip layers
* Do NOT mix frontend/backend logic
* Do NOT over-engineer
* Always follow MVP scope
* Keep code clean and modular

---

# 📌 PROJECT OVERVIEW

Build a **Pharmacy Information Management System (PIMS)** with:

* ATC Classification (hierarchical)
* Role-based system (Admin, Doctor, Pharmacist)
* Prescription workflow
* Inventory management
* Alerts system
* Reports (basic)

---

# 🎯 DEVELOPMENT FLOW (IMPORTANT)

Follow this order:

```text
Wireframe → Frontend → Backend → Integration → Testing
```

---

# 🧩 MODULES TO BUILD

## 1. AUTH

* Login with JWT
* Role-based access

## 2. ATC CLASSIFICATION

* Hierarchical tree (A → A02 → A02B)
* Search + filter

## 3. MEDICINES

* CRUD
* Link with ATC

## 4. PATIENT

* Doctor creates patient

## 5. PRESCRIPTION

* Doctor creates prescription
* Includes medicines + dosage

## 6. INVENTORY

* Add stock
* Update stock
* Track expiry

## 7. ALERTS

* Low stock alert
* Expiry alert

## 8. ADMIN

* Manage users
* Assign roles

---

# 🎨 FRONTEND RULES

## Structure

```text
pages → components → services → backend
```

## Rules

* Pages = screens
* Components = reusable UI
* Services = API calls
* Use clean UI based on wireframe

---

# ⚙️ BACKEND RULES

## Architecture

```text
Route → Controller → Service → Model
```

## Rules

* Controllers → request/response only
* Services → business logic
* Models → DB schema
* Use JWT authentication

---

# 🗄️ DATABASE DESIGN

Collections:

* Users
* ATC
* Medicines
* Patients
* Prescriptions
* Inventory
* Alerts

---

# 🔐 RBAC RULES

* Admin → full access
* Doctor → patients + prescriptions
* Pharmacist → inventory + alerts

---

# ⚡ BUSINESS LOGIC

* If stock < threshold → alert
* If expiry < 30 days → alert
* Prescription flows to pharmacist

---

# 🚀 MVP SCOPE

## INCLUDE

* Auth
* ATC
* Prescription
* Inventory
* Alerts

## EXCLUDE

* Advanced analytics
* External integrations

---

# 🎯 OUTPUT EXPECTATION

Whenever generating code:

* Follow folder structure
* Keep logic in services
* Maintain modularity
* Use async/await
* Proper error handling

---

# 🧠 FINAL NOTE

This is an MVP healthcare system.

Focus on:
✔ Working features
✔ Clean architecture
✔ Real-world flow

NOT on:
❌ Over-complex features
❌ Perfection
