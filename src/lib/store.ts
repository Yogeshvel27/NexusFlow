export interface ProjectAuditLog {
  id: string;
  timestamp: string;
  user: string;
  fromStatus: string;
  toStatus: string;
  comment?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  organizationId?: string;
  department: string;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  projectManager: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'In Progress' | 'On Hold' | 'Delayed' | 'Completed' | 'Closed';
  auditLog: ProjectAuditLog[];
  teamMembers?: string[];
}

export interface Attachment {
  name: string;
  size: string;
  url: string;
}

export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

export interface TaskActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string; // e.g. "Changed status from To Do to In Progress"
}

export interface WorkItem {
  id: string;
  projectId: string;
  parentId?: string; // Links to Epic ID or Task ID
  type: 'Epic' | 'Feature Request' | 'Improvement' | 'UX' | 'Technology' | 'Task' | 'Sub-task' | 'Test Sub-task' | 'Bug' | 'Story' | 'Feature' | 'Risk' | 'Issue';
  title: string;
  description: string;
  status: 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Testing' | 'Done' | 'Blocked' | 'Rework' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignee?: string;
  reporter?: string;
  reviewer?: string;
  dueDate?: string;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
  activityHistory: TaskActivityLog[];
  timerStartedAt?: string;
  accumulatedSeconds?: number;
  isDelayed?: boolean;
  performanceScore?: number;
}

// Allowed status transitions validation
export function validateTaskTransition(
  from: WorkItem['status'],
  to: WorkItem['status']
): { valid: boolean; reason?: string } {
  // Allow all task status transitions to enable complete flexibility and correction of accidental moves
  return { valid: true };
}

// Project lifecycle status transitions validation
export function validateProjectTransition(
  from: Project['status'],
  to: Project['status']
): { valid: boolean; reason?: string } {
  if (from === to) return { valid: true };

  // Workflow: Draft -> Pending Approval -> Approved -> In Progress -> On Hold / Delayed / Completed -> Closed
  if (from === 'Draft' && to !== 'Pending Approval') {
    return { valid: false, reason: "Draft projects must be submitted for approval (Pending Approval)." };
  }
  if (from === 'Pending Approval' && to !== 'Approved' && to !== 'Draft') {
    return { valid: false, reason: "Pending projects can only be Approved or sent back to Draft." };
  }
  if (from === 'Approved' && to !== 'In Progress' && to !== 'Draft') {
    return { valid: false, reason: "Approved projects must be activated (In Progress) or returned to Draft." };
  }
  if (from === 'Closed') {
    return { valid: false, reason: "Closed projects cannot be modified." };
  }

  return { valid: true };
}

