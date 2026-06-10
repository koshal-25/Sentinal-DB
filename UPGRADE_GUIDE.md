# SENTINEL CRMS v2.0 — COMPLETE UPGRADE DOCUMENTATION

---

## WHAT WAS WRONG IN v1.0

| # | Problem | Location | Impact |
|---|---------|----------|--------|
| 1 | **Plaintext passwords** in seed data (`admin123`) | `db.sql` seed inserts | Critical security breach |
| 2 | **No real auth** — role read from HTTP header | `server.js` checkAuth | Any client can spoof Admin role |
| 3 | **Generic CRUD** — `SELECT * FROM ??` on any table | `server.js` all routes | Mass data exposure, no access control |
| 4 | **No ENUM constraints** — status stored as free-text VARCHAR | FIR, Case_Details | `"open"`, `"Open"`, `"OPEN"` all valid |
| 5 | **Location not normalized** — `station`, `city`, `state` as text in Officer | Officer table | No location-based queries or consistency |
| 6 | **CrimeType as free text** — `crime_type VARCHAR(100)` | FIR table | `"theft"`, `"Theft"`, `"Mobile Theft"` differ |
| 7 | **No audit trail** — who changed what is untracked | entire schema | Inadmissible in court; no accountability |
| 8 | **Case ↔ Officer is 1:1** — only `officer_id` on FIR | FIR table | Multi-officer investigation impossible |
| 9 | **No complainant entity** — name stored as VARCHAR | Complaint table | Cannot link same complainant across cases |
| 10 | **Evidence has no chain of custody** | Evidence table | Evidence integrity compromised legally |
| 11 | **Court data flat** — single `court_name` + `judgment` | Court_Case | No hearing history, no appeal tracking |
| 12 | **No indexing** | all tables | Full table scans on every query |
| 13 | **No transaction** for Complaint→FIR→Case flow | server.js | Partial inserts leave orphaned records |
| 14 | **LegalSection not linked to an Act** | Section table | `"IPC 379"` and `"BNS 303"` indistinguishable |
| 15 | **Roles: Admin/Officer/Clerk only** | Users table | No Investigator or CourtOfficial separation |

---

## SCHEMA CHANGES SUMMARY

### Tables REMOVED / REPLACED
- `Users` → `User` + `Role` (normalized)
- `Officer.station` (text) → `Officer.station_id` → `PoliceStation` → `City` → `Region`
- `FIR.crime_type` (text) → `FIR.crime_type_id` → `CrimeType` → `CrimeCategory`
- `Section` → `LegalSection` + `LegalAct`
- `Court_Case` → `Court` + `CourtProceeding` + `Judgment`
- `Special_File` → removed (replaced by Evidence + CaseLog)

### Tables ADDED
| Table | Purpose |
|-------|---------|
| `Region` | Top of location hierarchy |
| `City` | Under Region |
| `PoliceStation` | Replaces free-text station |
| `Role` | Normalized RBAC roles |
| `OfficerRank` | Normalized officer ranks |
| `LegalAct` | IPC, BNS, IT Act, NDPS |
| `CrimeCategory` | Cybercrime, Property, etc. |
| `CrimeType` | Specific crime under category |
| `Complainant` | Separate entity from Victim |
| `CaseOfficer` | Case ↔ Officer M2M |
| `CriminalRelation` | Gang/associate network graph |
| `EvidenceType` | Physical/Digital/Biological |
| `Court` | Court master table |
| `CourtProceeding` | Full hearing history |
| `Judgment` | Final verdict + appeal |
| `AuditLog` | Every user action logged |

### Junction Tables (Many-to-Many)
| Junction | Links |
|----------|-------|
| `CaseCriminal` | CrimeCase ↔ Criminal |
| `CaseSection` | CrimeCase ↔ LegalSection |
| `CaseVictim` | CrimeCase ↔ Victim |
| `CaseOfficer` | CrimeCase ↔ Officer |
| `CriminalRelation` | Criminal ↔ Criminal |

---

## ROLE-BASED ACCESS CONTROL

### Roles & Permissions Matrix

