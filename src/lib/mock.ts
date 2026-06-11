export const kpis = {
  totalProjects: 142,
  activeProjects: 87,
  delayedProjects: 12,
  openRisks: 23,
  utilization: 78,
  revenue: 4820000,
  pendingApprovals: 14,
  allocated: 312,
};

export const revenueTrend = [
  { m: "Jan", revenue: 320, target: 300 },
  { m: "Feb", revenue: 340, target: 320 },
  { m: "Mar", revenue: 380, target: 350 },
  { m: "Apr", revenue: 360, target: 360 },
  { m: "May", revenue: 410, target: 380 },
  { m: "Jun", revenue: 450, target: 400 },
  { m: "Jul", revenue: 470, target: 420 },
  { m: "Aug", revenue: 510, target: 440 },
  { m: "Sep", revenue: 540, target: 460 },
  { m: "Oct", revenue: 580, target: 480 },
  { m: "Nov", revenue: 610, target: 500 },
  { m: "Dec", revenue: 660, target: 520 },
];

export const statusDist = [
  { name: "On Track", value: 64, color: "#22C55E" },
  { name: "At Risk", value: 18, color: "#F59E0B" },
  { name: "Delayed", value: 12, color: "#EF4444" },
  { name: "Completed", value: 48, color: "#C67C4E" },
];

export const utilizationData = [
  { dept: "Engineering", billable: 82, nonBillable: 12 },
  { dept: "Design", billable: 74, nonBillable: 18 },
  { dept: "Product", billable: 68, nonBillable: 22 },
  { dept: "Data", billable: 79, nonBillable: 15 },
  { dept: "QA", billable: 71, nonBillable: 19 },
  { dept: "DevOps", billable: 85, nonBillable: 10 },
];

export const projects = [
  { id: "PRJ-1042", name: "Atlas Banking Platform", client: "Northwind Capital", status: "On Track", progress: 72, budget: 1200000, spent: 820000, owner: "Sasha Reyes", due: "Mar 14, 2026" },
  { id: "PRJ-1038", name: "Helix CRM Migration", client: "Vertex Health", status: "At Risk", progress: 48, budget: 680000, spent: 410000, owner: "Marcus Lee", due: "Feb 02, 2026" },
  { id: "PRJ-1031", name: "Nimbus Data Lake", client: "Orion Logistics", status: "Delayed", progress: 31, budget: 940000, spent: 520000, owner: "Priya Shah", due: "Jan 18, 2026" },
  { id: "PRJ-1027", name: "Mosaic Mobile Suite", client: "Stratus Media", status: "On Track", progress: 88, budget: 540000, spent: 470000, owner: "Elena Voss", due: "Dec 22, 2025" },
  { id: "PRJ-1019", name: "Quartz Identity Service", client: "Helion Bank", status: "On Track", progress: 64, budget: 760000, spent: 480000, owner: "Daniel Otieno", due: "Apr 09, 2026" },
  { id: "PRJ-1015", name: "Vector Analytics Cloud", client: "Pavo Insurance", status: "Completed", progress: 100, budget: 1100000, spent: 1080000, owner: "Hana Müller", due: "Nov 02, 2025" },
  { id: "PRJ-1009", name: "Sable Procurement Portal", client: "Arden Industries", status: "At Risk", progress: 55, budget: 420000, spent: 290000, owner: "Tomás Vela", due: "Feb 28, 2026" },
  { id: "PRJ-1003", name: "Lumen Customer 360", client: "Beacon Telecom", status: "On Track", progress: 41, budget: 880000, spent: 340000, owner: "Yuki Tanaka", due: "May 17, 2026" },
];

export const resources = [
  { id: "EMP-201", name: "Sasha Reyes", role: "Sr. Engineering Manager", dept: "Engineering", skills: ["React", "Node", "AWS"], util: 92, allocation: 100, status: "Allocated" },
  { id: "EMP-202", name: "Marcus Lee", role: "Solutions Architect", dept: "Engineering", skills: ["AWS", "Kafka", "Go"], util: 78, allocation: 80, status: "Allocated" },
  { id: "EMP-203", name: "Priya Shah", role: "Data Lead", dept: "Data", skills: ["Snowflake", "dbt", "Python"], util: 84, allocation: 100, status: "Allocated" },
  { id: "EMP-204", name: "Elena Voss", role: "Product Designer", dept: "Design", skills: ["Figma", "Research"], util: 65, allocation: 60, status: "Partially Allocated" },
  { id: "EMP-205", name: "Daniel Otieno", role: "Security Engineer", dept: "Engineering", skills: ["IAM", "Zero Trust"], util: 70, allocation: 75, status: "Allocated" },
  { id: "EMP-206", name: "Hana Müller", role: "Engineering Director", dept: "Engineering", skills: ["Strategy", "Cloud"], util: 88, allocation: 90, status: "Allocated" },
  { id: "EMP-207", name: "Tomás Vela", role: "QA Lead", dept: "QA", skills: ["Cypress", "Playwright"], util: 45, allocation: 40, status: "Bench" },
  { id: "EMP-208", name: "Yuki Tanaka", role: "Product Manager", dept: "Product", skills: ["Roadmap", "OKRs"], util: 81, allocation: 100, status: "Allocated" },
  { id: "EMP-209", name: "Amelia Brooks", role: "Frontend Engineer", dept: "Engineering", skills: ["React", "TS"], util: 0, allocation: 0, status: "Bench" },
  { id: "EMP-210", name: "Rahul Mehta", role: "DevOps Engineer", dept: "DevOps", skills: ["K8s", "Terraform"], util: 90, allocation: 100, status: "Allocated" },
];

