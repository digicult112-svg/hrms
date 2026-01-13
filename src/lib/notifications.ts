import { supabase } from './supabase';
import { sendEmail } from './email';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

/**
 * Sends a persistent notification to a specific user via DB + Email.
 * @param userId The UUID of the recipient
 * @param title Short title
 * @param message Detailed message
 * @param type 'info' | 'warning' | 'error' | 'success'
 */
export const notifyUser = async (
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'info'
) => {
    try {
        // 1. Fetch User Email
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single();

        // 2. Insert into DB (Notification Center)
        const { error } = await supabase
            .from('pending_notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type
            });

        if (error) {
            console.error('Failed to send DB notification:', error);
        }

        // 3. Send Email (Fire and Forget)
        if (userProfile?.email) {
            // Construct a simple email template
            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};">
                        ${title}
                    </h2>
                    <p>Hello ${userProfile.full_name},</p>
                    <p style="font-size: 16px; line-height: 1.5;">${message}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #666;">This is an automated message from HRMS.</p>
                </div>
            `;

            sendEmail({ to: userProfile.email, subject: title, html }).catch(err =>
                console.error('Failed to send email to user:', err)
            );
        }

    } catch (error) {
        console.error('Error in notifyUser:', error);
    }
};

/**
 * Marks a notification as read
 */
export const markNotificationRead = async (notificationId: string) => {
    try {
        const { error } = await supabase
            .from('pending_notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
};

/**
 * Marks ALL notifications as read for current user
 */
export const markAllRead = async (userId: string) => {
    try {
        const { error } = await supabase
            .from('pending_notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    } catch (error) {
        console.error('Error marking all read:', error);
    }
};

/**
 * Notify all HR admins via DB + Email
 */
export const notifyHR = async (
    title: string,
    message: string,
    type: NotificationType = 'info',
    shouldEmail = true
) => {
    try {
        // 1. Get all HR users
        const { data: hrUsers, error: fetchError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('role', 'hr');

        if (fetchError) throw fetchError;
        if (!hrUsers || hrUsers.length === 0) return;

        // 2. Prepare notifications for DB
        const notifications = hrUsers.map(hr => ({
            user_id: hr.id,
            title,
            message,
            type
        }));

        // 3. Bulk insert to DB
        const { error: insertError } = await supabase
            .from('pending_notifications')
            .insert(notifications);

        if (insertError) throw insertError;

        // 4. Send Emails (Fire and Forget) - Only if enabled
        if (shouldEmail) {
            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #2563eb;">HR Alert: ${title}</h2>
                    <p style="font-size: 16px; line-height: 1.5;">${message}</p>
                     <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #666;">Action required in HRMS.</p>
                </div>
            `;

            // Send to all HRs (parallel)
            Promise.all(
                hrUsers
                    .filter(hr => hr.email)
                    .map(hr => sendEmail({ to: hr.email, subject: `[HR Alert] ${title}`, html }))
            ).catch(err => console.error('Error sending HR emails:', err));
        }

    } catch (error) {
        console.error('Error notifying HR:', error);
    }
};
