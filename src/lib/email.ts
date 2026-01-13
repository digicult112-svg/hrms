import { supabase } from './supabase';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
    try {
        const { data, error } = await supabase.functions.invoke('send-emails', {
            body: { to, subject, html },
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        // We don't re-throw here to prevent breaking the UI flow if email fails.
        // In a real app, you might want to return { success: false, error }
        return null;
    }
};
