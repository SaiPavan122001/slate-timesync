import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IRREGULARITY_THRESHOLD_DAYS = 2;
const ATTENDANCE_DELAY_MINUTES = 15;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = { irregularAttendance: [], delayedAttendance: [] };

    // Get active attendance policy for office timings
    const { data: policy } = await supabase
      .from("attendance_policies")
      .select("working_hours_start")
      .eq("is_active", true)
      .single();

    if (!policy) {
      console.log("No active attendance policy found");
      return new Response(JSON.stringify({ message: "No active policy" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const officeStartTime = policy.working_hours_start.slice(0, 5);
    const today = now.toISOString().split("T")[0];

    // Calculate if we're past the delay threshold
    const [startHour, startMin] = officeStartTime.split(":").map(Number);
    const [currentHour, currentMin] = currentTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const currentMinutes = currentHour * 60 + currentMin;
    const isPastDelayThreshold = currentMinutes >= startMinutes + ATTENDANCE_DELAY_MINUTES;

    // Check for delayed attendance (not marked today, past delay threshold)
    if (isPastDelayThreshold) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, employee_id, is_active")
        .eq("is_active", true);

      if (profiles) {
        for (const profile of profiles) {
          // Check if attendance is marked for today
          const { data: todayAttendance } = await supabase
            .from("attendance")
            .select("id, check_in_time")
            .eq("profile_id", profile.id)
            .eq("date", today)
            .maybeSingle();

          // Check if on leave today
          const { data: leaveToday } = await supabase
            .from("leave_requests")
            .select("id")
            .eq("profile_id", profile.id)
            .eq("status", "approved")
            .lte("start_date", today)
            .gte("end_date", today)
            .maybeSingle();

          // If no attendance and not on leave, send reminder
          if (!todayAttendance && !leaveToday) {
            // Send to employee
            await supabase.functions.invoke("send-reminder-email", {
              body: {
                to: profile.email,
                subject: "Attendance Reminder: Please mark your attendance for today",
                html: getDelayedAttendanceEmailEmployee(
                  `${profile.first_name} ${profile.last_name}`,
                  officeStartTime
                ),
              },
            });

            // Send to HR
            const { data: hrUsers } = await supabase
              .from("user_roles")
              .select("profiles:profile_id(email)")
              .or("role.eq.hr,role.eq.super_admin");

            if (hrUsers) {
              for (const hr of hrUsers) {
                if (hr.profiles?.email) {
                  await supabase.functions.invoke("send-reminder-email", {
                    body: {
                      to: hr.profiles.email,
                      subject: "Attendance Alert: Employee has not marked attendance",
                      html: getDelayedAttendanceEmailHR(
                        `${profile.first_name} ${profile.last_name}`,
                        profile.employee_id || "",
                        officeStartTime
                      ),
                    },
                  });
                }
              }
            }

            results.delayedAttendance.push(profile.employee_id);
          }
        }
      }
    }

    // Check for irregular attendance (missing consecutive days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - IRREGULARITY_THRESHOLD_DAYS);
    const startDate = daysAgo.toISOString().split("T")[0];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, employee_id, is_active")
      .eq("is_active", true);

    if (profiles) {
      for (const profile of profiles) {
        const { data: recentAttendance } = await supabase
          .from("attendance")
          .select("date, status")
          .eq("profile_id", profile.id)
          .gte("date", startDate)
          .order("date", { ascending: false });

        const { data: recentLeaves } = await supabase
          .from("leave_requests")
          .select("start_date, end_date")
          .eq("profile_id", profile.id)
          .eq("status", "approved")
          .gte("end_date", startDate);

        // Build a set of dates with attendance or approved leave
        const coveredDates = new Set();
        recentAttendance?.forEach((att) => coveredDates.add(att.date));
        recentLeaves?.forEach((leave) => {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
            coveredDates.add(d.toISOString().split("T")[0]);
          }
        });

        // Check for missing consecutive days
        const missingDates = [];
        for (let i = 0; i < IRREGULARITY_THRESHOLD_DAYS; i++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - i - 1); // Skip today
          const dateStr = checkDate.toISOString().split("T")[0];
          
          // Skip weekends
          const dayOfWeek = checkDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;

          if (!coveredDates.has(dateStr)) {
            missingDates.push(dateStr);
          }
        }

        if (missingDates.length >= IRREGULARITY_THRESHOLD_DAYS) {
          await supabase.functions.invoke("send-reminder-email", {
            body: {
              to: profile.email,
              subject: "Attendance Reminder: Please review your recent attendance records",
              html: getIrregularAttendanceEmail(
                `${profile.first_name} ${profile.last_name}`,
                missingDates
              ),
            },
          });

          results.irregularAttendance.push(profile.employee_id);
        }
      }
    }

    console.log("Attendance reminders processed:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-attendance-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getDelayedAttendanceEmailEmployee(employeeName: string, officeStartTime: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Attendance Not Marked</h2>
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p>Hi ${employeeName},</p>
        <p>We noticed you haven't marked your attendance yet today.</p>
        <p><strong>Office Start Time:</strong> ${officeStartTime}</p>
        <p><strong>Current Time:</strong> ${new Date().toLocaleTimeString()}</p>
        <p>Please mark your attendance as soon as possible.</p>
      </div>
      <p style="color: #666;">If you're on leave or working remotely, please ensure your status is updated accordingly.</p>
    </div>
  `;
}

function getDelayedAttendanceEmailHR(employeeName: string, employeeId: string, officeStartTime: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Attendance Delay Alert</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Employee:</strong> ${employeeName} (${employeeId})</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Office Start Time:</strong> ${officeStartTime}</p>
        <p><strong>Status:</strong> Attendance not marked (15+ minutes delayed)</p>
      </div>
    </div>
  `;
}

function getIrregularAttendanceEmail(employeeName: string, missingDates: string[]): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Attendance Regularization Reminder</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>Hi ${employeeName},</p>
        <p>We noticed some irregularities in your recent attendance records:</p>
        <ul>
          ${missingDates.map(date => `<li>${date}</li>`).join('')}
        </ul>
        <p>If you believe this is an error or need to regularize your attendance, please contact HR or update your records accordingly.</p>
      </div>
      <p style="color: #666;">Thank you for maintaining accurate attendance records!</p>
    </div>
  `;
}

serve(handler);
