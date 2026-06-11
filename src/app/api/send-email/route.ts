import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";

// ==========================================
// EMAIL LAYOUT SHELL (REUSABLE COMPONENTS)
// ==========================================

interface ShellProps {
  bannerTitle: string;
  subjectTitle: string;
  greeting: string;
  introText: string;
  detailsHtml: string;
  focusItemsHtml: string;
  actionButtonsHtml: string;
  categoryLabel?: string;
}

function renderEmailShell({
  bannerTitle,
  subjectTitle,
  greeting,
  introText,
  detailsHtml,
  focusItemsHtml,
  actionButtonsHtml,
  categoryLabel = "Project Specifications"
}: ShellProps) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subjectTitle}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #FAFAF9;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #FAFAF9;
          padding: 40px 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
          border: 1px solid #E7E5E4;
        }
        .header {
          background-color: #111827; /* Obsidian Black */
          padding: 38px 32px;
          text-align: center;
          border-bottom: 4px solid #C47A45; /* Copper Gold Accent */
        }
        .header .brand {
          color: #C47A45;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
          display: block;
        }
        .header h1 {
          color: #FFFFFF;
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 36px;
          color: #1C1917;
        }
        .content .greeting {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .content .intro {
          font-size: 14.5px;
          line-height: 1.6;
          color: #44403C;
          margin-top: 0;
          margin-bottom: 28px;
        }
        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #78716C;
          margin-bottom: 12px;
        }
        .details-card {
          background-color: #FAFAF9;
          border: 1px solid #E7E5E4;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 32px;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
        }
        .details-table td {
          padding: 10px 0;
          font-size: 13.5px;
        }
        .details-table tr:not(:last-child) td {
          border-bottom: 1px solid #E7E5E4;
        }
        .details-label {
          font-weight: 600;
          color: #78716C;
          width: 42%;
          text-align: left;
        }
        .details-value {
          font-weight: 700;
          color: #1C1917;
          text-align: right;
        }
        .focus-section {
          margin-bottom: 36px;
        }
        .focus-card {
          background-color: #FFFFFF;
          border: 1px solid #E7E5E4;
          border-left: 4px solid #C47A45;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .focus-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .focus-desc {
          font-size: 12.5px;
          color: #78716C;
          line-height: 1.5;
          margin: 0;
        }
        .button-container {
          text-align: center;
          margin: 32px 0 10px 0;
        }
        .btn {
          background-color: #C47A45; /* Copper Gold */
          color: #FFFFFF !important;
          padding: 12px 28px;
          text-decoration: none;
          font-weight: 700;
          font-size: 13.5px;
          border-radius: 8px;
          display: inline-block;
          box-shadow: 0 4px 10px rgba(196, 122, 69, 0.15);
          transition: all 0.2s ease;
          margin: 6px;
        }
        .btn-secondary {
          background-color: #111827; /* Obsidian */
          color: #FFFFFF !important;
          box-shadow: 0 4px 10px rgba(17, 24, 39, 0.15);
        }
        .footer {
          background-color: #FAFAF9;
          padding: 32px;
          text-align: center;
          border-top: 1px solid #E7E5E4;
          font-size: 11.5px;
          color: #78716C;
          line-height: 1.6;
        }
        .footer a {
          color: #C47A45;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <span class="brand">NexusFlow Platform</span>
            <h1>${bannerTitle}</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <div class="intro">${introText}</div>
            
            <div class="section-title">${categoryLabel}</div>
            <div class="details-card">
              <table class="details-table">
                ${detailsHtml}
              </table>
            </div>

            ${focusItemsHtml}

            <div class="button-container">
              ${actionButtonsHtml}
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} NexusFlow. All rights reserved.<br>
            Where Projects, People, and Progress Connect.<br>
            <a href="https://nexusflow.io">www.nexusflow.io</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ==========================================
