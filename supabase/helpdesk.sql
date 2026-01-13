-- Create Helpdesk Tables

-- 1. Enums
CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Closed');
CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE ticket_category AS ENUM ('Payroll', 'IT', 'HR', 'General', 'Other');

-- 2. Tickets Table
CREATE TABLE tickets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category ticket_category NOT NULL,
    priority ticket_priority DEFAULT 'Medium',
    subject text NOT NULL,
    description text NOT NULL,
    status ticket_status DEFAULT 'Open',
    assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Ticket Comments Table (for communication)
CREATE TABLE ticket_comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Tickets

-- Employee can view own tickets
CREATE POLICY "Employee view own tickets"
ON tickets FOR SELECT
TO authenticated
USING (auth.uid() = employee_id);

-- HR can view all tickets
CREATE POLICY "HR view all tickets"
ON tickets FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- Employee can create tickets
CREATE POLICY "Employee create tickets"
ON tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

-- HR can update tickets (status, assignment)
CREATE POLICY "HR update tickets"
ON tickets FOR UPDATE
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'hr');

-- Employee can update OWN tickets (e.g. close them?) - Optional, let's allow them to maybe edit DESCRIPTION if Open?
-- For now, let's keep it simple: Employees can only Insert. HR Updates.
-- Mmm, maybe Employee wants to Close their own ticket? Let's skip for now to keep it simple.

-- 6. Policies for Comments

-- Users can view comments for tickets they can view
CREATE POLICY "Users view comments for visible tickets"
ON ticket_comments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND (
            t.employee_id = auth.uid() OR
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'hr'
        )
    )
);

-- Users can create comments for tickets they can view
CREATE POLICY "Users create comments"
ON ticket_comments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND (
            t.employee_id = auth.uid() OR
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'hr'
        )
    )
);