export const initialProjects: Project[] = [
  {
    id: "PRJ-1042",
    name: "Atlas Banking Platform",
    code: "PRJ-1042",
    client: "Northwind Capital",
    department: "Engineering",
    budget: 1200000,
    spent: 820000,
    startDate: "2025-06-01",
    endDate: "2026-03-14",
    priority: "High",
    description: "Modern cloud-native core banking system migration and API gateway enablement.",
    projectManager: "Sasha Reyes",
    status: "In Progress",
    auditLog: [
      { id: "log-1", timestamp: "2025-06-01T09:00:00Z", user: "Sasha Reyes", fromStatus: "Draft", toStatus: "Pending Approval" },
      { id: "log-2", timestamp: "2025-06-03T14:30:00Z", user: "PMO Admin", fromStatus: "Pending Approval", toStatus: "Approved" },
      { id: "log-3", timestamp: "2025-06-05T10:00:00Z", user: "Sasha Reyes", fromStatus: "Approved", toStatus: "In Progress" },
    ]
  },
  {
    id: "PRJ-1038",
    name: "Helix CRM Migration",
    code: "PRJ-1038",
    client: "Vertex Health",
    department: "Engineering",
    budget: 680000,
    spent: 410000,
    startDate: "2025-08-15",
    endDate: "2026-02-02",
    priority: "High",
    description: "Migration of legacy CRM database to HIPAA-compliant cloud instance.",
    projectManager: "Marcus Lee",
    status: "Delayed",
    auditLog: [
      { id: "log-1", timestamp: "2025-08-15T09:00:00Z", user: "Marcus Lee", fromStatus: "Draft", toStatus: "Pending Approval" },
      { id: "log-2", timestamp: "2025-08-18T11:00:00Z", user: "PMO Admin", fromStatus: "Pending Approval", toStatus: "Approved" },
      { id: "log-3", timestamp: "2025-08-20T09:00:00Z", user: "Marcus Lee", fromStatus: "Approved", toStatus: "In Progress" },
      { id: "log-4", timestamp: "2025-11-10T16:00:00Z", user: "System", fromStatus: "In Progress", toStatus: "Delayed", comment: "Slipped milestones due to resource issues." },
    ]
  },
  {
    id: "PRJ-1031",
    name: "Nimbus Data Lake",
    code: "PRJ-1031",
    client: "Orion Logistics",
    department: "Data",
    budget: 940000,
    spent: 520000,
    startDate: "2025-07-01",
    endDate: "2026-01-18",
    priority: "Critical",
    description: "Enterprise-wide data aggregation and real-time analytics warehouse.",
    projectManager: "Priya Shah",
    status: "Delayed",
    auditLog: [
      { id: "log-1", timestamp: "2025-07-01T09:00:00Z", user: "Priya Shah", fromStatus: "Draft", toStatus: "Pending Approval" },
      { id: "log-2", timestamp: "2025-07-04T15:00:00Z", user: "PMO Admin", fromStatus: "Pending Approval", toStatus: "Approved" },
      { id: "log-3", timestamp: "2025-07-06T10:00:00Z", user: "Priya Shah", fromStatus: "Approved", toStatus: "In Progress" },
    ]
  },
  {
    id: "PRJ-1027",
    name: "Mosaic Mobile Suite",
    code: "PRJ-1027",
    client: "Stratus Media",
    department: "Design",
    budget: 540000,
    spent: 470000,
    startDate: "2025-09-01",
    endDate: "2025-12-22",
    priority: "Medium",
    description: "React Native iOS & Android media streaming application.",
    projectManager: "Elena Voss",
    status: "In Progress",
    auditLog: []
  },
  {
    id: "PRJ-1019",
    name: "Quartz Identity Service",
    code: "PRJ-1019",
    client: "Helion Bank",
    department: "Engineering",
    budget: 760000,
    spent: 480000,
    startDate: "2025-10-01",
    endDate: "2026-04-09",
    priority: "High",
    description: "Auth0 migration and secure multi-factor authentication layer implementation.",
    projectManager: "Daniel Otieno",
    status: "In Progress",
    auditLog: []
  },
  {
    id: "PRJ-1015",
    name: "Vector Analytics Cloud",
    code: "PRJ-1015",
    client: "Pavo Insurance",
    department: "Engineering",
    budget: 1100000,
    spent: 1080000,
    startDate: "2025-04-01",
    endDate: "2025-11-02",
    priority: "Low",
    description: "Predictive insurance risk assessment model training and dashboard deployment.",
    projectManager: "Hana Müller",
    status: "Completed",
    auditLog: []
  }
];