// API ROUTE HANDLER
// ==========================================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      to, 
      employeeName, 
      projectName, 
      projectManager, 
      projectRole, 
      projectCode,
      notificationType = "project", // "project" | "task" | "risk"
      taskTitle,
      duration,
      priority,
      taskType,
      taskCode,
      riskTitle,
      riskSeverity,
      riskOwner,
      riskDescription
    } = body;

    if (!to) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      return NextResponse.json({ error: "SMTP credentials not configured" }, { status: 500 });
    }

    // Configure SMTP transport
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let subject = "";
    let htmlContent = "";

    if (notificationType === "risk") {
      subject = `[NexusFlow] Risk Escalation Alert: [${riskSeverity || "High"}] ${riskTitle}`;
      
      const detailsHtml = `
        <tr>
          <td class="details-label">Risk Title</td>
          <td class="details-value">${riskTitle}</td>
        </tr>
        <tr>
          <td class="details-label">Project</td>
          <td class="details-value">${projectName || "General"}</td>
        </tr>
        <tr>
          <td class="details-label">Severity</td>
          <td class="details-value" style="color: ${riskSeverity === "Critical" ? "#EF4444" : riskSeverity === "High" ? "#F59E0B" : "#3B82F6"}; font-weight: bold;">
            ${riskSeverity || "High"}
          </td>
        </tr>
        <tr>
          <td class="details-label">Owner</td>
          <td class="details-value">${riskOwner || "Not Specified"}</td>
        </tr>
      `;

      const focusItemsHtml = `
        <div class="section-title">Mitigation Guidelines</div>
        <div class="focus-section">
          <div class="focus-card">
            <div class="focus-title">Monitor Progress</div>
            <p class="focus-desc">Ensure the owner progresses the mitigation stages via the Risk Register.</p>
          </div>
          <div class="focus-card">
            <div class="focus-title">Resource Allocation</div>
            <p class="focus-desc">Resolve resource over-allocation or budget burn slippage promptly to minimize impact.</p>
          </div>
        </div>
      `;

      const actionButtonsHtml = `
        <a href="${appUrl}/risks" class="btn">View Risk Register</a>
      `;

      htmlContent = renderEmailShell({
        bannerTitle: "Risk Management Alert",
        subjectTitle: subject,
        greeting: `Hello,`,
        introText: `A new risk has been identified or automatically escalated for the project "${projectName || "General"}". Description: "${riskDescription || "No details provided."}"`,
        detailsHtml,
        focusItemsHtml,
        actionButtonsHtml,
        categoryLabel: "Risk Escalation Info"
      });
    } else if (notificationType === "task") {
      // Clean unified task template using our enterprise Obsidian + Copper layout
      const codeText = taskCode ? `[${taskCode}] ` : "";
      subject = `[NexusFlow] Task Assigned: ${codeText}${taskTitle}`;

      const detailsHtml = `
        <tr>
          <td class="details-label">Project</td>
          <td class="details-value">${projectName || "General"}</td>
        </tr>
        <tr>
          <td class="details-label">Task Title</td>
          <td class="details-value">${taskTitle}</td>
        </tr>
        <tr>
          <td class="details-label">Task Type</td>
          <td class="details-value">${taskType || "Task"}</td>
        </tr>
        <tr>
          <td class="details-label">Priority</td>
          <td class="details-value">${priority || "Medium"}</td>
        </tr>
        <tr>
          <td class="details-label">Duration</td>
          <td class="details-value">${duration ? `${duration} hrs` : "Not Specified"}</td>
        </tr>
      `;

      const focusItemsHtml = `
        <div class="section-title">Task Guidelines</div>
        <div class="focus-section">
          <div class="focus-card">
            <div class="focus-title">Log Work Progress</div>
            <p class="focus-desc">Keep track of your milestones and update work items in the Project Board daily.</p>
          </div>
          <div class="focus-card">
            <div class="focus-title">Collaboration</div>
            <p class="focus-desc">Upload design notes, contracts, or reference documentation directly into the Documents repository.</p>
          </div>
        </div>
      `;

      const actionButtonsHtml = `
        <a href="${appUrl}/projects/${projectName || ''}" class="btn">View Task Workspace</a>
      `;

      htmlContent = renderEmailShell({
        bannerTitle: "Task Assignment Notification",
        subjectTitle: subject,
        greeting: `Hello ${employeeName || "Team Member"},`,
        introText: `You have been assigned to a new task inside the NexusFlow workspace. Please find the assignment specifications below:`,
        detailsHtml,
        focusItemsHtml,
        actionButtonsHtml,
        categoryLabel: "Task Specifications"
      });

    } else {
      // ----------------------------------------------------
      // PROJECT NOTIFICATION - ROLE-BASED RENDERING PIPELINE
      // ----------------------------------------------------

      // 1. Fetch recipient's metadata from database to verify their organizational role
      let recipientName = employeeName || "Team Member";
      let recipientRole = projectRole || "Team Member";

      try {
        const { data: userRow } = await supabase
          .from("users")
          .select("name, role")
          .eq("email", to)
          .maybeSingle();

        if (userRow) {
          if (userRow.name) recipientName = userRow.name;
          if (userRow.role) recipientRole = userRow.role;
        }
      } catch (dbErr) {
        console.error("Failed to query recipient role from database:", dbErr);
      }

      // Normalize role comparison
      const normalizedRole = recipientRole.toLowerCase();

      // 2. Fetch project metadata to retrieve real status, department, and initiation date
      let projectDetails = {
        name: projectName || "General Workspace",
        manager: projectManager || "Not Specified",
        department: "Engineering",
        status: "Initiation",
        created_date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
        org_name: "NexusFlow Enterprise"
      };

      if (projectName) {
        try {
          const { data: dbProj } = await supabase
            .from("projects")
            .select("*")
            .eq("name", projectName)
            .maybeSingle();

          if (dbProj) {
            projectDetails = {
              name: dbProj.name || projectName,
              manager: dbProj.project_manager || dbProj.projectManager || projectManager || "Not Specified",
              department: dbProj.department || "Engineering",
              status: dbProj.status || "Initiation",
              created_date: dbProj.created_at 
                ? new Date(dbProj.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
              org_name: "NexusFlow Enterprise"
            };
          }
        } catch (dbErr) {
          console.error("Failed to query project metadata:", dbErr);
        }
      }

      const detailsHtml = `
        <tr>
          <td class="details-label">Project Name</td>
          <td class="details-value">${projectDetails.name}</td>
        </tr>
        <tr>
          <td class="details-label">Project Manager</td>
          <td class="details-value">${projectDetails.manager}</td>
        </tr>
        <tr>
          <td class="details-label">Department</td>
          <td class="details-value">${projectDetails.department}</td>
        </tr>
        <tr>
          <td class="details-label">Project Status</td>
          <td class="details-value">${projectDetails.status}</td>
        </tr>
        <tr>
          <td class="details-label">Created Date</td>
          <td class="details-value">${projectDetails.created_date}</td>
        </tr>
        <tr>
          <td class="details-label">Organization</td>
          <td class="details-value">${projectDetails.org_name}</td>
        </tr>
      `;

      // 3. Render role-based content, banners, focus cards, and buttons
      if (
        normalizedRole.includes("it administrator") || 
        normalizedRole.includes("admin") || 
        normalizedRole.includes("it administrators")
      ) {
        // --- IT ADMINISTRATOR TEMPLATE ---
        subject = `[NexusFlow] Security & Governance Alert: New Project Initiated`;
        
        const focusItemsHtml = `
          <div class="section-title">Administrative Audit Requirements</div>
          <div class="focus-section">
            <div class="focus-card">
              <div class="focus-title">Access & Permissions Governance</div>
              <p class="focus-desc">Review user roles, access control lists (ACLs), and Clerk authentication bindings assigned to this project workspace.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Workspace Configuration Review</div>
              <p class="focus-desc">Ensure repository storage, folder permissions, and metadata standards conform to security guidelines.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Audit Log Monitoring</div>
              <p class="focus-desc">Workspace parameters and workflow approvals are active under compliance logging schemas.</p>
            </div>
          </div>
        `;

        const actionButtonsHtml = `
          <a href="${appUrl}/admin" class="btn">Open Administration Console</a>
          <a href="${appUrl}/admin/access" class="btn btn-secondary">Review Access Controls</a>
        `;

        htmlContent = renderEmailShell({
          bannerTitle: "Security & Governance Oversight",
          subjectTitle: subject,
          greeting: `Hello ${recipientName},`,
          introText: `A new project workspace has been initiated. As an IT Administrator, your administrative review is required to align user access controls and workspace configurations with security policy:`,
          detailsHtml,
          focusItemsHtml,
          actionButtonsHtml
        });

      } else if (normalizedRole.includes("project manager")) {
        // --- PROJECT MANAGER TEMPLATE ---
        subject = `[NexusFlow] Project Activation: Action Required`;

        const focusItemsHtml = `
          <div class="section-title">Delivery Oversight Focus</div>
          <div class="focus-section">
            <div class="focus-card">
              <div class="focus-title">Milestone Planning</div>
              <p class="focus-desc">Define key project phases, set target milestones, and calibrate completion velocity constraints.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Task Delegation</div>
              <p class="focus-desc">Assign technical components, work items, and BRD document ownerships to allocated team members.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Budget Baseline Oversight</div>
              <p class="focus-desc">Monitor cost and billing rates to trace project burn rate metrics against forecasts.</p>
            </div>
          </div>
        `;

        const actionButtonsHtml = `
          <a href="${appUrl}/projects" class="btn">Open Project Dashboard</a>
        `;

        htmlContent = renderEmailShell({
          bannerTitle: "Project Initiation Alert",
          subjectTitle: subject,
          greeting: `Hello ${recipientName},`,
          introText: `You have been designated as the Project Manager for this new initiative. Please configure the kickoff parameters, setup milestones, and verify resources:`,
          detailsHtml,
          focusItemsHtml,
          actionButtonsHtml
        });

      } else if (normalizedRole.includes("resource manager")) {
        // --- RESOURCE MANAGER TEMPLATE ---
        subject = `[NexusFlow] Resource Allocation Request`;

        const focusItemsHtml = `
          <div class="section-title">Allocation Planning Focus</div>
          <div class="focus-section">
            <div class="focus-card">
              <div class="focus-title">Capacity Management</div>
              <p class="focus-desc">Evaluate resource workloads, optimize bench availability, and resolve overallocation constraints.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Skills Alignment</div>
              <p class="focus-desc">Ensure allocated resource skillsets match the technology demands of the project profile.</p>
            </div>
          </div>
        `;

        const actionButtonsHtml = `
          <a href="${appUrl}/resources" class="btn">Review Resource Allocation</a>
        `;

        htmlContent = renderEmailShell({
          bannerTitle: "Resource Allocation Alert",
          subjectTitle: subject,
          greeting: `Hello ${recipientName},`,
          introText: `A new project workspace has been created. Please review resource capacity, balance team allocation percentages, and verify bench utilization:`,
          detailsHtml,
          focusItemsHtml,
          actionButtonsHtml
        });

      } else if (normalizedRole.includes("finance") || normalizedRole.includes("billing")) {
        // --- FINANCE TEAM TEMPLATE ---
        subject = `[NexusFlow] Budget Control: New Project Initiated`;

        const focusItemsHtml = `
          <div class="section-title">Financial Review Focus</div>
          <div class="focus-section">
            <div class="focus-card">
              <div class="focus-title">Billing Matrices</div>
              <p class="focus-desc">Check that resource cost rates and billing rates are assigned to allocations for profitability monitoring.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Invoicing Cycles</div>
              <p class="focus-desc">Set up milestones and budget limits to monitor project burn rates and invoice schedules.</p>
            </div>
          </div>
        `;

        const actionButtonsHtml = `
          <a href="${appUrl}/resources" class="btn">Review Budget & Billing</a>
        `;

        htmlContent = renderEmailShell({
          bannerTitle: "Financial Controls & Budgeting",
          subjectTitle: subject,
          greeting: `Hello ${recipientName},`,
          introText: `A new project workspace has been created. Please configure budget boundaries, billing rates, and confirm resource cost allocations:`,
          detailsHtml,
          focusItemsHtml,
          actionButtonsHtml
        });

      } else if (normalizedRole.includes("pmo")) {
        // --- PMO TEMPLATE ---
        subject = `[NexusFlow] Portfolio Review: Project Registered`;

        const focusItemsHtml = `
          <div class="section-title">Governance Review Focus</div>
          <div class="focus-section">
            <div class="focus-card">
              <div class="focus-title">Health Index</div>
              <p class="focus-desc">Verify health status transitions from initiation to planning and active phases.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Risk Heatmaps</div>
              <p class="focus-desc">Examine preliminary risk registrations and scoring matrix profiles.</p>
            </div>
          </div>
        `;

        const actionButtonsHtml = `
          <a href="${appUrl}/dashboard" class="btn">Open Governance Dashboard</a>
        `;

        htmlContent = renderEmailShell({
          bannerTitle: "Portfolio & Governance Alert",
          subjectTitle: subject,
          greeting: `Hello ${recipientName},`,
          introText: `A new project has been registered in the system portfolio. Please verify project health indicators, budget baseline tracking, and governance compliance reviews:`,
          detailsHtml,
          focusItemsHtml,
          actionButtonsHtml
        });

      } else if (normalizedRole.includes("executive")) {
        // --- EXECUTIVE MANAGEMENT TEMPLATE ---
        subject = `[NexusFlow] Executive Alert: Project Portfolio Update`;

        const focusItemsHtml = `
          <div class="section-title">Strategic Oversight Focus</div>
          <div class="focus-section">
            <div class="focus-card">
              <div class="focus-title">Roadmap Alignment</div>
              <p class="focus-desc">Monitor strategic alignment metrics, resource utilization ratios, and forecast margins.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Financial Summary</div>
              <p class="focus-desc">Analyze overall budget allocations and projected revenue trends.</p>
            </div>
          </div>
        `;

        const actionButtonsHtml = `
          <a href="${appUrl}/dashboard" class="btn">Open Executive Report</a>
        `;

        htmlContent = renderEmailShell({
          bannerTitle: "Executive Portfolio Update",
          subjectTitle: subject,
          greeting: `Hello ${recipientName},`,
          introText: `A new project is now active in the corporate portfolio. Please review the high-level roadmap, strategic alignment, and overall budget forecast:`,
          detailsHtml,
          focusItemsHtml,
          actionButtonsHtml
        });

      } else {
        // --- TEAM MEMBER TEMPLATE (DEFAULT) ---
        subject = `[NexusFlow] Assignment: ${projectDetails.name}`;

        const focusItemsHtml = `
          <div class="section-title">Collaboration & Tasks</div>
          <div class="focus-section">
            <div class="focus-card">
              <div class="focus-title">Activity Logs</div>
              <p class="focus-desc">Record milestones and upload project deliverables to the document repository.</p>
            </div>
            <div class="focus-card">
              <div class="focus-title">Timesheet Logs</div>
              <p class="focus-desc">Log your billable and non-billable hours accurately in your timesheet planner every week.</p>
            </div>
          </div>
        `;

        const actionButtonsHtml = `
          <a href="${appUrl}/projects" class="btn">View Project Workspace</a>
        `;

        htmlContent = renderEmailShell({
          bannerTitle: "Project Assignment Notification",
          subjectTitle: subject,
          greeting: `Hello ${recipientName},`,
          introText: `You have been assigned to participate in this project. Please review the workspace, cooperate with your manager on milestones, and submit weekly timesheets regularly:`,
          detailsHtml,
          focusItemsHtml,
          actionButtonsHtml
        });
      }
    }

    const mailOptions = {
      from: `"NexusFlow Notifications" <${emailUser}>`,
      to,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to send email:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