| Action | Admin | Officer | Investigator | CourtOfficial |
|--------|:-----:|:-------:|:------------:|:-------------:|
| Create User | ✅ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Register FIR | ✅ | ✅ | ❌ | ❌ |
| Assign Officers | ✅ | ✅ | ❌ | ❌ |
| Add Evidence | ✅ | ✅ | ✅ | ❌ |
| Update Case Status | ✅ | ✅ | ✅ | ❌ |
| Add Case Log | ✅ | ✅ | ✅ | ❌ |
| View All Cases | ✅ | own only | assigned | court-referred |
| Update Judgment | ✅ | ❌ | ❌ | ✅ |
| Delete Records | ✅ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ | ❌ |

### Enforcement Strategy
1. **JWT tokens** contain `{ user_id, role, officer_id }` — signed, can't be tampered
2. **`authenticate` middleware** verifies token on every `/api/*` request
3. **`authorize(...roles)` middleware** guards specific routes
4. **Row-level filtering** — Officers only query cases where `lead_officer_id = req.user.officer_id`
5. **AuditLog** records every sensitive action including `VIEW_SENSITIVE` for criminal data

---

## INDEXING STRATEGY

```sql
-- Query pattern: filter by status (most common)
idx_fir_status       ON FIR(status)
idx_case_status      ON CrimeCase(status)
idx_criminal_status  ON Criminal(arrest_status)

-- Time-range queries for crime trend reports
idx_fir_crime_date   ON FIR(crime_date)

-- Officer workload queries
idx_case_officer     ON CrimeCase(lead_officer_id)

-- Case timeline lookups
idx_caselog_case     ON CaseLog(case_id, logged_at)

-- Criminal search
idx_criminal_name    ON Criminal(full_name)
idx_criminal_repeat  ON Criminal(is_repeat_offender)
idx_criminal_risk    ON Criminal(risk_level)

-- Complaint filtering
idx_complaint_status ON Complaint(status)
idx_evidence_case    ON Evidence(case_id)

-- Audit queries
idx_audit_user       ON AuditLog(user_id)
idx_audit_table      ON AuditLog(table_name, record_id)
idx_audit_time       ON AuditLog(performed_at)
```

---

## API STRUCTURE

```
POST   /api/auth/login                     Public
POST   /api/auth/refresh                   Public
POST   /api/auth/logout                    Auth

GET    /api/dashboard/stats                Auth
GET    /api/dashboard/crime-trends         Auth
GET    /api/dashboard/officer-workload     Admin

POST   /api/cases/register                 Officer, Admin
GET    /api/cases                          Auth (filtered by role)
GET    /api/cases/:id                      Auth
PATCH  /api/cases/:id/status               Officer, Investigator, Admin
POST   /api/cases/:id/officers             Officer, Admin
POST   /api/cases/:id/criminals            Officer, Investigator, Admin
GET    /api/cases/:id/timeline             Auth
GET    /api/cases/:id/evidence             Auth

POST   /api/fir                            Officer, Admin
GET    /api/fir                            Auth
GET    /api/fir/:id                        Auth

POST   /api/criminals                      Officer, Admin
GET    /api/criminals                      Auth
GET    /api/criminals/:id                  Auth
GET    /api/criminals/repeat-offenders     Auth
POST   /api/criminals/:id/relations        Investigator, Admin

POST   /api/evidence                       Officer, Investigator, Admin
GET    /api/evidence/:id                   Auth
PATCH  /api/evidence/:id/custody           Officer, Admin

GET    /api/officers                       Admin, Officer
GET    /api/officers/:id/workload          Admin

GET    /api/audit                          Admin only
```

---

## BACKEND TECH STACK

