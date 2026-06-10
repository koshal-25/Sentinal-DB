-- =============================================================
-- SENTINEL CRMS — SEED DATA v2.0
-- =============================================================

USE sentinel_v2;

-- Location
INSERT INTO Region (region_name, state) VALUES
  ('Chennai Metropolitan', 'Tamil Nadu'),
  ('Delhi NCR', 'Delhi');

INSERT INTO City (city_name, region_id) VALUES
  ('Chennai', 1), ('Delhi', 2);

INSERT INTO PoliceStation (station_name, station_code, address, contact_no, city_id) VALUES
  ('Chennai Central', 'CHN-CEN', '1 NSC Bose Rd, Chennai', '044-28510750', 1),
  ('Chennai North',   'CHN-NTH', '14 Mint St, Chennai',    '044-25216510', 1),
  ('Delhi Cyber Cell','DEL-CYB', 'ITO, Delhi',             '011-23490490', 2);

-- Roles (already inserted in schema) — just verify
SELECT role_name FROM Role;

-- Users (passwords are bcrypt hashes of 'Demo@1234')
INSERT INTO User (username, password_hash, email, role_id) VALUES
  ('admin01',    '$2b$12$examplehashAdmin',     'admin@sentinel.gov',    1),
  ('officer_rk', '$2b$12$examplehashOfficer1',  'rajesh.k@sentinel.gov', 2),
  ('officer_as', '$2b$12$examplehashOfficer2',  'anita.s@sentinel.gov',  2),
  ('inv_pm',     '$2b$12$examplehashInv',       'priya.m@sentinel.gov',  3),
  ('court_jn',   '$2b$12$examplehashCourt',     'judge.n@court.gov',     4);

-- Officer Ranks
INSERT INTO OfficerRank (rank_name) VALUES
  ('Inspector'),('Sub Inspector'),('Assistant Sub Inspector'),
  ('Constable'),('Deputy Commissioner of Police');

-- Officers
INSERT INTO Officer (badge_number, full_name, rank_id, station_id, contact_no, email, user_id) VALUES
  ('CHN001', 'Rajesh Kumar',  1, 1, '9876543210', 'rajesh.k@sentinel.gov',  2),
  ('CHN002', 'Anita Sharma',  2, 2, '9876501234', 'anita.s@sentinel.gov',   3),
  ('DEL001', 'Priya Menon',   1, 3, '9871234560', 'priya.m@sentinel.gov',   4);

-- Legal Acts
INSERT INTO LegalAct (act_code, act_name) VALUES
  ('IPC',  'Indian Penal Code, 1860'),
  ('BNS',  'Bharatiya Nyaya Sanhita, 2023'),
  ('ITACT','Information Technology Act, 2000'),
  ('NDPS', 'Narcotic Drugs and Psychotropic Substances Act, 1985');

-- Legal Sections
INSERT INTO LegalSection (section_code, section_title, act_id, severity_level, is_bailable, max_sentence_yrs) VALUES
  ('379',  'Theft',                        1, 'Medium',   TRUE,  3),
  ('302',  'Murder',                       1, 'Critical',  FALSE, 99),
  ('420',  'Cheating',                     1, 'Medium',   TRUE,  7),
  ('66',   'Computer Related Offences',   3, 'High',     FALSE, 3),
  ('66C',  'Identity Theft',               3, 'High',     FALSE, 3),
  ('103',  'Murder (BNS equivalent)',      2, 'Critical',  FALSE, 99);

-- Crime Categories & Types
INSERT INTO CrimeCategory (category_name) VALUES
  ('Property Crime'),('Cybercrime'),('Violent Crime'),('Drug Offence'),('Financial Fraud');

INSERT INTO CrimeType (crime_name, category_id) VALUES
  ('Theft',        1),('Burglary',     1),
  ('Cyber Fraud',  2),('Identity Theft',2),
  ('Assault',      3),('Murder',        3),
  ('Drug Peddling',4),
  ('Bank Fraud',   5),('UPI Scam',      5);

-- Complainants
INSERT INTO Complainant (full_name, gender, age, contact_no, address) VALUES
  ('Suresh Kumar', 'Male',   35, '9000011111', '12 Anna Nagar, Chennai'),
  ('Meena Devi',   'Female', 29, '9000022222', '45 T.Nagar, Chennai');

-- Complaints
INSERT INTO Complaint (complaint_number, complaint_date, crime_type_id, description, status, station_id, receiving_officer_id, complainant_id) VALUES
  ('COMP/2026/001', '2026-02-08', 1, 'Mobile phone stolen from MTC bus on route 17C', 'Converted to FIR', 1, 1, 1),
  ('COMP/2026/002', '2026-02-11', 3, 'Bank account compromised via OTP phishing', 'Converted to FIR', 2, 2, 2);

-- FIRs
INSERT INTO FIR (fir_number, crime_date, crime_time, crime_location, latitude, longitude, description, status, crime_type_id, station_id, registering_officer_id, complaint_id) VALUES
  ('FIR/CHN/2026/001', '2026-02-10', '14:30:00', 'MTC Bus Route 17C, Koyambedu', 13.0694, 80.1948, 'Mobile phone stolen from victim while boarding bus', 'Under Investigation', 1, 1, 1, 1),
  ('FIR/CHN/2026/002', '2026-02-12', '10:00:00', '45 T.Nagar, Chennai',           13.0395, 80.2326, 'Victim defrauded of Rs 85,000 via OTP phishing',   'Under Investigation', 3, 2, 2, 2);

