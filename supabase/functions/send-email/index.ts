const SMTP2GO_API_KEY = Deno.env.get("SMTP2GO_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "human_capital@digicultglobal.com";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 2. Parse Request
        const { to, subject, html } = await req.json();

        // 3. Validation
        if (!SMTP2GO_API_KEY) {
            throw new Error("Misconfigured Server: Missing SMTP2GO secrets.");
        }
        if (!to || !subject || !html) {
            throw new Error("Missing required fields: to, subject, or html.");
        }

        console.log(`Sending email to ${to}...`);

        // 4. Send to SMTP2GO
        const res = await fetch("https://api.smtp2go.com/v3/email/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: SMTP2GO_API_KEY,
                to: [to],
                sender: SENDER_EMAIL,
                subject: subject,
                html_body: html
            }),
        });

        const data = await res.json();

        // 5. Handle Provider Error
        if (data.data && data.data.error_code) {
            console.error("SMTP2GO API Error:", data.data.error);
            throw new Error(`SMTP2GO Error: ${data.data.error}`);
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400, // Return 400 instead of 500 to allow CORS headers to pass through more easily
        });
    }
});
