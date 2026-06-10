-- =============================================================
-- SENTINEL CRMS — CORE LOGIC SQL v2.0
-- Transactions + 5 Advanced Queries + Key Views
-- =============================================================

USE sentinel_v2;

-- =============================================================
-- TRANSACTION: Complaint → FIR → Case (atomic flow)
-- =============================================================

DELIMITER $$

CREATE PROCEDURE register_complaint_to_case(
    -- Complainant
    IN p_complainant_name    VARCHAR(120),
    IN p_complainant_gender  VARCHAR(10),
    IN p_complainant_age     TINYINT,
    IN p_complainant_contact VARCHAR(20),
    IN p_complainant_address TEXT,

    -- Complaint
    IN p_complaint_number  VARCHAR(30),
    IN p_complaint_date    DATE,
    IN p_crime_type_id     SMALLINT,
    IN p_description       TEXT,
    IN p_station_id        INT,
    IN p_officer_id        INT,

    -- FIR
    IN p_fir_number        VARCHAR(30),
    IN p_crime_date        DATE,
    IN p_crime_location    VARCHAR(255),

    -- Case
    IN p_case_number       VARCHAR(30),
    IN p_priority          VARCHAR(20),

    OUT p_complaint_id INT,
    OUT p_fir_id       INT,
    OUT p_case_id      INT,
    OUT p_error_msg    VARCHAR(500)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 p_error_msg = MESSAGE_TEXT;
        SET p_complaint_id = -1;
        SET p_fir_id       = -1;
        SET p_case_id      = -1;
    END;

    START TRANSACTION;

    -- 1. Insert Complainant
    INSERT INTO Complainant (full_name, gender, age, contact_no, address)
    VALUES (p_complainant_name, p_complainant_gender, p_complainant_age,
            p_complainant_contact, p_complainant_address);

    SET p_complaint_id = LAST_INSERT_ID();

    -- 2. Insert Complaint
    INSERT INTO Complaint (
        complaint_number, complaint_date, crime_type_id, description,
        status, station_id, receiving_officer_id, complainant_id
    ) VALUES (
        p_complaint_number, p_complaint_date, p_crime_type_id, p_description,
        'Under Review', p_station_id, p_officer_id, p_complaint_id
    );

    SET @comp_pk = LAST_INSERT_ID();

    -- 3. Update complaint status
    UPDATE Complaint SET status = 'Converted to FIR' WHERE complaint_id = @comp_pk;

    -- 4. Insert FIR
    INSERT INTO FIR (
        fir_number, crime_date, crime_location, description, status,
        crime_type_id, station_id, registering_officer_id, complaint_id
    ) VALUES (
        p_fir_number, p_crime_date, p_crime_location, p_description, 'Open',
        p_crime_type_id, p_station_id, p_officer_id, @comp_pk
    );

    SET p_fir_id = LAST_INSERT_ID();

    -- 5. Insert Case
    INSERT INTO CrimeCase (case_number, status, priority, fir_id, lead_officer_id)
    VALUES (p_case_number, 'Open', p_priority, p_fir_id, p_officer_id);

    SET p_case_id = LAST_INSERT_ID();

    -- 6. Auto-assign lead officer to CaseOfficer
    INSERT INTO CaseOfficer (case_id, officer_id, assigned_role)
    VALUES (p_case_id, p_officer_id, 'Lead Investigating Officer');

    -- 7. Log the case creation
    INSERT INTO CaseLog (case_id, action_type, action_taken, new_status, performed_by)
    VALUES (p_case_id, 'Status Change', 'Case created from FIR', 'Open', p_officer_id);

    COMMIT;
    SET p_error_msg = 'SUCCESS';
END$$

-- =============================================================
-- PROCEDURE: Update Case Status (with audit log)
-- =============================================================

CREATE PROCEDURE update_case_status(
    IN p_case_id    INT,
    IN p_new_status VARCHAR(60),
    IN p_officer_id INT,
    IN p_remarks    TEXT
)
BEGIN
    DECLARE v_old_status VARCHAR(60);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION ROLLBACK;

    START TRANSACTION;

    SELECT status INTO v_old_status FROM CrimeCase WHERE case_id = p_case_id FOR UPDATE;

    UPDATE CrimeCase
    SET status    = p_new_status,
        closed_at = IF(p_new_status IN ('Closed','Convicted','Acquitted'), NOW(), NULL)
    WHERE case_id = p_case_id;

    INSERT INTO CaseLog (case_id, action_type, action_taken, old_status, new_status, remarks, performed_by)
    VALUES (p_case_id, 'Status Change',
            CONCAT('Status changed from ', v_old_status, ' to ', p_new_status),
            v_old_status, p_new_status, p_remarks, p_officer_id);

    COMMIT;
END$$

-- =============================================================
-- PROCEDURE: Add Evidence (with chain-of-custody init)
-- =============================================================

CREATE PROCEDURE add_evidence(
    IN p_evidence_ref  VARCHAR(30),
    IN p_type_id       TINYINT,
    IN p_description   TEXT,
    IN p_seized_date   DATE,
    IN p_seized_by     INT,
    IN p_location      VARCHAR(255),
    IN p_case_id       INT
)
BEGIN
    DECLARE v_chain JSON;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION ROLLBACK;

    SET v_chain = JSON_ARRAY(
        JSON_OBJECT(
            'officer_id', p_seized_by,
            'timestamp',  NOW(),
            'action',     'Collected at scene'
        )
    );

    START TRANSACTION;

    INSERT INTO Evidence (
        evidence_ref, evidence_type_id, description, seized_date,
        seized_by, location_seized, chain_of_custody, case_id
    ) VALUES (
        p_evidence_ref, p_type_id, p_description, p_seized_date,
        p_seized_by, p_location, v_chain, p_case_id
    );

    INSERT INTO CaseLog (case_id, action_type, action_taken, performed_by)
    VALUES (p_case_id, 'Evidence Added',
            CONCAT('Evidence ', p_evidence_ref, ' added: ', LEFT(p_description,100)),
            p_seized_by);

    COMMIT;
END$$

DELIMITER ;

-- =============================================================
-- QUERY 1: REPEAT OFFENDERS (with case count)
-- =============================================================

SELECT
    c.criminal_id,
    c.crn,
    c.full_name,
    c.alias_names,
    c.risk_level,
    c.arrest_status,
    COUNT(DISTINCT cc.case_id)  AS total_cases,
    GROUP_CONCAT(DISTINCT ct.crime_name ORDER BY ct.crime_name SEPARATOR ' | ') AS crimes_involved,
    MAX(f.crime_date)           AS last_crime_date
FROM Criminal c
JOIN CaseCriminal cc ON cc.criminal_id = c.criminal_id
JOIN CrimeCase   ca ON ca.case_id      = cc.case_id
JOIN FIR          f ON f.fir_id        = ca.fir_id
JOIN CrimeType   ct ON ct.crime_type_id = f.crime_type_id
GROUP BY c.criminal_id
HAVING total_cases >= 2
ORDER BY total_cases DESC, c.risk_level DESC;

-- =============================================================
-- QUERY 2: ACTIVE CASES WITH OFFICER WORKLOAD
-- =============================================================

SELECT
    ca.case_id,
    ca.case_number,
    ca.status,
    ca.priority,
    ca.filed_at,
    DATEDIFF(NOW(), ca.filed_at)   AS age_days,
    f.fir_number,
    f.crime_location,
    ct.crime_name,
    o.full_name   AS lead_officer,
    ps.station_name,
    COUNT(DISTINCT ev.evidence_id)  AS evidence_count,
    COUNT(DISTINCT crim.criminal_id) AS suspects_count,
    MAX(cl.logged_at)               AS last_activity
FROM CrimeCase ca
JOIN FIR          f   ON f.fir_id          = ca.fir_id
JOIN CrimeType    ct  ON ct.crime_type_id   = f.crime_type_id
LEFT JOIN Officer  o   ON o.officer_id      = ca.lead_officer_id
LEFT JOIN PoliceStation ps ON ps.station_id = f.station_id
LEFT JOIN Evidence ev  ON ev.case_id        = ca.case_id
LEFT JOIN CaseCriminal crim ON crim.case_id = ca.case_id
LEFT JOIN CaseLog  cl  ON cl.case_id        = ca.case_id
WHERE ca.status IN ('Open','Under Investigation')
GROUP BY ca.case_id
ORDER BY ca.priority DESC, age_days DESC;

-- =============================================================
-- QUERY 3: CRIME STATISTICS BY LOCATION (station / city / region)
-- =============================================================

SELECT
    r.region_name,
    ci.city_name,
    ps.station_name,
    ct.crime_name,
    cc_cat.category_name AS crime_category,
    COUNT(f.fir_id)                  AS total_firs,
    COUNT(ca.case_id)                AS total_cases,
    SUM(ca.status = 'Closed')        AS cases_closed,
    SUM(ca.status IN ('Open','Under Investigation')) AS cases_active,
    YEAR(f.crime_date)               AS crime_year,
    MONTH(f.crime_date)              AS crime_month
FROM FIR f
JOIN PoliceStation ps ON ps.station_id   = f.station_id
JOIN City          ci ON ci.city_id      = ps.city_id
JOIN Region         r ON r.region_id     = ci.region_id
JOIN CrimeType     ct ON ct.crime_type_id = f.crime_type_id
JOIN CrimeCategory cc_cat ON cc_cat.category_id = ct.category_id
LEFT JOIN CrimeCase ca ON ca.fir_id = f.fir_id
GROUP BY r.region_id, ci.city_id, ps.station_id, ct.crime_type_id, crime_year, crime_month
ORDER BY crime_year DESC, crime_month DESC, total_firs DESC;

-- =============================================================
-- QUERY 4: CASE HISTORY TIMELINE (full audit trail)
-- =============================================================

-- Replace ? with actual case_id
SELECT
    cl.logged_at,
    cl.action_type,
    cl.action_taken,
    cl.old_status,
    cl.new_status,
    cl.remarks,
    o.full_name AS performed_by_officer,
    rk.rank_name
FROM CaseLog cl
LEFT JOIN Officer     o  ON o.officer_id  = cl.performed_by
LEFT JOIN OfficerRank rk ON rk.rank_id    = o.rank_id
WHERE cl.case_id = ?
ORDER BY cl.logged_at ASC;

-- =============================================================
-- QUERY 5: OFFICER WORKLOAD REPORT
-- =============================================================

SELECT
    o.officer_id,
    o.badge_number,
    o.full_name,
    rk.rank_name,
    ps.station_name,
    COUNT(DISTINCT co.case_id)                                            AS assigned_cases,
    SUM(ca.status IN ('Open','Under Investigation'))                      AS active_cases,
    SUM(ca.status IN ('Closed','Convicted','Acquitted'))                  AS closed_cases,
    SUM(ca.priority = 'Critical')                                         AS critical_cases,
    COUNT(DISTINCT cl.log_id)                                             AS total_log_entries,
    MAX(cl.logged_at)                                                     AS last_action_at,
    ROUND(SUM(ca.status IN ('Closed','Convicted','Acquitted')) * 100.0
          / NULLIF(COUNT(DISTINCT co.case_id),0), 1)                     AS closure_rate_pct
FROM Officer o
JOIN OfficerRank    rk ON rk.rank_id    = o.rank_id
JOIN PoliceStation  ps ON ps.station_id = o.station_id
LEFT JOIN CaseOfficer co ON co.officer_id = o.officer_id
LEFT JOIN CrimeCase  ca ON ca.case_id     = co.case_id
LEFT JOIN CaseLog    cl ON cl.performed_by = o.officer_id
WHERE o.is_active = TRUE
GROUP BY o.officer_id
ORDER BY active_cases DESC, closure_rate_pct ASC;

-- =============================================================
-- VIEWS
-- =============================================================

CREATE OR REPLACE VIEW v_active_cases AS
SELECT
    ca.case_id, ca.case_number, ca.status, ca.priority,
    ca.filed_at,
    DATEDIFF(NOW(), ca.filed_at) AS age_days,
    f.fir_number, f.crime_date, f.crime_location,
    ct.crime_name,
    o.full_name AS lead_officer,
    ps.station_name, ci.city_name
FROM CrimeCase ca
JOIN FIR f ON f.fir_id = ca.fir_id
JOIN CrimeType ct ON ct.crime_type_id = f.crime_type_id
LEFT JOIN Officer o ON o.officer_id = ca.lead_officer_id
LEFT JOIN PoliceStation ps ON ps.station_id = f.station_id
LEFT JOIN City ci ON ci.city_id = ps.city_id
WHERE ca.status IN ('Open','Under Investigation');

CREATE OR REPLACE VIEW v_repeat_offenders AS
SELECT
    c.criminal_id, c.crn, c.full_name, c.risk_level, c.arrest_status,
    COUNT(DISTINCT cc.case_id) AS case_count
FROM Criminal c
JOIN CaseCriminal cc ON cc.criminal_id = c.criminal_id
GROUP BY c.criminal_id
HAVING case_count >= 2;

CREATE OR REPLACE VIEW v_station_stats AS
SELECT
    ps.station_id, ps.station_name, ci.city_name,
    COUNT(DISTINCT f.fir_id)      AS total_firs,
    COUNT(DISTINCT ca.case_id)    AS total_cases,
    SUM(ca.status = 'Closed')     AS closed_cases
FROM PoliceStation ps
LEFT JOIN FIR        f  ON f.station_id  = ps.station_id
LEFT JOIN CrimeCase  ca ON ca.fir_id     = f.fir_id
LEFT JOIN City       ci ON ci.city_id    = ps.city_id
GROUP BY ps.station_id;