export const risks = [
  { id: "RSK-091", name: "Vendor delivery slippage", severity: "High", probability: "High", impact: "Schedule", owner: "Marcus Lee", status: "Open", project: "Helix CRM Migration" },
  { id: "RSK-088", name: "Key resource attrition", severity: "Critical", probability: "Medium", impact: "Delivery", owner: "Hana Müller", status: "Mitigating", project: "Nimbus Data Lake" },
  { id: "RSK-085", name: "Scope creep on integrations", severity: "Medium", probability: "High", impact: "Cost", owner: "Yuki Tanaka", status: "Open", project: "Atlas Banking Platform" },
  { id: "RSK-081", name: "Compliance review backlog", severity: "High", probability: "Medium", impact: "Schedule", owner: "Daniel Otieno", status: "Open", project: "Quartz Identity Service" },
  { id: "RSK-078", name: "Third-party API instability", severity: "Medium", probability: "Medium", impact: "Quality", owner: "Sasha Reyes", status: "Monitoring", project: "Mosaic Mobile Suite" },
  { id: "RSK-074", name: "Currency exposure", severity: "Low", probability: "Low", impact: "Financial", owner: "Finance", status: "Accepted", project: "Lumen Customer 360" },
];

export const approvals = [
  { id: "APR-3201", type: "Change Request", project: "Atlas Banking Platform", requester: "Sasha Reyes", stage: "PMO Review", amount: 84000, submitted: "2d ago" },
  { id: "APR-3198", type: "Budget Increase", project: "Helix CRM Migration", requester: "Marcus Lee", stage: "Finance Review", amount: 120000, submitted: "1d ago" },
  { id: "APR-3194", type: "Resource Request", project: "Quartz Identity Service", requester: "Daniel Otieno", stage: "Manager Review", amount: 0, submitted: "4h ago" },
  { id: "APR-3190", type: "Milestone Sign-off", project: "Mosaic Mobile Suite", requester: "Elena Voss", stage: "Approved", amount: 0, submitted: "Yesterday" },
  { id: "APR-3187", type: "Vendor Onboarding", project: "Nimbus Data Lake", requester: "Priya Shah", stage: "Draft", amount: 0, submitted: "3d ago" },
];

export const milestones = [
  { name: "UAT Sign-off", project: "Atlas Banking Platform", date: "Dec 18", status: "On Track" },
  { name: "Phase 2 Kickoff", project: "Lumen Customer 360", date: "Dec 22", status: "On Track" },
  { name: "Data Migration", project: "Helix CRM Migration", date: "Jan 05", status: "At Risk" },
  { name: "Beta Release", project: "Quartz Identity Service", date: "Jan 14", status: "On Track" },
  { name: "Security Audit", project: "Mosaic Mobile Suite", date: "Jan 22", status: "On Track" },
];

export const activities = [
  { who: "Sasha Reyes", what: "approved milestone", target: "UAT Sign-off · Atlas", when: "12m" },
  { who: "Priya Shah", what: "uploaded document", target: "DataLake-Architecture.pdf", when: "38m" },
  { who: "Hana Müller", what: "flagged risk", target: "Key resource attrition", when: "1h" },
  { who: "Yuki Tanaka", what: "updated timeline", target: "Lumen Customer 360", when: "2h" },
  { who: "Marcus Lee", what: "submitted budget increase", target: "$120,000 · Helix CRM", when: "1d" },
  { who: "Elena Voss", what: "closed task", target: "Design QA round 3", when: "1d" },
];

export const documents = [
  { name: "Atlas-Architecture-v4.pdf", type: "PDF", size: "4.2 MB", owner: "Sasha Reyes", updated: "Today", project: "Atlas Banking Platform" },
  { name: "Q4-Resource-Plan.xlsx", type: "Excel", size: "1.1 MB", owner: "Hana Müller", updated: "Yesterday", project: "PMO" },
  { name: "Helix-Migration-SOW.docx", type: "Word", size: "820 KB", owner: "Marcus Lee", updated: "2d", project: "Helix CRM Migration" },
  { name: "Risk-Register-2026.xlsx", type: "Excel", size: "640 KB", owner: "PMO", updated: "3d", project: "PMO" },
  { name: "Nimbus-DataLake-Diagram.png", type: "Image", size: "2.4 MB", owner: "Priya Shah", updated: "3d", project: "Nimbus Data Lake" },
  { name: "Quartz-Security-Review.pdf", type: "PDF", size: "3.0 MB", owner: "Daniel Otieno", updated: "5d", project: "Quartz Identity Service" },
  { name: "Mosaic-UX-Research.fig", type: "Figma", size: "12 MB", owner: "Elena Voss", updated: "6d", project: "Mosaic Mobile Suite" },
  { name: "FY26-Budget-Forecast.pdf", type: "PDF", size: "1.8 MB", owner: "Finance", updated: "1w", project: "Finance" },
];

export const invoices = [
  { id: "INV-9821", client: "Northwind Capital", project: "Atlas Banking Platform", amount: 184000, status: "Paid", due: "Nov 28" },
  { id: "INV-9818", client: "Vertex Health", project: "Helix CRM Migration", amount: 96000, status: "Overdue", due: "Nov 15" },
  { id: "INV-9815", client: "Orion Logistics", project: "Nimbus Data Lake", amount: 142000, status: "Pending", due: "Dec 02" },
  { id: "INV-9812", client: "Stratus Media", project: "Mosaic Mobile Suite", amount: 58000, status: "Paid", due: "Nov 20" },
  { id: "INV-9809", client: "Helion Bank", project: "Quartz Identity Service", amount: 124000, status: "Pending", due: "Dec 12" },
  { id: "INV-9805", client: "Pavo Insurance", project: "Vector Analytics Cloud", amount: 210000, status: "Paid", due: "Nov 04" },
];

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
