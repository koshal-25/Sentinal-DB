-- =============================================================
-- SENTINEL CRMS — PRODUCTION SCHEMA v2.0
-- Normalized to 3NF+, RBAC, Audit, Full Relational Integrity
-- =============================================================

DROP DATABASE IF EXISTS sentinel_v2;
CREATE DATABASE sentinel_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE sentinel_v2;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- LOCATION HIERARCHY
-- =============================================================

CREATE TABLE Region (
    region_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL,
    state       VARCHAR(100) NOT NULL,
    UNIQUE (region_name, state)
) ENGINE=InnoDB;

CREATE TABLE City (
    city_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    city_name   VARCHAR(100) NOT NULL,
    region_id   INT UNSIGNED NOT NULL,
    FOREIGN KEY (region_id) REFERENCES Region (region_id) ON DELETE RESTRICT,
    UNIQUE (city_name, region_id)
) ENGINE=InnoDB;

CREATE TABLE PoliceStation (
    station_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    station_name VARCHAR(150) NOT NULL,
    station_code VARCHAR(20)  NOT NULL UNIQUE,
    address      TEXT,
    contact_no   VARCHAR(20),
    city_id      INT UNSIGNED NOT NULL,
    FOREIGN KEY (city_id) REFERENCES City (city_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- RBAC — ROLES & USERS
-- =============================================================

CREATE TABLE Role (
    role_id     TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB;

INSERT INTO Role (role_name, description) VALUES
  ('Admin',         'Full system access, user management, audit logs'),
  ('Officer',       'File FIR, manage assigned cases, add evidence'),
  ('Investigator',  'View and update investigation details, add case logs'),
  ('CourtOfficial', 'Read-only access to cases sent to court; update judgments');

CREATE TABLE User (
    user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,          -- bcrypt hash, never plaintext
    email         VARCHAR(150) UNIQUE,
    role_id       TINYINT UNSIGNED NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME,
    FOREIGN KEY (role_id) REFERENCES Role (role_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- OFFICERS
-- =============================================================

CREATE TABLE OfficerRank (
    rank_id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rank_name VARCHAR(80) NOT NULL UNIQUE   -- Inspector, Sub-Inspector, ASI, etc.
) ENGINE=InnoDB;

CREATE TABLE Officer (
    officer_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    badge_number VARCHAR(30)  NOT NULL UNIQUE,
    full_name    VARCHAR(120) NOT NULL,
    rank_id      TINYINT UNSIGNED NOT NULL,
    station_id   INT UNSIGNED NOT NULL,
    contact_no   VARCHAR(20),
    email        VARCHAR(150),
    user_id      INT UNSIGNED UNIQUE,           -- NULL if account not yet created
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    joined_date  DATE,
    FOREIGN KEY (rank_id)    REFERENCES OfficerRank (rank_id)    ON DELETE RESTRICT,
    FOREIGN KEY (station_id) REFERENCES PoliceStation (station_id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id)    REFERENCES User (user_id)           ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- LEGAL SECTIONS (IPC / BNS / IT Act, etc.)
-- =============================================================

CREATE TABLE LegalAct (
    act_id   SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    act_code VARCHAR(30)  NOT NULL UNIQUE,   -- 'IPC', 'BNS', 'IT_ACT', 'NDPS'
    act_name VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE LegalSection (
    section_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    section_code     VARCHAR(50)  NOT NULL,
    section_title    VARCHAR(300) NOT NULL,
    act_id           SMALLINT UNSIGNED NOT NULL,
    severity_level   ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
    is_bailable      BOOLEAN NOT NULL DEFAULT TRUE,
    max_sentence_yrs TINYINT UNSIGNED,
    FOREIGN KEY (act_id) REFERENCES LegalAct (act_id) ON DELETE RESTRICT,
    UNIQUE (section_code, act_id)
) ENGINE=InnoDB;

-- =============================================================
-- CRIME TYPES (normalised lookup)
-- =============================================================

CREATE TABLE CrimeCategory (
    category_id   TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE    -- 'Cybercrime', 'Property', 'Violence'
) ENGINE=InnoDB;

CREATE TABLE CrimeType (
    crime_type_id   SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    crime_name      VARCHAR(150) NOT NULL,
    category_id     TINYINT UNSIGNED NOT NULL,
    FOREIGN KEY (category_id) REFERENCES CrimeCategory (category_id) ON DELETE RESTRICT,
    UNIQUE (crime_name, category_id)
) ENGINE=InnoDB;

-- =============================================================
-- COMPLAINANT (separate from Victim — not always same person)
-- =============================================================

CREATE TABLE Complainant (
    complainant_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(120) NOT NULL,
    gender         ENUM('Male','Female','Other','Unknown') NOT NULL DEFAULT 'Unknown',
    age            TINYINT UNSIGNED,
    contact_no     VARCHAR(20),
    email          VARCHAR(150),
    address        TEXT,
    id_type        VARCHAR(50),                -- Aadhar, Passport, etc.
    id_number      VARCHAR(50)
) ENGINE=InnoDB;

-- =============================================================
-- COMPLAINT
-- =============================================================

CREATE TABLE Complaint (
    complaint_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    complaint_number VARCHAR(30) NOT NULL UNIQUE,  -- e.g. COMP/2026/00123
    received_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    complaint_date   DATE NOT NULL,
    crime_type_id    SMALLINT UNSIGNED NOT NULL,
    description      TEXT NOT NULL,
    status           ENUM('Pending','Under Review','Converted to FIR','Dismissed','Closed')
                     NOT NULL DEFAULT 'Pending',
    station_id       INT UNSIGNED NOT NULL,
    receiving_officer_id INT UNSIGNED,
    complainant_id   INT UNSIGNED NOT NULL,
    FOREIGN KEY (crime_type_id)        REFERENCES CrimeType (crime_type_id)   ON DELETE RESTRICT,
    FOREIGN KEY (station_id)           REFERENCES PoliceStation (station_id)   ON DELETE RESTRICT,
    FOREIGN KEY (receiving_officer_id) REFERENCES Officer (officer_id)         ON DELETE SET NULL,
    FOREIGN KEY (complainant_id)       REFERENCES Complainant (complainant_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- FIR
-- =============================================================

CREATE TABLE FIR (
    fir_id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fir_number       VARCHAR(30) NOT NULL UNIQUE,   -- e.g. FIR/CHN/2026/00045
    crime_date       DATE NOT NULL,
    crime_time       TIME,
    crime_location   VARCHAR(255) NOT NULL,
    latitude         DECIMAL(9,6),
    longitude        DECIMAL(9,6),
    description      TEXT NOT NULL,
    status           ENUM('Open','Under Investigation','Chargesheeted','Closed','Abated')
                     NOT NULL DEFAULT 'Open',
    crime_type_id    SMALLINT UNSIGNED NOT NULL,
    station_id       INT UNSIGNED NOT NULL,
    registering_officer_id INT UNSIGNED,
    complaint_id     INT UNSIGNED UNIQUE,           -- nullable; FIR can be suo motu
    registered_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crime_type_id)          REFERENCES CrimeType (crime_type_id)   ON DELETE RESTRICT,
    FOREIGN KEY (station_id)             REFERENCES PoliceStation (station_id)   ON DELETE RESTRICT,
    FOREIGN KEY (registering_officer_id) REFERENCES Officer (officer_id)         ON DELETE SET NULL,
    FOREIGN KEY (complaint_id)           REFERENCES Complaint (complaint_id)     ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- CASE
-- =============================================================

CREATE TABLE CrimeCase (
    case_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_number  VARCHAR(30) NOT NULL UNIQUE,   -- e.g. CASE/2026/00012
    status       ENUM('Open','Under Investigation','Chargesheeted',
                      'Trial in Progress','Convicted','Acquitted',
                      'Closed','Referred') NOT NULL DEFAULT 'Open',
    priority     ENUM('Low','Normal','High','Critical') NOT NULL DEFAULT 'Normal',
    filed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at    DATETIME,
    fir_id       INT UNSIGNED NOT NULL UNIQUE,
    lead_officer_id INT UNSIGNED,
    FOREIGN KEY (fir_id)          REFERENCES FIR (fir_id)         ON DELETE RESTRICT,
    FOREIGN KEY (lead_officer_id) REFERENCES Officer (officer_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Case ↔ Officer (many-to-many, multiple officers per case)
CREATE TABLE CaseOfficer (
    case_officer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id         INT UNSIGNED NOT NULL,
    officer_id      INT UNSIGNED NOT NULL,
    assigned_role   VARCHAR(80) NOT NULL DEFAULT 'Investigating Officer',
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at      DATETIME,
    FOREIGN KEY (case_id)    REFERENCES CrimeCase (case_id)    ON DELETE CASCADE,
    FOREIGN KEY (officer_id) REFERENCES Officer   (officer_id) ON DELETE CASCADE,
    UNIQUE (case_id, officer_id)
) ENGINE=InnoDB;

-- Case ↔ LegalSection (many-to-many)
CREATE TABLE CaseSection (
    case_section_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id         INT UNSIGNED NOT NULL,
    section_id      INT UNSIGNED NOT NULL,
    added_by        INT UNSIGNED,              -- officer who added the section
    added_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id)    REFERENCES CrimeCase    (case_id)    ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES LegalSection (section_id) ON DELETE RESTRICT,
    FOREIGN KEY (added_by)   REFERENCES Officer       (officer_id) ON DELETE SET NULL,
    UNIQUE (case_id, section_id)
) ENGINE=InnoDB;

-- =============================================================
-- CRIMINAL
-- =============================================================

CREATE TABLE Criminal (
    criminal_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    crn               VARCHAR(20) NOT NULL UNIQUE,  -- Criminal Record Number
    full_name         VARCHAR(120) NOT NULL,
    alias_names       JSON,                          -- ["Ravi", "Kutta"] — searchable
    date_of_birth     DATE,
    gender            ENUM('Male','Female','Other','Unknown') NOT NULL DEFAULT 'Unknown',
    nationality       VARCHAR(60) NOT NULL DEFAULT 'Indian',
    id_type           VARCHAR(50),
    id_number         VARCHAR(50),
    address           TEXT,
    city_id           INT UNSIGNED,
    height_cm         SMALLINT UNSIGNED,
    weight_kg         SMALLINT UNSIGNED,
    blood_group       ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown')
                      DEFAULT 'Unknown',
    identification_marks TEXT,
    photo_url         VARCHAR(500),
    fingerprint_ref   VARCHAR(100),                 -- external biometric system ref
    risk_level        ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Low',
    arrest_status     ENUM('At Large','Arrested','In Custody','Released on Bail',
                          'Convicted','Deceased','Absconding') NOT NULL DEFAULT 'At Large',
    is_repeat_offender BOOLEAN NOT NULL DEFAULT FALSE,
    total_cases       SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- denormalized counter
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES City (city_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Case ↔ Criminal (many-to-many)
CREATE TABLE CaseCriminal (
    case_criminal_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id          INT UNSIGNED NOT NULL,
    criminal_id      INT UNSIGNED NOT NULL,
    role_in_case     ENUM('Main Accused','Co-Accused','Suspect','Witness',
                         'Accomplice','Absconder') NOT NULL DEFAULT 'Suspect',
    arrested_in_case BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (case_id)     REFERENCES CrimeCase (case_id)   ON DELETE CASCADE,
    FOREIGN KEY (criminal_id) REFERENCES Criminal  (criminal_id) ON DELETE CASCADE,
    UNIQUE (case_id, criminal_id)
) ENGINE=InnoDB;

-- Criminal network / gang links
CREATE TABLE CriminalRelation (
    relation_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    criminal_id_a INT UNSIGNED NOT NULL,
    criminal_id_b INT UNSIGNED NOT NULL,
    relation_type ENUM('Gang Member','Associate','Family','Known Contact','Unknown')
                  NOT NULL DEFAULT 'Unknown',
    notes         TEXT,
    FOREIGN KEY (criminal_id_a) REFERENCES Criminal (criminal_id) ON DELETE CASCADE,
    FOREIGN KEY (criminal_id_b) REFERENCES Criminal (criminal_id) ON DELETE CASCADE,
    CHECK (criminal_id_a <> criminal_id_b),
    UNIQUE (criminal_id_a, criminal_id_b)
) ENGINE=InnoDB;

-- =============================================================
-- VICTIM
-- =============================================================

CREATE TABLE Victim (
    victim_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(120) NOT NULL,
    gender         ENUM('Male','Female','Other','Unknown') NOT NULL DEFAULT 'Unknown',
    age            TINYINT UNSIGNED,
    contact_no     VARCHAR(20),
    email          VARCHAR(150),
    address        TEXT,
    injury_type    ENUM('None','Minor','Grievous','Fatal') NOT NULL DEFAULT 'None',
    injury_details TEXT,
    medical_ref    VARCHAR(100),                   -- hospital/case reference
    is_minor       BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

-- Case ↔ Victim (many-to-many)
CREATE TABLE CaseVictim (
    case_victim_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id        INT UNSIGNED NOT NULL,
    victim_id      INT UNSIGNED NOT NULL,
    FOREIGN KEY (case_id)   REFERENCES CrimeCase (case_id)   ON DELETE CASCADE,
    FOREIGN KEY (victim_id) REFERENCES Victim    (victim_id) ON DELETE CASCADE,
    UNIQUE (case_id, victim_id)
) ENGINE=InnoDB;

-- =============================================================
-- EVIDENCE
-- =============================================================

CREATE TABLE EvidenceType (
    evidence_type_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_name        VARCHAR(80) NOT NULL UNIQUE,  -- 'Physical','Digital','Documentary','Biological'
    requires_lab     BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

CREATE TABLE Evidence (
    evidence_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    evidence_ref     VARCHAR(30) NOT NULL UNIQUE,  -- EVD/2026/00089
    evidence_type_id TINYINT UNSIGNED NOT NULL,
    description      TEXT NOT NULL,
    seized_date      DATE NOT NULL,
    seized_by        INT UNSIGNED,
    location_seized  VARCHAR(255),
    chain_of_custody JSON,                          -- [{officer_id, timestamp, action}]
    custody_status   ENUM('Collected','In Lab','In Storage','Presented in Court',
                         'Destroyed','Returned') NOT NULL DEFAULT 'Collected',
    storage_location VARCHAR(255),
    lab_report_ref   VARCHAR(100),
    case_id          INT UNSIGNED NOT NULL,
    FOREIGN KEY (evidence_type_id) REFERENCES EvidenceType (evidence_type_id) ON DELETE RESTRICT,
    FOREIGN KEY (seized_by)        REFERENCES Officer      (officer_id)        ON DELETE SET NULL,
    FOREIGN KEY (case_id)          REFERENCES CrimeCase    (case_id)           ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- CASE LOG (full timeline)
-- =============================================================

CREATE TABLE CaseLog (
    log_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id      INT UNSIGNED NOT NULL,
    action_type  ENUM('Status Change','Officer Assigned','Evidence Added',
                      'Arrest Made','Court Update','Section Added',
                      'Note','Document Added','Other') NOT NULL DEFAULT 'Note',
    action_taken TEXT NOT NULL,
    old_status   VARCHAR(60),
    new_status   VARCHAR(60),
    remarks      TEXT,
    performed_by INT UNSIGNED,                 -- officer_id
    logged_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id)      REFERENCES CrimeCase (case_id)    ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES Officer   (officer_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- COURT
-- =============================================================

CREATE TABLE Court (
    court_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    court_name VARCHAR(200) NOT NULL,
    city_id    INT UNSIGNED,
    court_type ENUM('Magistrate','Sessions','High Court','Supreme Court','Special','Fast Track')
               NOT NULL DEFAULT 'Sessions',
    FOREIGN KEY (city_id) REFERENCES City (city_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE CourtProceeding (
    proceeding_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id        INT UNSIGNED NOT NULL,
    court_id       INT UNSIGNED NOT NULL,
    hearing_date   DATE NOT NULL,
    next_date      DATE,
    proceeding_type ENUM('Bail Hearing','Framing of Charges','Evidence Recording',
                         'Arguments','Judgment','Sentencing','Other') NOT NULL DEFAULT 'Other',
    judge_name     VARCHAR(100),
    outcome        VARCHAR(300),
    notes          TEXT,
    recorded_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id)  REFERENCES CrimeCase (case_id)  ON DELETE CASCADE,
    FOREIGN KEY (court_id) REFERENCES Court     (court_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE Judgment (
    judgment_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id        INT UNSIGNED NOT NULL UNIQUE,
    court_id       INT UNSIGNED NOT NULL,
    judgment_date  DATE NOT NULL,
    verdict        ENUM('Convicted','Acquitted','Dismissed','Compounded','Appeal Filed')
                   NOT NULL,
    sentence_years TINYINT UNSIGNED DEFAULT 0,
    sentence_notes TEXT,
    appeal_filed   BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (case_id)  REFERENCES CrimeCase (case_id)  ON DELETE CASCADE,
    FOREIGN KEY (court_id) REFERENCES Court     (court_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =============================================================
-- AUDIT LOG (who changed what and when)
-- =============================================================

CREATE TABLE AuditLog (
    audit_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED,
    action      ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','VIEW_SENSITIVE')
                NOT NULL,
    table_name  VARCHAR(80),
    record_id   INT UNSIGNED,
    old_data    JSON,
    new_data    JSON,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(300),
    performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User (user_id) ON DELETE SET NULL,
    INDEX idx_audit_user    (user_id),
    INDEX idx_audit_table   (table_name, record_id),
    INDEX idx_audit_time    (performed_at)
) ENGINE=InnoDB;

-- =============================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================

CREATE INDEX idx_fir_status        ON FIR (status);
CREATE INDEX idx_fir_crime_date    ON FIR (crime_date);
CREATE INDEX idx_fir_station       ON FIR (station_id);
CREATE INDEX idx_fir_crime_type    ON FIR (crime_type_id);

CREATE INDEX idx_case_status       ON CrimeCase (status);
CREATE INDEX idx_case_priority     ON CrimeCase (priority);
CREATE INDEX idx_case_officer      ON CrimeCase (lead_officer_id);

CREATE INDEX idx_criminal_status   ON Criminal (arrest_status);
CREATE INDEX idx_criminal_risk     ON Criminal (risk_level);
CREATE INDEX idx_criminal_repeat   ON Criminal (is_repeat_offender);
CREATE INDEX idx_criminal_name     ON Criminal (full_name);

CREATE INDEX idx_caselog_case      ON CaseLog (case_id, logged_at);
CREATE INDEX idx_complaint_status  ON Complaint (status);
CREATE INDEX idx_evidence_case     ON Evidence (case_id);

SET FOREIGN_KEY_CHECKS = 1;
