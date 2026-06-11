import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";
import { createClerkClient } from "@clerk/nextjs/server";

// Cache for tracking sent alerts to avoid spamming
if (!(global as any).sentAlertsCache) {
  (global as any).sentAlertsCache = new Set<string>();
}
const sentAlerts = (global as any).sentAlertsCache as Set<string>;

export async function checkAndSendAlerts() {
  console.log(`[NexusFlow Cron] Checking due tasks at ${new Date().toISOString()}...`);

  // 1. Fetch active tasks with a due date
  const { data: tasks, error: tasksError } = await supabase
    .from("work_items")
    .select("*")
    .not("due_date", "is", null);

  if (tasksError) {
    console.error("[NexusFlow Cron] Error fetching tasks from Supabase:", tasksError);
    return { success: false, error: tasksError.message };
  }

  if (!tasks || tasks.length === 0) {
    console.log("[NexusFlow Cron] No tasks with due dates found.");
    return { success: true, count: 0 };
  }

  // 2. Fetch projects for name lookup
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name");

  const projectMap = new Map<string, string>();
  if (projects) {
    projects.forEach(p => projectMap.set(p.id, p.name));
  }

  // 3. Fetch Clerk users to map assignees to real email addresses
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const clerk = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null;
  let clerkUsers: any[] = [];
  if (clerk) {
    try {
      const response = await clerk.users.getUserList({ limit: 100 });
      clerkUsers = response.data || [];
    } catch (err) {
      console.error("[NexusFlow Cron] Failed to fetch Clerk users:", err);
    }
  }

  // 4. Configure nodemailer SMTP transporter
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.error("[NexusFlow Cron] SMTP credentials not configured.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const now = Date.now();
  let alertsSent = 0;

  for (const task of tasks) {
    // Skip if already done or cancelled
    if (task.status === "Done" || task.status === "Cancelled") {
      continue;
    }

    if (!task.assignee) {
      continue;
    }

    // Parse due date and default to 6 PM (end of day) if no time is provided
    const dueDate = new Date(task.due_date);
    if (task.due_date && typeof task.due_date === "string" && !task.due_date.includes("T")) {
      dueDate.setHours(18, 0, 0, 0);
    }

    const diffMs = dueDate.getTime() - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    let alertType: "1day" | "3hours" | null = null;
    let timeRemainingLabel = "";

    // Check if task is due in 1 day (between 23 and 25 hours remaining)
    if (diffHours > 23 && diffHours <= 25) {
      alertType = "1day";
      timeRemainingLabel = "24 hours";
    }
    // Check if task is due in 3 hours (between 2.5 and 3.5 hours remaining)
    else if (diffHours > 2.5 && diffHours <= 3.5) {
      alertType = "3hours";
      timeRemainingLabel = "3 hours";
    }

    if (!alertType) {
      continue;
    }

    const cacheKey = `${task.id}-${alertType}`;
    if (sentAlerts.has(cacheKey)) {
      continue; // Alert already sent
    }

    // Look up email address from Clerk organization members
    const matchedUser = clerkUsers.find(u => {
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
      return fullName.toLowerCase() === task.assignee.toLowerCase();
    });

    const toEmail = matchedUser?.emailAddresses?.[0]?.emailAddress || `${task.assignee.toLowerCase().replace(/\s+/g, ".")}@nexusflow.com`;
    const projectName = projectMap.get(task.project_id) || "Project Workspace";
    const headerColor = alertType === "3hours" ? "#EF4444" : "#C67C4E"; // Red accent for 3h, copper gold for 24h
    const subjectPrefix = alertType === "3hours" ? "URGENT REMINDER" : "UPCOMING DEADLINE";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Task Due Date Reminder</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #FAFAF9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #FFFFFF;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #E7E5E4;
          }
          .header {
            background-color: #111111;
            padding: 32px;
            text-align: center;
            border-bottom: 3px solid ${headerColor};
          }
          .header h1 {
            color: #FFFFFF;
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header span {
            color: #D4A373;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .content {
            padding: 40px 32px;
            color: #1C1917;
          }
          .content p {
            font-size: 15px;
            line-height: 1.6;
            margin-top: 0;
            margin-bottom: 24px;
            color: #44403C;
          }
          .details-card {
            background-color: #FAFAF9;
            border: 1px solid #E7E5E4;
            border-radius: 8px;
            padding: 18px 24px;
            margin-bottom: 24px;
          }
          .btn-container {
            text-align: center;
            margin-top: 32px;
          }
          .btn {
            background-color: #C67C4E;
            color: #FFFFFF !important;
            padding: 12px 28px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            border-radius: 6px;
            display: inline-block;
          }
          .footer {
            background-color: #FAFAF9;
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #E7E5E4;
            font-size: 12px;
            color: #78716C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span>NexusFlow Platform</span>
            <h1>Task Due Date Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${task.assignee},</p>
            <p>This is a reminder that the task <strong>"${task.title}"</strong> is due in <strong>${timeRemainingLabel}</strong>.</p>
            
            <div class="details-card">
              <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #78716C; text-align: left; width: 45%;">Project</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 13px; font-weight: 700; color: #1C1917; text-align: right; width: 55%;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #78716C; text-align: left;">Task ID</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 13px; font-weight: 700; color: #1C1917; text-align: right;">${task.id}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #78716C; text-align: left;">Task Title</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 13px; font-weight: 700; color: #1C1917; text-align: right;">${task.title}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #78716C; text-align: left;">Priority</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E7E5E4; font-size: 13px; font-weight: 700; color: #1C1917; text-align: right; text-transform: uppercase;">${task.priority}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #78716C; text-align: left;">Due Date</td>
                  <td style="padding: 12px 0; font-size: 13px; font-weight: 700; color: #EF4444; text-align: right;">${dueDate.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <p>Please log in to update this task's status or request an extension if required.</p>
            
            <div class="btn-container">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects" class="btn" style="color: #FFFFFF !important;">Go to Workspace</a>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} NexusFlow. Where Projects, People, and Progress Connect.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"NexusFlow Notifications" <${emailUser}>`,
        to: toEmail,
        bcc: "gnmhs123@gmail.com",
        subject: `[NexusFlow] ${subjectPrefix}: "${task.title}" is due in ${timeRemainingLabel}`,
        html: htmlContent,
      });

      sentAlerts.add(cacheKey);
      alertsSent++;
      console.log(`[NexusFlow Cron] Sent due date alert to ${toEmail} for task ${task.id}`);
    } catch (err) {
      console.error(`[NexusFlow Cron] Failed to send email to ${toEmail} for task ${task.id}:`, err);
    }
  }

  console.log(`[NexusFlow Cron] Check complete. Sent ${alertsSent} alerts.`);
  return { success: true, count: alertsSent };
}
