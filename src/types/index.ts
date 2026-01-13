export type Role = 'hr' | 'employee';

export interface Profile {
    id: string;
    full_name: string;
    email: string;
    work_email?: string;
    personal_email?: string;
    role: Role;
    date_of_birth?: string;
    designation?: string;
    phone?: string;
    date_joined?: string;
    base_location_id?: string;
    salary?: number;
    daily_work_hours?: number;
    avatar_url?: string;
    education?: string;
    previous_experience?: string;
    previous_role?: string;
    previous_company?: string;
    address?: string;
    is_frozen?: boolean;
    created_at: string;
    deleted_at?: string;
}

export interface EmployeeExperience {
    id: string;
    user_id: string;
    company_name: string;
    role: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    created_at: string;
}

export interface User {
    id: string;
    email?: string;
    profile?: Profile;
}

export interface OfficeLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius_m: number;
}

export interface AttendanceLog {
    id: string;
    user_id: string;
    work_date: string;
    mode: 'onsite' | 'wfh';
    clock_in: string;
    clock_out?: string;
    geo_lat?: number;
    geo_lon?: number;
    wfh_report?: string;
    total_hours?: number;
    total_pause_seconds?: number;
}

export interface LeaveRequest {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    hr_comment?: string;
    created_at: string;
    updated_at: string;
}

export interface LeaveCalendarEvent {
    id: string;
    title: string;
    description?: string;
    event_date: string;
    created_by?: string;
    created_at: string;
}

export interface Payroll {
    id: string;
    user_id: string;
    base_salary: number;
    hra: number;
    allowances: number;
    deductions: number;
    month: number;
    year: number;
    metadata?: {
        lop_days?: number;
        lop_amount?: number;
        tax_amount?: number;
        [key: string]: any;
    };
    generated_at: string;
    profiles?: {
        full_name: string;
        email: string;
    };
}

export interface JobPosition {
    id: string;
    title: string;
    description: string;
    department: string;
    status: 'open' | 'closed';
    created_at: string;
}

export interface Candidate {
    id: string;
    job_id: string;
    full_name: string;
    email: string;
    phone?: string;
    resume_url?: string;
    status: 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected';
    created_at: string;
}

export interface PerformanceSummary {
    id: string;
    user_id: string;
    year: number;
    month: number;
    total_hours: number;
    total_leaves: number;
    generated_at: string;
}

export interface AuditLog {
    id: string;
    actor_id: string;
    action: string;
    table_name: string;
    row_id?: string;
    timestamp: string;
    details?: any;
    profiles?: {
        full_name: string;
    } | null;
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory = 'Payroll' | 'IT' | 'HR' | 'General' | 'Other';

export interface Ticket {
    id: string;
    employee_id: string;
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    description: string;
    status: TicketStatus;
    assigned_to?: string;
    created_at: string;
    updated_at: string;
    profiles?: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
    assignee?: {
        full_name: string;
    };
}

export interface TicketComment {
    id: string;
    ticket_id: string;
    user_id: string;
    message: string;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url?: string;
        role?: Role;
    };
}