```
Runtime:     Node.js 20+
Framework:   Express 4
DB Driver:   mysql2 (promise API, connection pool)
Auth:        jsonwebtoken (JWT RS256) + bcrypt (12 rounds)
Security:    helmet, cors, express-rate-limit
Validation:  zod (request schema validation)
Logging:     winston (file + console, structured JSON)
Testing:     jest + supertest
Recommended DB: MySQL 8.0 / MariaDB 10.6+
```

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│   React / Vanilla JS  |  Dashboard  |  Case Management     │
│   Crime Heatmap (Leaflet.js)  |  Analytics (Chart.js)      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / JWT
┌────────────────────────▼────────────────────────────────────┐
│                    API GATEWAY / NGINX                      │
│         Rate Limiting  |  SSL Termination  |  Logging       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   EXPRESS BACKEND                           │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │  Auth Route │  │  Case Route  │  │Criminal Route  │    │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘    │
│         │                │                   │             │
│  ┌──────▼────────────────▼───────────────────▼──────────┐  │
│  │         Middleware Layer                              │  │
│  │   authenticate() → authorize() → auditLog()          │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │              Controllers (Business Logic)            │  │
│  │  registerCase() | addEvidence() | getWorkload()      │  │
│  └──────────────────────────┬───────────────────────────┘  │
└───────────────────────────  │  ──────────────────────────  ┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      MySQL 8.0                              │
│                                                             │
│  sentinel_v2 database                                       │
│  ├── Location: Region → City → PoliceStation                │
│  ├── Auth:     Role, User                                   │
│  ├── People:   Officer, Criminal, Victim, Complainant       │
│  ├── Core:     Complaint → FIR → CrimeCase                 │
│  ├── Legal:    LegalAct, LegalSection, CaseSection          │
│  ├── Evidence: EvidenceType, Evidence (chain of custody)    │
│  ├── Court:    Court, CourtProceeding, Judgment             │
│  ├── Audit:    CaseLog, AuditLog                            │
│  └── Network:  CriminalRelation                             │
└─────────────────────────────────────────────────────────────┘
```

---

## AI FEATURES (PHASE 3 RECOMMENDATIONS)

### 1. Repeat Offender Alert
- On `INSERT INTO CaseCriminal`, trigger checks `total_cases` in Criminal
- Auto-set `is_repeat_offender = TRUE` and `risk_level = 'High'` if cases ≥ 2

### 2. Crime Heatmap
- Store `latitude/longitude` on FIR (already in schema)
- Frontend: Leaflet.js with Heatmap plugin
- API: `GET /api/analytics/heatmap?from=2026-01-01&to=2026-12-31`
- Returns GeoJSON array of crime locations + intensity

### 3. Crime Prediction (ML)
- Export crime_date + crime_location + crime_type monthly
- Feed into scikit-learn `RandomForestClassifier`
- Predict hotspot areas for next 30 days

### 4. Suspect Matching
- Store `fingerprint_ref` in Criminal (links to AFIS system)
- Store `photo_url` → integrate with face recognition API
- Network graph via `CriminalRelation` table → D3.js force graph

---

## FOLDER STRUCTURE

```
sentinel-v2/
├── sql/
│   ├── 01_schema.sql          ← Full schema (run first)
│   ├── 02_logic_queries.sql   ← Procedures + queries + views
│   └── 03_seed_data.sql       ← Sample data
├── backend/
│   ├── server.js              ← Entry point
│   ├── config/
│   │   └── db.js              ← MySQL pool
│   ├── middleware/
│   │   ├── auth.js            ← JWT verify + role guard
│   │   └── audit.js           ← Auto audit logging
│   ├── controllers/
│   │   ├── cases.controller.js
│   │   ├── fir.controller.js
│   │   ├── criminals.controller.js
│   │   ├── evidence.controller.js
│   │   └── auth.controller.js
│   ├── routes/
│   │   ├── cases.js
│   │   ├── fir.js
│   │   ├── criminals.js
│   │   ├── evidence.js
│   │   ├── officers.js
│   │   ├── dashboard.js
│   │   └── auth.js
│   └── .env.example
└── docs/
    └── UPGRADE_GUIDE.md       ← This file
```

---

## .env.example

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=sentinel_app
DB_PASSWORD=StrongPassword!
DB_NAME=sentinel_v2
JWT_SECRET=<generate: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 64>
ALLOWED_ORIGINS=https://sentinel.yourdomain.gov
```

---

## DEPLOYMENT CHECKLIST

- [ ] Run `01_schema.sql` → `02_logic_queries.sql` → `03_seed_data.sql`
- [ ] Create MySQL user with least-privilege (no DROP, no FILE)
- [ ] Hash all passwords with `bcrypt.hash(password, 12)` before seeding
- [ ] Set `JWT_SECRET` to 64+ random bytes
- [ ] Enable MySQL SSL/TLS
- [ ] Put Express behind Nginx with SSL
- [ ] Enable MySQL binary logging for point-in-time recovery
- [ ] Set up daily DB backups
- [ ] Review AuditLog retention policy (recommend 5 years minimum for law enforcement)
