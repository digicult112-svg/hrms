import { supabase } from './supabase';

export interface AuditLogDetails {
    timestamp: string;
    ip?: string; // Captured if possible, often client-side limited
    reason?: string;
    [key: string]: any; // Allow flexible details
}

export const logAction = async (
    actor_id: string,
    action: string,
    table_name: string,
    details: AuditLogDetails
) => {
    if (!actor_id) {
        console.warn('Audit Log Skipped: No actor_id provided');
        return;
    }

    try {
        const { error } = await supabase.from('audit_logs').insert({
            actor_id,
            action,
            table_name,
            details
        });

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (err) {
        console.error('Error logging action:', err);
    }
};