-- Cases
INSERT INTO CrimeCase (case_number, status, priority, fir_id, lead_officer_id) VALUES
  ('CASE/2026/001', 'Under Investigation', 'Normal',   1, 1),
  ('CASE/2026/002', 'Under Investigation', 'High',     2, 2);

-- CaseOfficer
INSERT INTO CaseOfficer (case_id, officer_id, assigned_role) VALUES
  (1, 1, 'Lead Investigating Officer'),
  (2, 2, 'Lead Investigating Officer'),
  (2, 3, 'Cyber Expert');

-- Case Sections
INSERT INTO CaseSection (case_id, section_id, added_by) VALUES
  (1, 1, 1),  -- Case 1 → IPC 379
  (2, 4, 2),  -- Case 2 → IT 66
  (2, 5, 2);  -- Case 2 → IT 66C

-- Criminals
INSERT INTO Criminal (crn, full_name, alias_names, date_of_birth, gender, nationality, address, city_id, height_cm, weight_kg, blood_group, identification_marks, risk_level, arrest_status, is_repeat_offender, total_cases) VALUES
  ('CRN/TN/001', 'Ravi Kumar',  '["Ravi","Ravi Anna"]', '1995-05-12', 'Male', 'Indian', '123 South St, Chennai', 1, 175, 70, 'O+', 'Scar on forehead', 'High',   'Arrested', TRUE,  3),
  ('CRN/DL/001', 'Karan Singh', '["Karan","Cyber K"]',  '2000-08-20', 'Male', 'Indian', '404 Cyber Block, Delhi',2, 180, 75, 'B+', 'Tattoo on right arm','Medium','In Custody', FALSE, 1);

-- CaseCriminal
INSERT INTO CaseCriminal (case_id, criminal_id, role_in_case, arrested_in_case) VALUES
  (1, 1, 'Main Accused', TRUE),
  (2, 2, 'Suspect',      FALSE);

-- Victims
INSERT INTO Victim (full_name, gender, age, contact_no, address, injury_type) VALUES
  ('Suresh Kumar', 'Male',   35, '9000011111', '12 Anna Nagar, Chennai', 'None'),
  ('Meena Devi',   'Female', 29, '9000022222', '45 T.Nagar, Chennai',   'None');

-- CaseVictim
INSERT INTO CaseVictim (case_id, victim_id) VALUES (1,1),(2,2);

-- Evidence Types
INSERT INTO EvidenceType (type_name, requires_lab) VALUES
  ('Physical',    FALSE),
  ('Digital',     TRUE),
  ('Documentary', FALSE),
  ('Biological',  TRUE),
  ('CCTV Footage',TRUE);

-- Evidence
INSERT INTO Evidence (evidence_ref, evidence_type_id, description, seized_date, seized_by, location_seized, chain_of_custody, case_id) VALUES
  ('EVD/2026/001', 1, 'Recovered Samsung Galaxy S21 with IMEI 35xxxxxxxx', '2026-02-12', 1, 'Koyambedu Bus Stand', JSON_ARRAY(JSON_OBJECT('officer_id',1,'timestamp',NOW(),'action','Collected at scene')), 1),
  ('EVD/2026/002', 2, 'Lenovo laptop used for phishing campaign, MAC 00:1A:xx', '2026-02-14', 2, 'Accused residence, Delhi', JSON_ARRAY(JSON_OBJECT('officer_id',2,'timestamp',NOW(),'action','Seized from residence')), 2);

-- Case Logs
INSERT INTO CaseLog (case_id, action_type, action_taken, old_status, new_status, remarks, performed_by) VALUES
  (1, 'Status Change', 'Case registered from FIR/CHN/2026/001', NULL, 'Open', 'FIR converted to case', 1),
  (1, 'Arrest Made',   'Suspect Ravi Kumar arrested', 'Open', 'Under Investigation', 'Arrested near Koyambedu', 1),
  (1, 'Evidence Added','CCTV footage obtained from bus stand', NULL, NULL, 'Footage shows suspect', 1),
  (2, 'Status Change', 'Case registered from FIR/CHN/2026/002', NULL, 'Open', NULL, 2),
  (2, 'Officer Assigned','Cyber Expert Priya Menon added to case', NULL, NULL, 'Digital forensics assigned', 2),
  (2, 'Evidence Added','Laptop seized from Delhi accused', NULL, NULL, 'Digital forensics ongoing', 3);

-- Courts
INSERT INTO Court (court_name, city_id, court_type) VALUES
  ('Chennai District Court', 1, 'Sessions'),
  ('Cyber Crime Court Chennai', 1, 'Special'),
  ('Delhi Sessions Court', 2, 'Sessions');

-- Court Proceedings
INSERT INTO CourtProceeding (case_id, court_id, hearing_date, next_date, proceeding_type, judge_name, outcome) VALUES
  (1, 1, '2026-03-01', '2026-04-01', 'Bail Hearing', 'Hon. Justice Ramesh', 'Bail denied; accused in judicial custody'),
  (2, 2, '2026-03-05', '2026-04-10', 'Framing of Charges', 'Hon. Justice Kavitha', 'Charges under IT Act 66 and 66C framed');
