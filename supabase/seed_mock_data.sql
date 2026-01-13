-- ===============================================================================================
-- FULL MOCK DATA SEED SCRIPT FOR HRMS (COMPREHENSIVE)
-- Purpose: Populates the database with test employees, attendance (current + historical),
--          leaves, recruitment data, helpdesk tickets, and announcements.
-- Target Period: 
--    - Historical: Aug 2025, Sept 2025, Oct 2025 (Simple Present)
--    - Current Payroll Cycle: Oct 26, 2025 to Nov 25, 2025 (Detailed Scenarios)
-- ===============================================================================================

BEGIN;

-- 1. Setup System Settings (Payroll Cycle) --------------------------------------------------------
INSERT INTO system_settings (key, value, description)
VALUES 
    ('payroll_start_day', '26', 'Start day of payroll cycle (prev month)'),
    ('payroll_end_day', '25', 'End day of payroll cycle (curr month)'),
    ('default_work_hours', '9', 'Default daily work hours')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Setup Office Locations -----------------------------------------------------------------------
INSERT INTO office_locations (name, latitude, longitude, radius_m)
VALUES 
    ('HQ - Tech Park', 12.9716, 77.5946, 500),
    ('Sales Office - City Center', 12.9279, 77.6271, 300)
ON CONFLICT DO NOTHING;

-- 3. Create Holiday (Deepavali - late Oct/Nov usually) --------------------------------------------
INSERT INTO leave_calendar_events (title, description, event_date)
VALUES 
    ('Test Holiday', 'Public Holiday', '2025-11-12')
ON CONFLICT DO NOTHING;

-- 4. Create Mock Users and Profiles ---------------------------------------------------------------
DO $$
DECLARE
    -- User IDs
    u_alice uuid := uuid_generate_v4();
    u_bob uuid := uuid_generate_v4();
    u_charlie uuid := uuid_generate_v4();
    u_david uuid := uuid_generate_v4();
    u_eve uuid := uuid_generate_v4();
    u_frank uuid := uuid_generate_v4();

    -- Recruitment IDs
    job_react uuid := uuid_generate_v4();
    job_hr uuid := uuid_generate_v4();
    
    -- Loop variables
    loop_date date;
    hist_start date := '2025-08-01';
    hist_end date := '2025-10-25';
    curr_start date := '2025-10-26';
    curr_end date := '2025-11-25';
    is_weekend boolean;
    holiday_exists boolean;
