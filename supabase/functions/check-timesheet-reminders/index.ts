import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = [];

    // Get current week's start and end dates
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    console.log(`Checking timesheets for week: ${weekStartStr} to ${weekEndStr}`);

    // Get all active employees
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, email, first_name, last_name, employee_id, is_active")
      .eq("is_active", true);

    if (!profiles) {
      return new Response(
        JSON.stringify({ message: "No active profiles found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check each employee for missing timesheet
    for (const profile of profiles) {
      // Check if timesheet exists for this week
      const { data: timesheet } = await supabase
        .from("timesheets")
        .select("id, status")
        .eq("profile_id", profile.id)
        .eq("week_start_date", weekStartStr)
        .maybeSingle();

      // If no timesheet or not submitted, send reminder
      if (!timesheet || timesheet.status === "draft") {
        // Send reminder to employee
        await supabase.functions.invoke("send-reminder-email", {
          body: {
            to: profile.email,
            subject: "Timesheet Reminder: Please submit your weekly timesheet",
            html: getMissingTimesheetEmailEmployee(
              `${profile.first_name} ${profile.last_name}`,
              weekStartStr,
              weekEndStr
            ),
          },
        });

        // Send notification to HR
        const { data: hrUsers } = await supabase
          .from("user_roles")
          .select(`
            profiles:profile_id (
              email
            )
          `)
          .or("role.eq.hr,role.eq.super_admin");

        if (hrUsers) {
          for (const hr of hrUsers) {
            if (hr.profiles?.email) {
              await supabase.functions.invoke("send-reminder-email", {
                body: {
                  to: hr.profiles.email,
                  subject: "Pending Timesheet Submission",
                  html: getMissingTimesheetEmailHR(
                    `${profile.first_name} ${profile.last_name}`,
                    profile.employee_id || "",
                    weekStartStr,
                    weekEndStr
                  ),
                },
              });
            }
          }
        }

        results.push({
          employee: profile.employee_id,
          status: timesheet?.status || "not_created",
        });

        console.log(`Reminder sent for employee: ${profile.employee_id}`);
      }
    }

    console.log("Timesheet reminders processed:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        week: `${weekStartStr} to ${weekEndStr}`,
        remindersSent: results.length,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-timesheet-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getMissingTimesheetEmailEmployee(
  employeeName: string,
  weekStart: string,
  weekEnd: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Timesheet Submission Reminder</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>Hi ${employeeName},</p>
        <p>This is a friendly reminder that your timesheet for the week <strong>${weekStart} to ${weekEnd}</strong> has not been submitted yet.</p>
        <p>Please submit your timesheet at your earliest convenience to ensure timely processing.</p>
      </div>
      <p style="color: #666;">Thank you for your cooperation!</p>
    </div>
  `;
}

function getMissingTimesheetEmailHR(
  employeeName: string,
  employeeId: string,
  weekStart: string,
  weekEnd: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Pending Timesheet Notification</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Employee:</strong> ${employeeName} (${employeeId})</p>
        <p><strong>Week Period:</strong> ${weekStart} to ${weekEnd}</p>
        <p><strong>Status:</strong> Not Submitted</p>
        <p style="margin-top: 15px;">The employee has not yet submitted their timesheet for this week.</p>
      </div>
    </div>
  `;
}

serve(handler);
