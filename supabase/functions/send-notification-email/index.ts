import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "leave_submission" | "leave_approval" | "timesheet_submission" | "timesheet_approval";
  employeeId: string;
  requestId: string;
  status?: "approved" | "rejected";
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: NotificationRequest = await req.json();

    // Initialize SMTP client inside handler to avoid connection issues at boot time
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

    console.log("Notification request:", payload);

    // Fetch employee details
    const { data: employeeProfile } = await supabase
      .from("profiles")
      .select("id, user_id, email, first_name, last_name, employee_id")
      .eq("id", payload.employeeId)
      .single();

    if (!employeeProfile) {
      throw new Error("Employee profile not found");
    }

    let emailsToSend = [];

    if (payload.type === "leave_submission" || payload.type === "timesheet_submission") {
      // Employee submitted - notify all HR users
      const { data: hrUsers } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:profile_id (
            email,
            first_name,
            last_name
          )
        `)
        .or("role.eq.hr,role.eq.super_admin");

      if (hrUsers && hrUsers.length > 0) {
        const subject = payload.type === "leave_submission" 
          ? `New Leave Request from ${employeeProfile.first_name} ${employeeProfile.last_name}`
          : `New Timesheet Submission from ${employeeProfile.first_name} ${employeeProfile.last_name}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New ${payload.type === "leave_submission" ? "Leave Request" : "Timesheet Submission"}</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Employee Name:</strong> ${employeeProfile.first_name} ${employeeProfile.last_name}</p>
              <p><strong>Employee ID:</strong> ${employeeProfile.employee_id}</p>
              <p><strong>Email:</strong> ${employeeProfile.email}</p>
              <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> Pending Approval</p>
            </div>
            <p style="color: #666;">Please log in to the system to review and approve this ${payload.type === "leave_submission" ? "leave request" : "timesheet"}.</p>
          </div>
        `;

        for (const hr of hrUsers) {
          if (hr.profiles?.email) {
            emailsToSend.push({
              from: Deno.env.get("EMAIL_FROM")!,
              to: hr.profiles.email,
              subject,
              html,
            });
          }
        }
      }
    } else if (payload.type === "leave_approval" || payload.type === "timesheet_approval") {
      // HR approved/rejected - notify employee
      const subject = payload.status === "approved"
        ? `Your ${payload.type === "leave_approval" ? "Leave Request" : "Timesheet"} has been Approved`
        : `Your ${payload.type === "leave_approval" ? "Leave Request" : "Timesheet"} has been Rejected`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${payload.status === "approved" ? "#4CAF50" : "#f44336"};">
            ${payload.type === "leave_approval" ? "Leave Request" : "Timesheet"} ${payload.status === "approved" ? "Approved" : "Rejected"}
          </h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Request Type:</strong> ${payload.type === "leave_approval" ? "Leave" : "Timesheet"}</p>
            <p><strong>Status:</strong> ${payload.status?.toUpperCase()}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            ${payload.rejectionReason ? `<p><strong>Reason:</strong> ${payload.rejectionReason}</p>` : ""}
          </div>
          <p style="color: #666;">
            ${payload.status === "approved" 
              ? "Your request has been approved. You can view the details in your dashboard." 
              : "Your request has been rejected. Please contact HR if you have any questions."}
          </p>
        </div>
      `;

      emailsToSend.push({
        from: Deno.env.get("EMAIL_FROM")!,
        to: employeeProfile.email,
        subject,
        html,
      });
    }

    // Send all emails
    const results = [];
    for (const email of emailsToSend) {
      try {
        console.log("Sending email to:", email.to);
        await smtpClient.send({
          from: email.from,
          to: email.to,
          subject: email.subject,
          content: "auto",
          html: email.html,
        });
        console.log("Email sent successfully to:", email.to);
        results.push({ success: true, to: email.to });
      } catch (error: any) {
        console.error("Error sending email:", error);
        results.push({ success: false, error: error.message, to: email.to });
      }
    }
    
    await smtpClient.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: results.length,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
