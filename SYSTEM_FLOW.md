# System Flow & Role Guide — SafeGuard Fire Extinguisher Management System

This document explains how the whole system works end-to-end and exactly what each
role (Admin, Inspector, User) can do.

---

## 0. What is an "Extinguisher" in this system?

An extinguisher is a real, physical object installed in a building, for example:

- Office A -> CO2 extinguisher near the entrance
- Room 201 -> Foam extinguisher on the wall
- Hall -> Dry chemical extinguisher

The system tracks real-world equipment. It does not "create something digital" — it
keeps a record of physical assets, their condition, their inspections and maintenance.

---

## 1. Roles vs responsibilities (important)

### 1. ADMIN = System manager
The Admin is the company owner / facility manager. The Admin:

- Registers extinguisher records into the system (they are company assets)
- Assigns inspectors to inspection jobs
- Manages users (and their roles)
- Sees all reports
- Edits and deletes extinguishers

Why does the Admin create extinguishers? Because extinguishers are company assets, not
user-generated data. When a building installs 50 extinguishers, the Admin registers them:
FE-001 -> Main Hall, FE-002 -> Office 1, FE-003 -> Kitchen, and so on.
So: Admin = "register physical assets into the system".

### 2. INSPECTOR = Field worker (executor)
The Inspector is a technician. The Inspector:

- Does NOT create extinguishers
- Visits locations
- Checks the extinguisher condition
- Schedules or performs inspections
- Updates the condition (Active / Expired / Needs Maintenance)
- Logs maintenance activities

Inspector flow: the Admin assigns inspection tasks -> the Inspector logs in -> sees the
work assigned to them -> goes physically to the location -> updates the condition.
The Inspector is NOT a creator — they are an executor.

### 3. USER = Normal system user (residents / staff)
The User:

- Does NOT create extinguishers
- Views extinguisher status
- Requests an inspection
- Sees reports

Example: a worker notices an extinguisher looks damaged and requests an inspection.
So: User = "consumer of information + requester".

---

## 2. Capability matrix

| Capability | User | Inspector | Admin |
|------------|:----:|:---------:|:-----:|
| Register / log in / verify email | yes | yes | yes |
| View dashboard & reports | yes | yes | yes |
| View extinguishers | yes | yes | yes |
| Request / schedule an inspection | yes | yes | yes |
| View notifications | yes | yes | yes |
| Manage own profile / password | yes | yes | yes |
| Update extinguisher condition (status) | no | yes | yes |
| Complete / cancel inspections | no | yes | yes |
| Log maintenance activities | no | yes | yes |
| Assign an inspector to a job | no | no | yes |
| Register / edit / delete extinguishers | no | no | yes |
| Export reports (PDF / CSV) | yes | yes | yes |
| Manage users & change roles | no | no | yes |

New public sign-ups are always created as User. Only an Admin can promote someone to
Inspector or Admin (Users page).

---

## 3. Authentication & security flows

### 3.1 Sign-up with email OTP verification
1. User fills the sign-up form (email forced lowercase, must contain "@").
2. POST /api/auth/register creates the account as INACTIVE and emails a 6-digit code
   (purpose = verify_email).
3. User enters the code -> POST /api/auth/verify-email -> account is activated and the
   user is logged in automatically.

Until verified, login is blocked with "Please verify your email before signing in."

### 3.2 Login
POST /api/auth/login (email + password) -> password checked with bcrypt -> returns a JWT
access token (15 min) and a refresh token (7 days). The frontend stores the token and
attaches it to every later request.

### 3.3 Logout (confirmation only — no OTP)
Click Logout -> "Are you sure?" -> confirm -> POST /api/auth/logout revokes all refresh
tokens -> local session cleared -> back to Login.

### 3.4 OTP-protected actions (deletes)
| Action | Confirm dialog | OTP required |
|--------|:---:|:---:|
| Delete a fire extinguisher (Admin) | yes | yes (delete_extinguisher) |
| Delete my account | yes | yes (delete_account) |

Flow: "Are you sure?" -> "Send code" -> 6-digit OTP emailed -> enter code -> action runs.
Codes expire in 10 minutes and allow 5 attempts.

---

## 4. Full real-life example (university building)

### Step 1 — Admin sets up the system
Admin logs in and registers:
- FE-001 -> Library
- FE-002 -> Lab
- FE-003 -> Hall

Now the system knows all extinguishers exist.

### Step 2 — Admin assigns an inspector
Admin schedules inspections and assigns inspector John to FE-001 and FE-002.

### Step 3 — Inspector performs the inspection
Inspector John logs in and sees the inspections assigned to him (FE-001, FE-002 due).
He goes physically to each location and updates the condition:
- FE-001 -> Active (OK)
- FE-002 -> Needs Maintenance (needs recharge)

The system stores an inspection record and a maintenance record.

### Step 4 — User interacts with the system
A User logs in and sees:
- FE-001 -> Active
- FE-002 -> Needs Maintenance

The User can request an inspection for any unit they are concerned about.

---

## 5. Inspection lifecycle
```
Scheduled (Pending)
   |  scheduled_date passes without completion
   v
Overdue  ---------------->  Completed   (inspector records result + condition)
   |
   +--------------------->  Cancelled   (inspector/admin cancels; kept as a record)
```
When an inspection is requested/scheduled, a notification is sent to every Admin and
every Inspector (so the work can be picked up); the assigned inspector, if any, gets an
"assigned to you" notification. Overdue flagging is automatic whenever inspections are listed.

## 6. Compliance status (auto-derived, v_compliance view)
```
expiry_date < today              -> Expired
expiry_date within next 30 days  -> Expiring Soon
otherwise                        -> Compliant
```

## 7. Which service owns which data
| Service | Tables |
|---------|--------|
| Auth & User | users, refresh_tokens, otp_codes |
| Extinguisher | fire_extinguishers |
| Inspection & Maintenance | inspections, maintenance_logs |
| Notification | notifications |
| Reporting | reads all + v_compliance view |

Schema: database/schema.sql · ERD: database/ERD.md / database/dbdiagram.dbml.

---

## 8. Demo script (for a walkthrough / marking)
1. Sign up a new user, show the OTP email, verify, land on the dashboard.
2. Log in as Admin: register 1-2 extinguishers, schedule an inspection and assign the
   inspector.
3. Log in as Inspector: see the assigned inspection, update the condition, complete it,
   and log a maintenance activity.
4. Back as Admin: open Reports and export a PDF and a CSV.
5. Try to delete an extinguisher to show the confirm + OTP step.
6. Show role enforcement: log in as User and confirm there are no register/edit/delete
   buttons (and the server blocks those calls).
7. Toggle dark/light mode and open the notifications bell.