BEGIN
    -- A. INSERT AUTH USERS (Simulated)
    -- Alice (HR Manager)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (u_alice, 'alice.hr@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Admin","role":"hr"}', 'authenticated', 'authenticated');
    
    INSERT INTO profiles (id, full_name, email, role, designation, salary, daily_work_hours, date_joined, phone)
    VALUES (u_alice, 'Alice Admin', 'alice.hr@test.com', 'hr', 'HR Manager', 80000, 9, '2023-01-15', '9876543210')
    ON CONFLICT (id) DO UPDATE SET salary=80000, role='hr';

    -- Bob (Developer)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (u_bob, 'bob.dev@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Developer","role":"employee"}', 'authenticated', 'authenticated');
    
    INSERT INTO profiles (id, full_name, email, role, designation, salary, daily_work_hours, date_joined, phone)
    VALUES (u_bob, 'Bob Developer', 'bob.dev@test.com', 'employee', 'Senior Dev', 60000, 9, '2024-03-01', '9876543211')
    ON CONFLICT (id) DO UPDATE SET salary=60000;

    -- Charlie (QA)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (u_charlie, 'charlie.qa@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Charlie QA","role":"employee"}', 'authenticated', 'authenticated');
    
    INSERT INTO profiles (id, full_name, email, role, designation, salary, daily_work_hours, date_joined, phone)
    VALUES (u_charlie, 'Charlie QA', 'charlie.qa@test.com', 'employee', 'QA Engineer', 50000, 9, '2024-06-10', '9876543212')
    ON CONFLICT (id) DO UPDATE SET salary=50000;

    -- David (Sales)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (u_david, 'david.sales@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Sales","role":"employee"}', 'authenticated', 'authenticated');
    
    INSERT INTO profiles (id, full_name, email, role, designation, salary, daily_work_hours, date_joined, phone)
    VALUES (u_david, 'David Sales', 'david.sales@test.com', 'employee', 'Sales Exec', 55000, 9, '2025-01-20', '9876543213')
    ON CONFLICT (id) DO UPDATE SET salary=55000;

    -- Eve (Remote)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (u_eve, 'eve.remote@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eve Remote","role":"employee"}', 'authenticated', 'authenticated');
    
    INSERT INTO profiles (id, full_name, email, role, designation, salary, daily_work_hours, date_joined, phone)
    VALUES (u_eve, 'Eve Remote', 'eve.remote@test.com', 'employee', 'Backend Lead', 70000, 9, '2023-08-01', '9876543214')
    ON CONFLICT (id) DO UPDATE SET salary=70000;

    -- Frank (Hybrid) - 45k - WFH Rejected Test
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    VALUES (u_frank, 'frank.hybrid@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Frank Hybrid","role":"employee"}', 'authenticated', 'authenticated');

    INSERT INTO profiles (id, full_name, email, role, designation, salary, daily_work_hours, date_joined, phone)
    VALUES (u_frank, 'Frank Hybrid', 'frank.hybrid@test.com', 'employee', 'Junior Dev', 45000, 9, '2025-05-15', '9876543215')
    ON CONFLICT (id) DO UPDATE SET salary=45000;


    -- B. HISTORICAL ATTENDANCE (Aug, Sept, Oct - Simple "Present") ------------------------------
    loop_date := hist_start;
    WHILE loop_date <= hist_end LOOP
        is_weekend := (EXTRACT(DOW FROM loop_date) IN (0, 6));
        IF NOT is_weekend THEN
            -- Everyone Present mostly
            INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status)
            VALUES 
                (u_alice, loop_date, 'onsite', loop_date + time '09:00:00', loop_date + time '18:00:00', 9, 'approved'),
                (u_bob, loop_date, 'onsite', loop_date + time '09:10:00', loop_date + time '18:10:00', 9, 'approved'),
                (u_charlie, loop_date, 'onsite', loop_date + time '09:30:00', loop_date + time '18:30:00', 9, 'approved');
            
            -- Eve (Remote)
            INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status, wfh_reason)
            VALUES (u_eve, loop_date, 'wfh', loop_date + time '08:00:00', loop_date + time '17:00:00', 9, 'approved', 'Regular WFH');
        END IF;
        loop_date := loop_date + 1;
    END LOOP;

    -- C. CURRENT PAYROLL CYCLE (Oct 26 - Nov 25 - Detailed Scenarios) ----------------------------
    loop_date := curr_start;
    WHILE loop_date <= curr_end LOOP
        is_weekend := (EXTRACT(DOW FROM loop_date) IN (0, 6));
        holiday_exists := EXISTS (SELECT 1 FROM leave_calendar_events WHERE event_date = loop_date);

        IF NOT is_weekend AND NOT holiday_exists THEN
            -- Alice: 100% Present
            INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status)
            VALUES (u_alice, loop_date, 'onsite', loop_date + time '09:00:00', loop_date + time '18:00:00', 9, 'approved');

            -- Bob: Leave on Nov 10
            IF loop_date <> '2025-11-10' THEN
                INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status)
                VALUES (u_bob, loop_date, 'onsite', loop_date + time '09:15:00', loop_date + time '18:15:00', 9, 'approved');
            END IF;

            -- Charlie: Leave Nov 14, 15, 16
            IF loop_date NOT IN ('2025-11-14', '2025-11-15', '2025-11-16') THEN
                INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status)
                VALUES (u_charlie, loop_date, 'onsite', loop_date + time '09:30:00', loop_date + time '18:30:00', 9, 'approved');
            END IF;

            -- David: Absent Nov 3, 4, 5 (No Log)
            IF loop_date NOT IN ('2025-11-03', '2025-11-04', '2025-11-05') THEN
                INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status)
                VALUES (u_david, loop_date, 'onsite', loop_date + time '10:00:00', loop_date + time '19:00:00', 9, 'approved');
            END IF;

            -- Eve: WFH
            INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status, wfh_reason)
            VALUES (u_eve, loop_date, 'wfh', loop_date + time '08:00:00', loop_date + time '17:00:00', 9, 'approved', 'Home Office');

            -- Frank (Hybrid):
            -- Nov 18: WFH Rejected. Nov 19: WFH Approved. Other days Present.
            IF loop_date = '2025-11-18' THEN
                -- Rejected WFH (Should be LOP)
                INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status, wfh_reason)
                VALUES (u_frank, loop_date, 'wfh', loop_date + time '09:00:00', loop_date + time '18:00:00', 9, 'rejected', 'Car broke down');
            ELSIF loop_date = '2025-11-19' THEN
                 -- Approved WFH
                INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status, wfh_reason)
                VALUES (u_frank, loop_date, 'wfh', loop_date + time '09:00:00', loop_date + time '18:00:00', 9, 'approved', 'Plumber visiting');
            ELSE
                 -- Regular Office
                INSERT INTO attendance_logs (user_id, work_date, mode, clock_in, clock_out, total_hours, status)
                VALUES (u_frank, loop_date, 'onsite', loop_date + time '09:00:00', loop_date + time '18:00:00', 9, 'approved');
            END IF;

        END IF;

        loop_date := loop_date + 1;
    END LOOP;

    -- D. LEAVE REQUESTS --------------------------------------------------------------------------
    -- Bob: 1 Day - Approved
    INSERT INTO leave_requests (user_id, start_date, end_date, reason, status)
    VALUES (u_bob, '2025-11-10', '2025-11-10', 'Doctor Appt', 'approved');

    -- Charlie: 3 Days - Approved (Will trigger LOP logic if insufficient balance, or simple count)
    INSERT INTO leave_requests (user_id, start_date, end_date, reason, status)
    VALUES (u_charlie, '2025-11-14', '2025-11-16', 'Family Emergency', 'approved');

    -- David: No Leave Request (Unauthorized Absence)

    -- E. RECRUITMENT (ATS) -----------------------------------------------------------------------
    INSERT INTO job_positions (id, title, department, description, status)
    VALUES 
        (job_react, 'Senior React Developer', 'Engineering', 'Lead frontend initiatives.', 'open'),
        (job_hr, 'HR Intern', 'Human Resources', 'Assist with payroll.', 'open');

    INSERT INTO candidates (job_id, full_name, email, phone, status)
    VALUES 
        (job_react, 'Sarah Conner', 'sarah@skynet.com', '555-0101', 'interview'),
        (job_react, 'John Wick', 'john@continental.com', '555-0102', 'applied'),
        (job_hr, 'Pam Beesly', 'pam@dundermifflin.com', '555-0199', 'shortlisted');

    -- Interviews
    INSERT INTO interviews (candidate_id, scheduled_at, interviewer, result)
    VALUES 
        ((SELECT id FROM candidates WHERE email='sarah@skynet.com'), now() + interval '1 day', 'Alice Admin', NULL);

    -- F. ANNOUNCEMENTS ---------------------------------------------------------------------------
    INSERT INTO announcements (title, content, is_active, created_by)
    VALUES 
        ('Welcome to the New HRMS', 'We are excited to launch the new portal. Please check your data.', true, u_alice),
        ('Policy Update: WFH', 'WFH requests now require approval 24h in advance.', true, u_alice);

    -- G. HELPDESK TICKETS ------------------------------------------------------------------------
    -- Bob (IT Issue)
    INSERT INTO tickets (employee_id, category, priority, subject, description, status)
    VALUES (u_bob, 'IT', 'High', 'Laptop overheating', 'My laptop fan is making noise', 'Open');
    
    -- Charlie (Payroll Query)
    INSERT INTO tickets (employee_id, category, priority, subject, description, status)
    VALUES (u_charlie, 'Payroll', 'Medium', 'Tax Deduction query', 'Why was tax higher this month?', 'Resolved');

END $$;

COMMIT;