export const initialTasks: WorkItem[] = [
  // ATLAS BANKING PLATFORM (PRJ-1042)
  {
    id: "ATLAS-101",
    projectId: "PRJ-1042",
    type: "Epic",
    title: "Cloud Architecture Setup",
    description: "Design and implement the high-availability cloud hosting environment on AWS.",
    status: "In Progress",
    priority: "Critical",
    assignee: "Marcus Lee",
    reporter: "Sasha Reyes",
    dueDate: "2026-01-15",
    estimatedHours: 80,
    actualHours: 45,
    tags: ["Infra", "AWS"],
    attachments: [],
    comments: [],
    activityHistory: [
      { id: "act-1", timestamp: "2025-10-01T10:00:00Z", user: "Sasha Reyes", action: "Created Epic" },
    ]
  },
  {
    id: "ATLAS-102",
    projectId: "PRJ-1042",
    parentId: "ATLAS-101",
    type: "Technology",
    title: "Terraform Infrastructure Coding",
    description: "Write Terraform scripts to bootstrap the VPC, subnets, RDS PostgreSQL database, and ECS Fargate cluster.",
    status: "In Progress",
    priority: "High",
    assignee: "Rahul Mehta",
    reporter: "Marcus Lee",
    dueDate: "2025-12-20",
    estimatedHours: 40,
    actualHours: 25,
    tags: ["Terraform", "AWS"],
    attachments: [],
    comments: [
      { id: "c-1", author: "Marcus Lee", text: "VPC setup completed, moving to RDS configuration.", createdAt: "2025-12-05T15:30:00Z" }
    ],
    activityHistory: []
  },
  {
    id: "ATLAS-103",
    projectId: "PRJ-1042",
    parentId: "ATLAS-102",
    type: "Sub-task",
    title: "Setup VPC & Subnets",
    description: "Configure multi-AZ public and private subnets with appropriate NAT gateways.",
    status: "Done",
    priority: "Medium",
    assignee: "Rahul Mehta",
    reporter: "Marcus Lee",
    dueDate: "2025-12-10",
    estimatedHours: 12,
    actualHours: 10,
    tags: ["Networking"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-104",
    projectId: "PRJ-1042",
    parentId: "ATLAS-102",
    type: "Sub-task",
    title: "Configure RDS Database Instance",
    description: "Provision multi-AZ postgres instances with read replicas and KMS encryption enabled.",
    status: "In Progress",
    priority: "High",
    assignee: "Rahul Mehta",
    reporter: "Marcus Lee",
    dueDate: "2025-12-18",
    estimatedHours: 16,
    actualHours: 15,
    tags: ["Database"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-105",
    projectId: "PRJ-1042",
    parentId: "ATLAS-101",
    type: "Task",
    title: "CI/CD Pipeline Setup",
    description: "Create GitHub Actions workflow to run lint, test, build, and deploy to AWS ECS on merge.",
    status: "To Do",
    priority: "Medium",
    assignee: "Amelia Brooks",
    reporter: "Sasha Reyes",
    dueDate: "2026-01-05",
    estimatedHours: 24,
    actualHours: 0,
    tags: ["DevOps"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-106",
    projectId: "PRJ-1042",
    type: "Epic",
    title: "Authentication & Authorization Integration",
    description: "Implement secure enterprise log-in, role-based access control, and user profile syncing.",
    status: "To Do",
    priority: "High",
    assignee: "Daniel Otieno",
    reporter: "Sasha Reyes",
    dueDate: "2026-02-10",
    estimatedHours: 120,
    actualHours: 12,
    tags: ["Auth", "Security"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-107",
    projectId: "PRJ-1042",
    parentId: "ATLAS-106",
    type: "Feature Request",
    title: "Google SSO Integration",
    description: "Allow internal staff to log in using their organizational Google Workspace accounts via SAML/OIDC.",
    status: "To Do",
    priority: "Medium",
    assignee: "Daniel Otieno",
    reporter: "Sasha Reyes",
    dueDate: "2026-01-30",
    estimatedHours: 32,
    actualHours: 0,
    tags: ["SSO"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-108",
    projectId: "PRJ-1042",
    parentId: "ATLAS-106",
    type: "UX",
    title: "Design Login & Reset Password Screens",
    description: "Create high-fidelity interactive mockups in Figma for custom auth states and styling guidelines.",
    status: "Done",
    priority: "Low",
    assignee: "Elena Voss",
    reporter: "Daniel Otieno",
    dueDate: "2025-11-20",
    estimatedHours: 16,
    actualHours: 12,
    tags: ["Figma", "UI"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-109",
    projectId: "PRJ-1042",
    parentId: "ATLAS-106",
    type: "Bug",
    title: "Fix token expiration redirection",
    description: "Redirection loops when JWT expires during background REST polling fetches.",
    status: "Testing",
    priority: "Critical",
    assignee: "Sasha Reyes",
    reporter: "Tomás Vela",
    dueDate: "2025-12-15",
    estimatedHours: 8,
    actualHours: 10,
    tags: ["Regression"],
    attachments: [],
    comments: [
      { id: "c-2", author: "Tomás Vela", text: "Verified bug fix on staging. Waiting for final load test approval.", createdAt: "2025-12-08T10:00:00Z" }
    ],
    activityHistory: []
  },
  {
    id: "ATLAS-110",
    projectId: "PRJ-1042",
    parentId: "ATLAS-109",
    type: "Test Sub-task",
    title: "Write unit tests for token expiration response",
    description: "Ensure HTTP 401 interception triggers correct redirect callback functions.",
    status: "Done",
    priority: "Medium",
    assignee: "Tomás Vela",
    reporter: "Sasha Reyes",
    dueDate: "2025-12-12",
    estimatedHours: 4,
    actualHours: 4,
    tags: ["QA", "Testing"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-111",
    projectId: "PRJ-1042",
    type: "Epic",
    title: "Core Ledger Operations",
    description: "Design databases schemas, ledger audit constraints, and financial transaction controllers.",
    status: "In Progress",
    priority: "Critical",
    assignee: "Sasha Reyes",
    reporter: "Sasha Reyes",
    dueDate: "2026-02-28",
    estimatedHours: 200,
    actualHours: 90,
    tags: ["Database", "Ledger"],
    attachments: [],
    comments: [],
    activityHistory: []
  },
  {
    id: "ATLAS-112",
    projectId: "PRJ-1042",
    parentId: "ATLAS-111",
    type: "Task",
    title: "Database Schema Design",
    description: "Define constraints, indices, and foreign keys for accounts, double-entry ledgers, and transactions.",
    status: "Blocked",
    priority: "High",
    assignee: "Priya Shah",
    reporter: "Sasha Reyes",
    dueDate: "2025-12-30",
    estimatedHours: 30,
    actualHours: 10,
    tags: ["PostgreSQL"],
    attachments: [],
    comments: [
      { id: "c-3", author: "Priya Shah", text: "Currently blocked waiting for final finance compliance review specifications.", createdAt: "2025-12-07T14:00:00Z" }
    ],
    activityHistory: [
      { id: "act-2", timestamp: "2025-12-07T14:01:00Z", user: "Priya Shah", action: "Changed status to Blocked" }
    ]
  },
  {
    id: "ATLAS-113",
    projectId: "PRJ-1042",
    parentId: "ATLAS-111",
    type: "Improvement",
    title: "Optimize ledger query performance",
    description: "Introduce read-replicas or Materialized Views to improve high-velocity dashboard metrics fetch delays.",
    status: "Rework",
    priority: "Medium",
    assignee: "Marcus Lee",
    reporter: "Sasha Reyes",
    dueDate: "2026-01-10",
    estimatedHours: 24,
    actualHours: 8,
    tags: ["Performance"],
    attachments: [],
    comments: [
      { id: "c-4", author: "Sasha Reyes", text: "Index scan was fast, but materialized view is stale. Re-evaluate sync refresh period.", createdAt: "2025-12-08T18:00:00Z" }
    ],
    activityHistory: [
      { id: "act-3", timestamp: "2025-12-08T18:05:00Z", user: "Sasha Reyes", action: "Moved to Rework" }
    ]
  }
];
