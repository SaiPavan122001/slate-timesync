// Reminder System Configuration
export const REMINDER_CONFIG = {
  ENABLE_TIMESHEET_REMINDER: true,
  ENABLE_ATTENDANCE_REMINDER: true,
  ENABLE_DELAY_ALERTS: true,
  IRREGULARITY_THRESHOLD_DAYS: 2, // consecutive days
  ATTENDANCE_DELAY_MINUTES: 15, // minutes after office start time
};

export const REMINDER_TEMPLATES = {
  MISSING_TIMESHEET_EMPLOYEE: {
    subject: "Timesheet Reminder: Please submit your weekly timesheet",
    getHtml: (employeeName: string, weekStart: string, weekEnd: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Timesheet Submission Reminder</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Hi ${employeeName},</p>
          <p>This is a friendly reminder that your timesheet for the week <strong>${weekStart} to ${weekEnd}</strong> has not been submitted yet.</p>
          <p>Please submit your timesheet at your earliest convenience to ensure timely processing.</p>
        </div>
        <p style="color: #666;">Thank you for your cooperation!</p>
      </div>
    `,
  },
  MISSING_TIMESHEET_HR: {
    subject: "Pending Timesheet Submission",
    getHtml: (employeeName: string, employeeId: string, weekStart: string, weekEnd: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Pending Timesheet Notification</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Employee:</strong> ${employeeName} (${employeeId})</p>
          <p><strong>Week Period:</strong> ${weekStart} to ${weekEnd}</p>
          <p><strong>Status:</strong> Not Submitted</p>
          <p style="margin-top: 15px;">The employee has not yet submitted their timesheet for this week.</p>
        </div>
      </div>
    `,
  },
  IRREGULAR_ATTENDANCE: {
    subject: "Attendance Reminder: Please review your recent attendance records",
    getHtml: (employeeName: string, missingDates: string[]) => `
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
    `,
  },
  ATTENDANCE_DELAY_EMPLOYEE: {
    subject: "Attendance Reminder: Please mark your attendance for today",
    getHtml: (employeeName: string, officeStartTime: string) => `
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
    `,
  },
  ATTENDANCE_DELAY_HR: {
    subject: "Attendance Alert: Employee has not marked attendance",
    getHtml: (employeeName: string, employeeId: string, officeStartTime: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Attendance Delay Alert</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Employee:</strong> ${employeeName} (${employeeId})</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Office Start Time:</strong> ${officeStartTime}</p>
          <p><strong>Status:</strong> Attendance not marked (15+ minutes delayed)</p>
        </div>
      </div>
    `,
  },
};
