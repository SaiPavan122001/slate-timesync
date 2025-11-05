import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Initializing SMTP client...");
    
    const smtpClient = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
        tls: Deno.env.get("SMTP_SECURE") === "true",
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });

    console.log("SMTP client initialized successfully");

    const testEmail = {
      from: Deno.env.get("EMAIL_FROM")!,
      to: "adusumallisaipavan2001@gmail.com",
      subject: "SMTP Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">SMTP Test Email</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>This is a test email to confirm SMTP connectivity from Hostinger (slate-ai.in).</p>
            <p><strong>From:</strong> ${Deno.env.get("EMAIL_FROM")}</p>
            <p><strong>SMTP Host:</strong> ${Deno.env.get("SMTP_HOST")}</p>
            <p><strong>SMTP Port:</strong> ${Deno.env.get("SMTP_PORT")}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #666;">If you received this email, the SMTP configuration is working correctly.</p>
        </div>
      `,
    };

    console.log("Sending test email to:", testEmail.to);
    
    await smtpClient.send({
      from: testEmail.from,
      to: testEmail.to,
      subject: testEmail.subject,
      content: "auto",
      html: testEmail.html,
    });

    console.log("Test email sent successfully!");
    
    await smtpClient.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test email sent successfully",
        to: testEmail.to,
        from: testEmail.from
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-test-email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
