"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Download, X, Briefcase, Award, DollarSign, Calendar, 
  BarChart3, CheckCircle, AlertCircle, Clock, PieChart as PieIcon, 
  UserCheck, RefreshCw, Layers, ShieldAlert, ArrowRight, UserPlus,
  Eye, Sparkles, ChevronDown, User, Cloud, Wrench, Server, Tag, FileText,
  Folder, FolderOpen, ChevronRight
} from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { ProgressBar } from "@/components/progress-bar";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@clerk/nextjs";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend 
} from "recharts";

// ==========================================
// TYPES & SCHEMAS
// ==========================================

export interface Skill {
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Expert" | "Architect";
  yearsExp: number;
  certification?: string;
}

export interface Allocation {
  id: string;
  projectId: string;
  projectName: string;
  role: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
  isBillable: boolean;
  remarks?: string;
}

export interface TimesheetEntry {
  id: string;
  projectName: string;
  taskName: string;
  date: string;
  hours: number;
  isBillable: boolean;
  comments: string;
  status: "Draft" | "Submitted" | "Approved" | "Rejected" | "Locked";
}

export interface Resource {
  // Sub Module 1 - Basic Details
  id: string; // Employee ID
  name: string;
  email: string;
  phone: string;
  role: string; // Designation
  dept: string;
  manager: string;
  location: string;
  employmentType: "Full Time" | "Contract" | "Consultant";
  
  // Cost Information
  costRate: number; // Cost Rate $/hr
  billingRate: number; // Billing Rate $/hr
  currency: string;
  joiningDate: string;
  experienceYears: number;

  // Sub Module 2 - Skills
  skills: Skill[];

  // Sub Module 3 & 4 - Allocations & Capacity
  status: "Available" | "Allocated" | "Partially Allocated" | "Bench" | "On Leave" | "Inactive";
  allocations: Allocation[];
  availabilityHrsWk: number; // Availability (hrs/wk)
  util: number; // Calculated Utilization %

  // Sub Module 7 - Timesheets
  timesheets: TimesheetEntry[];
}

// ==========================================
// MOCK DATA INITIALIZER
// ==========================================

const INITIAL_RESOURCES: Resource[] = [
  {
    id: "EMP-201",
    name: "Sasha Reyes",
    email: "sasha.reyes@nexusflow.io",
    phone: "+1 (555) 019-2831",
    role: "Sr. Engineering Manager",
    dept: "Engineering",
    manager: "Hana Müller",
    location: "San Francisco, CA",
    employmentType: "Full Time",
    costRate: 95,
    billingRate: 180,
    currency: "USD",
    joiningDate: "2024-02-15",
    experienceYears: 10,
    skills: [
      { name: "React", level: "Expert", yearsExp: 8, certification: "React Core Lead" },
      { name: "Node.js", level: "Expert", yearsExp: 7 },
      { name: "AWS", level: "Advanced", yearsExp: 4, certification: "AWS Solution Architect" },
      { name: "DevOps", level: "Advanced", yearsExp: 3 }
    ],
    status: "Allocated",
    allocations: [
      { id: "AL-101", projectId: "PRJ-1042", projectName: "Atlas Banking Platform", role: "Engineering Lead", allocationPercent: 100, startDate: "2026-01-01", endDate: "2026-08-30", isBillable: true }
    ],
    availabilityHrsWk: 40,
    util: 92,
    timesheets: [
      { id: "TS-101", projectName: "Atlas Banking Platform", taskName: "API Integration", date: "2026-06-08", hours: 8, isBillable: true, comments: "Completed auth endpoints", status: "Approved" },
      { id: "TS-102", projectName: "Atlas Banking Platform", taskName: "Code Review", date: "2026-06-09", hours: 8, isBillable: true, comments: "Reviewed PR #231", status: "Approved" }
    ]
  },
  {
    id: "EMP-202",
    name: "Marcus Lee",
    email: "marcus.lee@nexusflow.io",
    phone: "+1 (555) 014-9844",
    role: "Solutions Architect",
    dept: "Engineering",
    manager: "Hana Müller",
    location: "Chicago, IL",
    employmentType: "Full Time",
    costRate: 110,
    billingRate: 210,
    currency: "USD",
    joiningDate: "2023-09-01",
    experienceYears: 12,
    skills: [
      { name: "AWS", level: "Architect", yearsExp: 9, certification: "AWS Professional Architect" },
      { name: "Go", level: "Advanced", yearsExp: 5 },
      { name: "SQL", level: "Expert", yearsExp: 8 }
    ],
    status: "Allocated",
    allocations: [
      { id: "AL-102", projectId: "PRJ-1038", projectName: "Helix CRM Migration", role: "Lead Architect", allocationPercent: 80, startDate: "2026-02-01", endDate: "2026-07-15", isBillable: true }
    ],
    availabilityHrsWk: 40,
    util: 78,
    timesheets: [
      { id: "TS-201", projectName: "Helix CRM Migration", taskName: "Cloud Architecture Designing", date: "2026-06-08", hours: 7, isBillable: true, comments: "Designed VPC structures", status: "Submitted" }
    ]
  },
  {
    id: "EMP-203",
    name: "Priya Shah",
    email: "priya.shah@nexusflow.io",
    phone: "+1 (555) 012-3211",
    role: "Data Lead",
    dept: "Data",
    manager: "Yuki Tanaka",
    location: "New York, NY",
    employmentType: "Full Time",
    costRate: 90,
    billingRate: 170,
    currency: "USD",
    joiningDate: "2024-06-12",
    experienceYears: 8,
    skills: [
      { name: "SQL", level: "Expert", yearsExp: 7 },
      { name: "Python", level: "Advanced", yearsExp: 5 },
      { name: "Power BI", level: "Expert", yearsExp: 6 }
    ],
    status: "Allocated",
    allocations: [
      { id: "AL-103", projectId: "PRJ-1031", projectName: "Nimbus Data Lake", role: "Data Architect", allocationPercent: 100, startDate: "2026-01-10", endDate: "2026-06-30", isBillable: true }
    ],
    availabilityHrsWk: 40,
    util: 84,
    timesheets: []
  },
  {
    id: "EMP-204",
    name: "Elena Voss",
    email: "elena.voss@nexusflow.io",
    phone: "+1 (555) 015-8833",
    role: "Product Designer",
    dept: "Design",
    manager: "Yuki Tanaka",
    location: "Austin, TX",
    employmentType: "Contract",
    costRate: 75,
    billingRate: 140,
    currency: "USD",
    joiningDate: "2025-01-10",
    experienceYears: 6,
    skills: [
      { name: "Figma", level: "Expert", yearsExp: 6, certification: "Figma Professional Designer" }
    ],
    status: "Partially Allocated",
    allocations: [
      { id: "AL-104", projectId: "PRJ-1027", projectName: "Mosaic Mobile Suite", role: "UX Lead", allocationPercent: 60, startDate: "2025-11-01", endDate: "2026-04-30", isBillable: true }
    ],
    availabilityHrsWk: 30,
    util: 65,
    timesheets: []
  },
  {
    id: "EMP-205",
    name: "Tomás Vela",
    email: "tomas.vela@nexusflow.io",
    phone: "+1 (555) 017-7622",
    role: "QA Lead",
    dept: "QA",
    manager: "Sasha Reyes",
    location: "Miami, FL",
    employmentType: "Consultant",
    costRate: 65,
    billingRate: 120,
    currency: "USD",
    joiningDate: "2024-11-01",
    experienceYears: 5,
    skills: [
      { name: "React", level: "Intermediate", yearsExp: 2 },
      { name: "DevOps", level: "Intermediate", yearsExp: 3 }
    ],
    status: "Bench",
    allocations: [],
    availabilityHrsWk: 40,
    util: 0,
    timesheets: []
  },
  {
    id: "EMP-206",
    name: "Yuki Tanaka",
    email: "yuki.tanaka@nexusflow.io",
    phone: "+1 (555) 011-2299",
    role: "Product Manager",
    dept: "Product",
    manager: "Hana Müller",
    location: "Seattle, WA",
    employmentType: "Full Time",
    costRate: 100,
    billingRate: 190,
    currency: "USD",
    joiningDate: "2022-04-18",
    experienceYears: 9,
    skills: [
      { name: "Figma", level: "Advanced", yearsExp: 4 }
    ],
    status: "Allocated",
    allocations: [
      { id: "AL-105", projectId: "PRJ-1003", projectName: "Lumen Customer 360", role: "Product Manager", allocationPercent: 100, startDate: "2026-03-01", endDate: "2026-12-31", isBillable: true }
    ],
    availabilityHrsWk: 40,
    util: 81,
    timesheets: []
  },
  {
    id: "EMP-207",
    name: "Amelia Brooks",
    email: "amelia.brooks@nexusflow.io",
    phone: "+1 (555) 018-4567",
    role: "Frontend Engineer",
    dept: "Engineering",
    manager: "Sasha Reyes",
    location: "Denver, CO",
    employmentType: "Full Time",
    costRate: 70,
    billingRate: 130,
    currency: "USD",
    joiningDate: "2025-08-01",
    experienceYears: 4,
    skills: [
      { name: "React", level: "Advanced", yearsExp: 4 },
      { name: "Figma", level: "Intermediate", yearsExp: 1 }
    ],
    status: "Bench",
    allocations: [],
    availabilityHrsWk: 40,
    util: 0,
    timesheets: []
  }
];

const ALL_SKILLS = ["React", "Node.js", "Java", "Python", "AWS", "Azure", "DevOps", "Figma", "SQL", "Power BI"];

const DESIGNATION_OPTIONS = [
  { value: "Other Cloud Service", label: "Other Cloud Service (Cloud)" },
  { value: "AWS EC2 Instance", label: "AWS EC2 Instance (VM)" },
  { value: "AWS S3 Storage", label: "AWS S3 Storage (Storage)" },
  { value: "AWS RDS Database", label: "AWS RDS Database (Database)" },
  { value: "GCP Compute VM", label: "GCP Compute VM (VM)" },
  { value: "Azure Virtual Machine", label: "Azure Virtual Machine (VM)" },
  { value: "OpenAI API Service", label: "OpenAI API Service (API)" },
  { value: "Frontend Engineer", label: "Frontend Engineer (Human)" },
  { value: "Backend Engineer", label: "Backend Engineer (Human)" },
  { value: "Product Designer", label: "Product Designer (Human)" },
];

const DEPT_OPTIONS = [
  { value: "Engineering", label: "Engineering" },
  { value: "Operations", label: "Operations" },
  { value: "Finance", label: "Finance" },
  { value: "HR", label: "HR" },
];

const MANAGER_OPTIONS = [
  { value: "Yogesh V", label: "Yogesh V" },
  { value: "Alex Rivera", label: "Alex Rivera" },
  { value: "Sarah Chen", label: "Sarah Chen" },
  { value: "Marcus Vance", label: "Marcus Vance" },
  { value: "Elena Rostova", label: "Elena Rostova" },
];

const STATUS_OPTIONS = [
  { value: "Available", label: "Active / Available" },
  { value: "On Bench", label: "On Bench" },
  { value: "Fully Allocated", label: "Fully Allocated" },
  { value: "Terminated", label: "Terminated" },
];

const PROJECT_OPTIONS = [
  { value: "UVANTHU", label: "UVANTHU" },
  { value: "Atlas Banking Platform", label: "Atlas Banking Platform" },
  { value: "Helix CRM Migration", label: "Helix CRM Migration" },
  { value: "Nimbus Data Lake", label: "Nimbus Data Lake" },
  { value: "Mosaic Mobile Suite", label: "Mosaic Mobile Suite" },
  { value: "Lumen Customer 360", label: "Lumen Customer 360" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

const CATEGORY_OPTIONS = [
  { value: "VM", label: "VM" },
  { value: "Storage", label: "Storage" },
  { value: "Database", label: "Database" },
  { value: "Cache", label: "Cache" },
  { value: "LLM", label: "LLM" },
  { value: "SaaS API", label: "SaaS API" },
  { value: "Human", label: "Human" },
];

const PROFICIENCY_OPTIONS = [
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
  { value: "Expert", label: "Expert" },
  { value: "Architect", label: "Architect" },
];

interface DarkSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  options: { value: string; label: string }[];
  size?: "sm" | "md";
}

function DarkSelect({ value, onValueChange, placeholder, leftIcon, options, size = "md" }: DarkSelectProps) {
  const isSm = size === "sm";
  return (
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none z-10">
          {leftIcon}
        </span>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(
          "w-full bg-stone-900/40 border border-white/5 text-stone-100 focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 focus:ring-offset-0 focus:outline-none transition-all duration-200 select-none",
          isSm ? "h-9 px-2 rounded-lg text-xs" : "h-11 rounded-xl text-xs",
          leftIcon ? (isSm ? "pl-8" : "pl-10") : (isSm ? "pl-2.5" : "pl-3.5")
        )}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-[#0D0D0D] border border-white/10 text-stone-100 shadow-2xl">
          {options.map((opt) => (
            <SelectItem 
              key={opt.value} 
              value={opt.value}
              className="focus:bg-[#C8844A]/10 focus:text-[#C8844A] text-stone-300 hover:text-white cursor-pointer transition-colors duration-150 text-xs"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

async function syncRelatedTables(updated: Resource[]) {
  try {
    const resourceIds = updated.map(r => r.id);
    if (resourceIds.length === 0) return;

    // Fetch existing projects from the DB to validate and correct foreign keys
    const { data: dbProjects } = await supabase.from("projects").select("id, name");
    const projectIds = new Set(dbProjects ? dbProjects.map(p => p.id) : []);
    const projectNamesMap = new Map(dbProjects ? dbProjects.map(p => [p.name, p.id]) : []);

    const allAllocationsRows: any[] = [];
    const timesheetRows: any[] = [];
    const resourceTimesheetRows: any[] = [];

    updated.forEach(res => {
      if (Array.isArray(res.allocations)) {
        res.allocations.forEach((alloc: any) => {
          let projId = alloc.projectId;
          if (projId && !projectIds.has(projId) && projectNamesMap.has(alloc.projectName)) {
            projId = projectNamesMap.get(alloc.projectName);
          }

          if (projId && projectIds.has(projId)) {
            const uniqueAllocId = `${alloc.id}-${res.id}`;
            allAllocationsRows.push({
              id: uniqueAllocId,
              resource_id: res.id,
              project_id: projId,
              project_name: alloc.projectName,
              role: alloc.role || "Resource",
              allocation_percent: Number(alloc.allocationPercent || 100),
              start_date: alloc.startDate,
              end_date: alloc.endDate || "2026-12-31",
              is_billable: alloc.isBillable !== false
            });
          }
        });
      }

      if (Array.isArray(res.timesheets)) {
        res.timesheets.forEach((ts: any) => {
          let dbStatus = "Pending";
          if (ts.status === "Approved" || ts.status === "Locked") {
            dbStatus = "Approved";
          } else if (ts.status === "Rejected") {
            dbStatus = "Rejected";
          }

          let projId = ts.projectId;
          if (projId && !projectIds.has(projId) && projectNamesMap.has(ts.projectName)) {
            projId = projectNamesMap.get(ts.projectName);
          }

          if (projId && projectIds.has(projId)) {
            const uniqueTsId = `${ts.id}-${res.id}`;
            timesheetRows.push({
              id: uniqueTsId,
              resource_id: res.id,
              project_id: projId,
              project_name: ts.projectName,
              task_name: ts.taskName,
              date: ts.date,
              hours: Number(ts.hours),
              is_billable: !!ts.isBillable,
              comments: ts.comments || "",
              status: dbStatus
            });

            resourceTimesheetRows.push({
              id: uniqueTsId,
              resource_id: res.id,
              project_id: projId,
              date: ts.date,
              hours: Number(ts.hours),
              description: ts.taskName || ts.comments || "",
              status: ts.status || "Submitted"
            });
          }
        });
      }
    });

    await supabase.from("resource_allocations").delete().in("resource_id", resourceIds);
    if (allAllocationsRows.length > 0) {
      const { error: allocError } = await supabase
        .from("resource_allocations")
        .upsert(allAllocationsRows, { onConflict: "id" });
      if (allocError) {
        console.error("Failed to sync to resource_allocations:", {
          message: allocError.message,
          details: allocError.details,
          hint: allocError.hint,
          code: allocError.code
        });
      }
    }

    await supabase.from("timesheets").delete().in("resource_id", resourceIds);
    if (timesheetRows.length > 0) {
      const { error: tsError } = await supabase
        .from("timesheets")
        .upsert(timesheetRows, { onConflict: "id" });
      if (tsError) {
        console.error("Failed to sync to timesheets:", {
          message: tsError.message,
          details: tsError.details,
          hint: tsError.hint,
          code: tsError.code
        });
      }
    }

    await supabase.from("resource_timesheets").delete().in("resource_id", resourceIds);
    if (resourceTimesheetRows.length > 0) {
      const { error: rtsError } = await supabase
        .from("resource_timesheets")
        .upsert(resourceTimesheetRows, { onConflict: "id" });
      if (rtsError) {
        console.error("Failed to sync to resource_timesheets:", {
          message: rtsError.message,
          details: rtsError.details,
          hint: rtsError.hint,
          code: rtsError.code
        });
      }
    }
  } catch (err) {
    console.error("Failed to sync related tables:", err);
  }
}

function isHumanResource(r: Resource): boolean {
  if (r.location === "Human") return true;
  
  const roleLower = (r.role || "").toLowerCase();
  if (
    roleLower.includes("instance") ||
    roleLower.includes("service") ||
    roleLower.includes("cluster") ||
    roleLower.includes("cache") ||
    roleLower.includes("bucket") ||
    roleLower.includes("machine") ||
    roleLower.includes("account") ||
    roleLower.includes("balancer") ||
    roleLower.includes("api")
  ) {
    return false;
  }
  return true;
}

async function notifyITAdminOfAllocation(
  resourceName: string,
  projectName: string,
  managerName: string,
  role: string
) {
  try {
    const { data: admins } = await supabase
      .from("users")
      .select("email")
      .or("role.eq.IT Administrator,role.eq.Admin,role.eq.IT Administrators");

    const adminEmails = admins && admins.length > 0
      ? admins.map(u => u.email)
      : ["gnmhs123@gmail.com"];

    for (const email of adminEmails) {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          employeeName: resourceName,
          projectName: projectName,
          projectManager: managerName,
          projectRole: role,
          notificationType: "allocation"
        })
      });
    }
  } catch (err) {
    console.error("Failed to notify IT Admin of allocation:", err);
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ResourceModule() {
  const { user } = useUser();
  const { orgRole } = useAuth();
  
  const canAddResource = !orgRole || (
    orgRole === "org:admin" ||
    orgRole === "org:resource_managers" ||
    orgRole === "org:executive_management" ||
    orgRole === "org:it_administrators"
  );
  const { projects, updateProjectBudget, resources: dbResources, refreshData } = useWorkspace();
  const [resources, setResources] = useState<Resource[]>([]);
  const [currentPageDirectory, setCurrentPageDirectory] = useState(1);
  const [currentPageBench, setCurrentPageBench] = useState(1);

  const allBenchResources = React.useMemo(() => {
    return [...resources]
      .filter(r => r.status === "Bench" || r.status === "Available")
      .sort((a, b) => {
        const dateA = new Date(a.joiningDate || 0).getTime();
        const dateB = new Date(b.joiningDate || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return b.id.localeCompare(a.id);
      });
  }, [resources]);

  const benchResources = React.useMemo(() => {
    const startIndex = (currentPageBench - 1) * 5;
    return allBenchResources.slice(startIndex, startIndex + 5);
  }, [allBenchResources, currentPageBench]);
  const [activeTab, setActiveTab] = useState<"directory" | "timesheets" | "billing">("directory");
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState<"utilization" | "experience" | "name">("name");

  // Reset page numbers when search/filters change
  useEffect(() => {
    setCurrentPageDirectory(1);
  }, [searchQuery, filterDept, filterStatus, filterType, sortBy]);

  useEffect(() => {
    setCurrentPageBench(1);
  }, [resources]);

  // Profile Drawer State
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [profileTab, setProfileTab] = useState<"overview" | "skills" | "allocations" | "utilization" | "billing" | "history">("overview");

  // Add Resource Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormTab, setAddFormTab] = useState<"basic" | "cost" | "skills">("basic");

  // Add Resource Form State
  const [empId, setEmpId] = useState("");
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empDesignation, setEmpDesignation] = useState("Other Cloud Service");
  const [empDept, setEmpDept] = useState("Engineering");
  const [empManager, setEmpManager] = useState("Yogesh V");
  const [empLocation, setEmpLocation] = useState("");
  const [empType, setEmpType] = useState<Resource['employmentType']>("Full Time");
  
  const [empCostRate, setEmpCostRate] = useState("0.1");
  const [empBillingRate, setEmpBillingRate] = useState("40");
  const [empCurrency, setEmpCurrency] = useState("USD");
  const [empJoinDate, setEmpJoinDate] = useState("2026-06-17");
  const [empExperience, setEmpExperience] = useState("5");
  const [empAvailability, setEmpAvailability] = useState("40");

  const [empCategory, setEmpCategory] = useState("VM");
  const [empProjectAssignment, setEmpProjectAssignment] = useState("UVANTHU");
  const [empDescription, setEmpDescription] = useState("");
  const [empStatus, setEmpStatus] = useState("Available");
  const [isVerifying, setIsVerifying] = useState(false);

  const [formSkills, setFormSkills] = useState<{ name: string; level: Skill['level']; yearsExp: number; certification?: string }[]>([
    { name: "React", level: "Advanced", yearsExp: 3 }
  ]);

  // Allocation Form State
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [allocProjectName, setAllocProjectName] = useState("Atlas Banking Platform");
  const [allocResourceEmail, setAllocResourceEmail] = useState("");
  const [allocRole, setAllocRole] = useState("Developer");
  const [allocPercent, setAllocPercent] = useState("100");
  const [allocStart, setAllocStart] = useState("");
  const [allocEnd, setAllocEnd] = useState("");
  const [allocBillable, setAllocBillable] = useState(true);
  const [allocRemarks, setAllocRemarks] = useState("");

  // Timesheet Submission State
  const [timesheetProject, setTimesheetProject] = useState("");
  const [timesheetTask, setTimesheetTask] = useState("");
  const [timesheetHours, setTimesheetHours] = useState("8");
  const [timesheetBillable, setTimesheetBillable] = useState(true);
  const [timesheetComments, setTimesheetComments] = useState("");
  const [timesheetResourceEmail, setTimesheetResourceEmail] = useState("");

  // User role state
  const [userRole, setUserRole] = useState<string>("Team Member");

  useEffect(() => {
    async function fetchUserRole() {
      if (user?.primaryEmailAddress?.emailAddress) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("email", user.primaryEmailAddress.emailAddress)
          .maybeSingle();
        if (data && !error) {
          setUserRole(data.role);
        }
      }
    }
    fetchUserRole();
  }, [user]);

  const filteredTimesheetProjects = React.useMemo(() => {
    const isAdmin = userRole.toLowerCase().includes("admin");
    if (isAdmin) {
      return projects;
    }
    if (userRole === "Project Manager") {
      return projects.filter(p => p.projectManager === user?.fullName);
    }
    return projects;
  }, [projects, userRole, user?.fullName]);

  useEffect(() => {
    if (filteredTimesheetProjects.length > 0 && !filteredTimesheetProjects.some(p => p.name === timesheetProject)) {
      setTimesheetProject(filteredTimesheetProjects[0].name);
    }
  }, [filteredTimesheetProjects, timesheetProject]);

  // Skill recommendation state
  const [skillSearch, setSkillSearch] = useState("");
  const [skillLevelReq, setSkillLevelReq] = useState<Skill['level'] | "Any">("Any");

  // Initialize and keep local state in sync with context cache
  useEffect(() => {
    if (dbResources && dbResources.length > 0) {
      setResources(dbResources);
    } else {
      const saved = localStorage.getItem("nexus_resources_v2");
      setResources(saved ? JSON.parse(saved) : INITIAL_RESOURCES);
    }
  }, [dbResources]);

  const saveState = async (updated: Resource[]) => {
    setResources(updated);
    localStorage.setItem("nexus_resources_v2", JSON.stringify(updated));

    const syncPromise = (async () => {
      const rows = updated.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        dept: r.dept,
        manager: r.manager,
        location: r.location,
        employment_type: r.employmentType,
        cost_rate: r.costRate,
        billing_rate: r.billingRate,
        currency: r.currency,
        joining_date: r.joiningDate,
        experience_years: r.experienceYears,
        skills: r.skills,
        status: r.status,
        utilization_rate: r.util,
        availability_hrs_wk: r.availabilityHrsWk,
        allocations: r.allocations,
        timesheets: r.timesheets
      }));

      const { error } = await supabase.from("resources").upsert(rows);
      if (error) {
        throw error;
      }
      await syncRelatedTables(updated);
      await refreshData();
    })();

    toast.promise(syncPromise, {
      loading: "Saving resource changes...",
      success: "Resources saved and synchronized!",
      error: (err) => `Database sync failed: ${err.message || String(err)}`
    });
  };

  // Status Styling
  const getStatusTone = (status: Resource['status']) => {
    switch (status) {
      case "Available": return "success";
      case "Allocated": return "primary";
      case "Partially Allocated": return "warning";
      case "Bench": return "neutral";
      case "On Leave": return "danger";
      case "Inactive": return "neutral";
      default: return "neutral";
    }
  };

  // Add skill in form
  const addSkillToForm = () => {
    setFormSkills([...formSkills, { name: "React", level: "Intermediate", yearsExp: 1 }]);
  };

  // Remove skill from form
  const removeSkillFromForm = (idx: number) => {
    setFormSkills(formSkills.filter((_, i) => i !== idx));
  };

  const handleVerifyWithAI = async () => {
    if (!empName) {
      toast.error("Please enter a resource name first.");
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch("/api/gemini/validate-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceName: empName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isValid) {
          setEmpName(data.correctedName);
          setEmpCostRate(String(data.suggestedCost));
          setEmpCategory(data.category || "VM");
          setEmpDesignation(data.correctedName);
          toast.success(data.message || "Resource verified successfully!");
        } else {
          toast.error(data.message || "Invalid or unrecognized cloud service.");
        }
      } else {
        toast.error("AI verification failed. Please check your network or API settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Save new Resource
  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empDesignation) {
      toast.error("Please complete basic details.");
      return;
    }

    const generatedEmail = empEmail || `${empName.toLowerCase().trim().replace(/[^a-zA-Z0-9]+/g, ".")}@nexusflow.com`;
    const generatedId = empId || `EMP-${Date.now().toString().slice(-4)}`;

    // If project is assigned, create an allocation
    const allocationsList: Allocation[] = [];
    let initialUtil = 0;
    if (empProjectAssignment) {
      const targetProj = projects.find(p => p.name === empProjectAssignment);
      const projId = targetProj ? targetProj.id : `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
      allocationsList.push({
        id: `AL-${Date.now()}`,
        projectId: projId,
        projectName: empProjectAssignment,
        role: "Resource",
        allocationPercent: 100,
        startDate: empJoinDate || new Date().toISOString().split("T")[0],
        endDate: "2026-12-31",
        isBillable: true,
        remarks: "Provisioned allocation"
      });
      initialUtil = 100;
    }

    const newResource: Resource = {
      id: generatedId,
      name: empName,
      email: generatedEmail,
      phone: empPhone || "N/A",
      role: empDesignation,
      dept: empDept,
      manager: empManager || "Yogesh V",
      location: empCategory || "VM", // Save Category in location field
      employmentType: empType,
      costRate: Number(empCostRate) || 0.1,
      billingRate: Number(empBillingRate) || 40,
      currency: empCurrency,
      joiningDate: empJoinDate || new Date().toISOString().split("T")[0],
      experienceYears: Number(empExperience) || 5,
      skills: formSkills,
      status: empStatus as any || (empProjectAssignment ? "Allocated" : "Available"),
      allocations: allocationsList,
      availabilityHrsWk: Number(empAvailability) || 40,
      util: initialUtil,
      timesheets: []
    };

    const updated = [...resources, newResource];
    saveState(updated);
    
    if (empProjectAssignment) {
      notifyITAdminOfAllocation(
        newResource.name,
        empProjectAssignment,
        user?.fullName || empManager || "System Admin",
        newResource.role
      );
    }

    setIsAddModalOpen(false);
    toast.success(`Resource ${newResource.name} created successfully!`);

    // Reset fields
    setEmpId("");
    setEmpName("");
    setEmpEmail("");
    setEmpPhone("");
    setEmpDesignation("Other Cloud Service");
    setEmpDept("Engineering");
    setEmpManager("Yogesh V");
    setEmpLocation("");
    setEmpCostRate("0.1");
    setEmpBillingRate("40");
    setEmpCurrency("USD");
    setEmpJoinDate("2026-06-17");
    setEmpCategory("VM");
    setEmpProjectAssignment("UVANTHU");
    setEmpDescription("");
    setEmpStatus("Available");
    setFormSkills([{ name: "React", level: "Advanced", yearsExp: 3 }]);
  };

  // Create Allocation
  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocResourceEmail || !allocStart || !allocEnd) {
      toast.error("Please specify a resource and date range.");
      return;
    }

    const updated = resources.map(res => {
      if (res.email === allocResourceEmail) {
        // Calculate total allocated capacity
        const currentAllocSum = res.allocations.reduce((sum, al) => sum + al.allocationPercent, 0);
        const nextAllocPercent = Number(allocPercent) || 100;
        
        if (currentAllocSum + nextAllocPercent > 100) {
          toast.warning(`Warning: ${res.name} will be overallocated (${currentAllocSum + nextAllocPercent}%)!`);
        }

        const targetProj = projects.find(p => p.name === allocProjectName);
        const projId = targetProj ? targetProj.id : `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

        const newAlloc: Allocation = {
          id: `AL-${Date.now()}`,
          projectId: projId,
          projectName: allocProjectName,
          role: allocRole,
          allocationPercent: nextAllocPercent,
          startDate: allocStart,
          endDate: allocEnd,
          isBillable: allocBillable,
          remarks: allocRemarks
        };

        const allocationsList = [...res.allocations, newAlloc];
        const newUtil = Math.round(allocationsList.reduce((sum, al) => sum + al.allocationPercent, 0));

        let newStatus: Resource['status'] = "Allocated";
        if (newUtil === 0) newStatus = "Available";
        else if (newUtil < 100) newStatus = "Partially Allocated";
        else if (newUtil > 100) newStatus = "Allocated"; // overallocated

        return {
          ...res,
          allocations: allocationsList,
          util: newUtil,
          status: newStatus
        };
      }
      return res;
    });

    saveState(updated);
    setIsAllocationModalOpen(false);
    toast.success("Project allocation saved.");
  };

  // Add Timesheet Entry
  const handleAddTimesheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timesheetResourceEmail || !timesheetTask) {
      toast.error("Please specify resource and task.");
      return;
    }

    const updated = resources.map(res => {
      if (res.email === timesheetResourceEmail) {
        const newEntry: TimesheetEntry = {
          id: `TS-${Date.now()}`,
          projectName: timesheetProject,
          taskName: timesheetTask,
          date: new Date().toISOString().split("T")[0],
          hours: Number(timesheetHours) || 8,
          isBillable: timesheetBillable,
          comments: timesheetComments,
          status: "Submitted"
        };

        return {
          ...res,
          timesheets: [newEntry, ...res.timesheets]
        };
      }
      return res;
    });

    saveState(updated);
    toast.success("Timesheet entry submitted for approval.");
    setTimesheetTask("");
    setTimesheetComments("");
  };

  // Approve Timesheet Entry
  const handleTimesheetStatusChange = (resourceId: string, entryId: string, nextStatus: TimesheetEntry['status']) => {
    const resObj = resources.find(r => r.id === resourceId);
    const entryObj = resObj?.timesheets?.find(ts => ts.id === entryId);

    if (resObj && entryObj) {
      const costRateVal = resObj.costRate || 80;
      const amount = Math.round(entryObj.hours * costRateVal);
      const targetProj = projects.find(p => p.name === entryObj.projectName);

      if (targetProj) {
        if (nextStatus === "Approved" && entryObj.status !== "Approved") {
          const newSpent = (targetProj.spent || 0) + amount;
          updateProjectBudget(targetProj.id, targetProj.budget, newSpent);
          toast.success(`Deducted $${amount.toLocaleString()} from "${targetProj.name}" budget pool (Added to spent).`);
        } else if (entryObj.status === "Approved" && nextStatus !== "Approved") {
          const newSpent = Math.max(0, (targetProj.spent || 0) - amount);
          updateProjectBudget(targetProj.id, targetProj.budget, newSpent);
          toast.success(`Reverted $${amount.toLocaleString()} back to "${targetProj.name}" budget pool (Removed from spent).`);
        }
      }
    }

    const updated = resources.map(res => {
      if (res.id === resourceId) {
        const updatedEntries = res.timesheets.map(ts => {
          if (ts.id === entryId) {
            return { ...ts, status: nextStatus };
          }
          return ts;
        });

        // Calculate billable utilization change if approved
        let totalBillableHours = 0;
        let totalAvailableHours = res.availabilityHrsWk * 4; // monthly approx

        updatedEntries.forEach(ts => {
          if (ts.status === "Approved" && ts.isBillable) {
            totalBillableHours += ts.hours;
          }
        });

        const newUtil = totalAvailableHours > 0 ? Math.min(100, Math.round((totalBillableHours / totalAvailableHours) * 100)) : 0;

        return {
          ...res,
          timesheets: updatedEntries,
          util: newUtil > 0 ? newUtil : res.util
        };
      }
      return res;
    });

    saveState(updated);
    toast.success(`Timesheet status updated to ${nextStatus}.`);
  };

  // Release resource from project
  const handleReleaseResource = (resourceId: string, allocationId: string) => {
    const updated = resources.map(res => {
      if (res.id === resourceId) {
        const allocations = res.allocations.filter(al => al.id !== allocationId);
        const newUtil = Math.round(allocations.reduce((sum, al) => sum + al.allocationPercent, 0));
        let newStatus: Resource['status'] = "Bench";
        if (newUtil > 0 && newUtil < 100) newStatus = "Partially Allocated";
        else if (newUtil >= 100) newStatus = "Allocated";

        return {
          ...res,
          allocations,
          util: newUtil,
          status: newStatus
        };
      }
      return res;
    });

    saveState(updated);
    if (selectedResource?.id === resourceId) {
      const res = updated.find(r => r.id === resourceId);
      if (res) setSelectedResource(res);
    }
    toast.success("Resource released from assignment.");
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ["Employee ID", "Name", "Role", "Department", "Employment Type", "Status", "Utilization %", "Cost Rate ($/hr)", "Billing Rate ($/hr)"];
    const rows = resources.map(r => [
      r.id, r.name, r.role, r.dept, r.employmentType, r.status, r.util, r.costRate, r.billingRate
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const encoded = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", "NexusFlow_Resource_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recommendation Engine
  const getResourceRecommendations = () => {
    if (!skillSearch) return [];
    return resources.filter(res => {
      return res.skills.some(sk => 
        sk.name.toLowerCase().includes(skillSearch.toLowerCase()) && 
        (skillLevelReq === "Any" || sk.level === skillLevelReq)
      );
    });
  };

  // Filter Directory
  const filteredDirectory = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.skills.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = filterDept === "All" || r.dept === filterDept;
    const matchesStatus = filterStatus === "All" || r.status === filterStatus;
    const matchesType = filterType === "All" || r.employmentType === filterType;

    return matchesSearch && matchesDept && matchesStatus && matchesType;
  }).sort((a, b) => {
    if (sortBy === "utilization") return b.util - a.util;
    if (sortBy === "experience") return b.experienceYears - a.experienceYears;
    return a.name.localeCompare(b.name);
  });
  const displayedDirectory = React.useMemo(() => {
    const startIndex = (currentPageDirectory - 1) * 5;
    return filteredDirectory.slice(startIndex, startIndex + 5);
  }, [filteredDirectory, currentPageDirectory]);

  // Calculate high level KPIs
  const totalCapacity = resources.length * 40; // 40h standard
  const allocatedCapacity = resources.reduce((sum, res) => sum + (res.availabilityHrsWk * (res.util / 100)), 0);
  const remainingCapacity = Math.max(0, totalCapacity - allocatedCapacity);
  const overAllocatedCount = resources.filter(r => r.util > 100).length;

  // Chart Data Calculations
  const utilizationPieData = [
    { name: "Underutilized (0-50%)", value: resources.filter(r => r.util <= 50).length, color: "#78716C" },
    { name: "Optimal (51-75%)", value: resources.filter(r => r.util > 50 && r.util <= 75).length, color: "#D4A373" },
    { name: "Highly Utilized (76-100%)", value: resources.filter(r => r.util > 75 && r.util <= 100).length, color: "#22C55E" },
    { name: "Overallocated (>100%)", value: resources.filter(r => r.util > 100).length, color: "#EF4444" }
  ];

  const departmentUtilizationData = Array.from(new Set(resources.map(r => r.dept))).map(deptName => {
    const deptRes = resources.filter(r => r.dept === deptName);
    const avgUtil = Math.round(deptRes.reduce((sum, r) => sum + r.util, 0) / (deptRes.length || 1));
    return { name: deptName, utilization: avgUtil };
  });

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Resource Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Centralize capabilities, capacity planning, allocations, and billing</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="h-10 px-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary inline-flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="size-4" />Export CSV
          </button>
          {canAddResource && (
            <button 
              onClick={() => {
                setIsAddModalOpen(true);
                setAddFormTab("basic");
              }}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2 hover:opacity-95 transition cursor-pointer"
            >
              <UserPlus className="size-4" />Add Resource
            </button>
          )}
        </div>
      </div>

      {/* Sub Module Tabs Menu */}
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
        {[
          { id: "directory", label: "Directory & Bench" },
          { id: "timesheets", label: "Timesheets Approval" },
          { id: "billing", label: "Billing & Revenue" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition cursor-pointer ${
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================
          TAB 1: DIRECTORY & BENCH
          ======================================================== */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          {/* Dashboard KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Total Resources", v: resources.length },
              { l: "Allocated Resources", v: resources.filter(r => r.status === "Allocated" || r.status === "Partially Allocated").length },
              { l: "Active Bench Resources", v: resources.filter(r => r.status === "Bench" || r.status === "Available").length },
              { l: "Avg utilization", v: `${Math.round(resources.reduce((sum, r) => sum + r.util, 0) / (resources.length || 1))}%` }
            ].map(kpi => (
              <div key={kpi.l} className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.l}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{kpi.v}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Directory List Column */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              {/* Directory Filter Bar */}
              <div className="px-5 py-4 border-b border-border bg-secondary/10 flex flex-col md:flex-row items-center gap-3">
                <div className="font-semibold text-sm mr-auto">Directory</div>
                
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input 
                    placeholder="Search name, role, skill..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-2 flex-wrap w-full md:w-auto">
                  <select 
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="h-9 px-2 rounded-xl bg-secondary border border-border text-xs"
                  >
                    <option value="All">All Depts</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Data">Data</option>
                    <option value="QA">QA</option>
                    <option value="DevOps">DevOps</option>
                  </select>

                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-9 px-2 rounded-xl bg-secondary border border-border text-xs"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Allocated">Allocated</option>
                    <option value="Partially Allocated">Partially Allocated</option>
                    <option value="Bench">Bench</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>

                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-9 px-2 rounded-xl bg-secondary border border-border text-xs"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="utilization">Sort by Util</option>
                    <option value="experience">Sort by Exp</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="text-left font-medium px-5 py-3">Resource</th>
                      <th className="text-left font-medium px-3 py-3">ID / Dept</th>
                      <th className="text-left font-medium px-3 py-3">Skills</th>
                      <th className="text-left font-medium px-3 py-3">Utilization</th>
                      <th className="text-left font-medium px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedDirectory.map((res) => (
                      <tr 
                        key={res.id}
                        onClick={() => {
                          setSelectedResource(res);
                          setProfileTab("overview");
                        }}
                        className="border-b border-border/50 hover:bg-secondary/30 transition cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-xs font-semibold text-white uppercase">
                              {res.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{res.name}</div>
                              <div className="text-[10px] text-muted-foreground">{res.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3">
                          <div className="font-medium">{res.id}</div>
                          <div className="text-[10px] text-muted-foreground">{res.dept}</div>
                        </td>
                        <td className="px-3">
                          <div className="flex gap-1 flex-wrap max-w-[180px]">
                            {res.skills.slice(0, 2).map((sk) => (
                              <span key={sk.name} className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px] font-medium">
                                {sk.name}
                              </span>
                            ))}
                            {res.skills.length > 2 && (
                              <span className="text-[9px] text-muted-foreground font-semibold">+{res.skills.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={res.util} tone={res.util > 100 ? "danger" : res.util > 75 ? "warning" : "success"} />
                            <span className="font-semibold tabular-nums w-8 text-right">{res.util}%</span>
                          </div>
                        </td>
                        <td className="px-5">
                          <StatusChip tone={getStatusTone(res.status)}>{res.status}</StatusChip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground select-none bg-secondary/5">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {filteredDirectory.length === 0 ? 0 : (currentPageDirectory - 1) * 5 + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(currentPageDirectory * 5, filteredDirectory.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">{filteredDirectory.length}</span>{" "}
                  resources
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPageDirectory === 1}
                    onClick={() => setCurrentPageDirectory(prev => Math.max(1, prev - 1))}
                    className="h-8 px-3 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card font-medium transition cursor-pointer flex items-center gap-1 select-none text-[11px]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPageDirectory >= Math.max(1, Math.ceil(filteredDirectory.length / 5))}
                    onClick={() => setCurrentPageDirectory(prev => Math.min(Math.max(1, Math.ceil(filteredDirectory.length / 5)), prev + 1))}
                    className="h-8 px-3 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card font-medium transition cursor-pointer flex items-center gap-1 select-none text-[11px]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Bench Management Dashboard */}
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Bench Management</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Unallocated workforce mitigation</p>
                </div>
                <div className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-bold uppercase">
                  Cost: ${resources.filter(r => r.status === "Bench").reduce((sum, r) => sum + r.costRate * 160, 0).toLocaleString()}/mo
                </div>
              </div>

              <div className="p-5 space-y-3 bg-card">
                {benchResources.map((res) => (
                  <div key={res.id} className="p-3 bg-secondary/20 border border-border/80 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{res.name}</div>
                      <span className="text-[9px] text-muted-foreground">Rate: ${res.costRate}/hr</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{res.role} · {res.dept}</div>
                    
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {res.skills.map(s => (
                        <span key={s.name} className="px-1 py-0.2 bg-secondary border border-border text-[9px] rounded">
                          {s.name} ({s.level})
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border/40 mt-1">
                      <button 
                        onClick={() => {
                          setAllocResourceEmail(res.email);
                          setIsAllocationModalOpen(true);
                        }}
                        className="px-2 py-1 rounded bg-primary text-white text-[10px] font-medium shadow-copper cursor-pointer"
                      >
                        Allocate
                      </button>
                      <button 
                        onClick={() => {
                          toast.info(`Upskilling request sent for ${res.name}.`);
                        }}
                        className="px-2 py-1 rounded border border-border hover:bg-secondary text-[10px] font-medium cursor-pointer"
                      >
                        Upskill
                      </button>
                    </div>
                  </div>
                ))}
                {benchResources.length === 0 && (
                  <div className="text-center py-6 italic text-muted-foreground text-xs">
                    No resources currently on the bench.
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground select-none bg-secondary/5">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {allBenchResources.length === 0 ? 0 : (currentPageBench - 1) * 5 + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(currentPageBench * 5, allBenchResources.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">{allBenchResources.length}</span>{" "}
                  items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPageBench === 1}
                    onClick={() => setCurrentPageBench(prev => Math.max(1, prev - 1))}
                    className="h-8 px-3 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card font-medium transition cursor-pointer flex items-center gap-1 select-none text-[11px]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPageBench >= Math.max(1, Math.ceil(allBenchResources.length / 5))}
                    onClick={() => setCurrentPageBench(prev => Math.min(Math.max(1, Math.ceil(allBenchResources.length / 5)), prev + 1))}
                    className="h-8 px-3 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:hover:bg-card font-medium transition cursor-pointer flex items-center gap-1 select-none text-[11px]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: SKILLS MATRIX
          ======================================================== */}
      {(activeTab as any) === "matrix" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Matrix Sheet */}
            <div className="md:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Skills & Proficiency Matrix</h3>
                  <p className="text-[10px] text-muted-foreground">Cross-workforce capability mapping</p>
                </div>
                <div className="text-[9px] text-muted-foreground flex gap-3 font-semibold">
                  <span>B: Beginner (1)</span>
                  <span>I: Intermediate (2)</span>
                  <span>A: Advanced (3)</span>
                  <span>E: Expert (4)</span>
                  <span>AR: Architect (5)</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-secondary/40 text-[10px] uppercase font-semibold text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="text-left font-medium px-4 py-3 min-w-[150px]">Resource</th>
                      {ALL_SKILLS.map(sk => (
                        <th key={sk} className="font-medium p-3">{sk}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(res => (
                      <tr key={res.id} className="border-b border-border/50 hover:bg-secondary/20 transition">
                        <td className="text-left font-medium px-4 py-3">
                          <div className="font-semibold">{res.name}</div>
                          <div className="text-[9px] text-muted-foreground truncate">{res.role}</div>
                        </td>
                        {ALL_SKILLS.map(sk => {
                          const skill = res.skills.find(s => s.name.toLowerCase() === sk.toLowerCase());
                          let display = "-";
                          let bg = "transparent";
                          let color = "#78716C";
                          if (skill) {
                            if (skill.level === "Beginner") { display = "B"; bg = "rgba(120,113,108,0.15)"; }
                            else if (skill.level === "Intermediate") { display = "I"; bg = "rgba(212,163,115,0.2)"; color = "#C67C4E"; }
                            else if (skill.level === "Advanced") { display = "A"; bg = "rgba(198,124,78,0.25)"; color = "#C67C4E"; }
                            else if (skill.level === "Expert") { display = "E"; bg = "rgba(198,124,78,0.5)"; color = "white"; }
                            else if (skill.level === "Architect") { display = "AR"; bg = "rgba(198,124,78,0.9)"; color = "white"; }
                          }
                          return (
                            <td key={sk} className="p-3">
                              <span 
                                className="inline-block size-7 rounded-md leading-7 font-bold text-[10px]"
                                style={{ backgroundColor: bg, color }}
                                title={skill ? `${skill.name} - ${skill.level} (${skill.yearsExp} yrs exp)` : "No Skill Listed"}
                              >
                                {display}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gap Analysis & Recommendation Engine */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
                <div>
                  <h3 className="font-semibold text-sm">Resource Finder</h3>
                  <p className="text-[10px] text-muted-foreground">Find matching resources based on skill metrics</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Search Skill</label>
                    <select 
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="w-full h-9 px-2 rounded-xl bg-secondary border border-border"
                    >
                      <option value="">Select a skill...</option>
                      {ALL_SKILLS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Required Proficiency Level</label>
                    <select 
                      value={skillLevelReq}
                      onChange={(e) => setSkillLevelReq(e.target.value as any)}
                      className="w-full h-9 px-2 rounded-xl bg-secondary border border-border"
                    >
                      <option value="Any">Any Level</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                      <option value="Architect">Architect</option>
                    </select>
                  </div>
                </div>

                {skillSearch && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase">Recommended Resources ({getResourceRecommendations().length})</div>
                    <div className="space-y-2">
                      {getResourceRecommendations().map(res => {
                        const sk = res.skills.find(s => s.name.toLowerCase() === skillSearch.toLowerCase());
                        return (
                          <div 
                            key={res.id} 
                            onClick={() => setSelectedResource(res)}
                            className="p-2.5 bg-secondary/30 border border-border rounded-xl flex items-center justify-between cursor-pointer hover:bg-secondary/60 transition text-xs"
                          >
                            <div>
                              <div className="font-semibold">{res.name}</div>
                              <div className="text-[9px] text-muted-foreground">{res.role}</div>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                                {sk?.level}
                              </span>
                              <div className="text-[8px] text-muted-foreground mt-0.5">{sk?.yearsExp} Years Exp</div>
                            </div>
                          </div>
                        );
                      })}
                      {getResourceRecommendations().length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No matching resources found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: PLANNER & ALLOCATIONS
          ======================================================== */}
      {(activeTab as any) === "planner" && (
        <div className="space-y-6">
          {/* Capacity and Allocations summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Total capacity", v: `${totalCapacity} hrs/wk` },
              { l: "Allocated capacity", v: `${Math.round(allocatedCapacity)} hrs/wk` },
              { l: "Remaining capacity", v: `${Math.round(remainingCapacity)} hrs/wk` },
              { l: "Overallocated staff", v: overAllocatedCount }
            ].map(k => (
              <div key={k.l} className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">{k.v}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Planner view */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Resource Allocation Planner</h3>
                  <p className="text-[10px] text-muted-foreground">Manage project assignments and workloads</p>
                </div>
                <button 
                  onClick={() => setIsAllocationModalOpen(true)}
                  className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold shadow-copper inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />New Allocation
                </button>
              </div>

              <div className="p-4 space-y-4">
                {resources.map(res => (
                  <div key={res.id} className="p-4 bg-secondary/10 border border-border rounded-xl space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-secondary grid place-items-center text-xs font-bold uppercase">
                          {res.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-semibold text-xs">{res.name}</div>
                          <div className="text-[10px] text-muted-foreground">{res.role} · {res.dept}</div>
                        </div>
                      </div>
                      
                      {/* Workload Indicator */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-semibold text-muted-foreground">Workload:</span>
                        <div className="w-24">
                          <ProgressBar value={res.util} tone={res.util > 100 ? "danger" : res.util > 80 ? "warning" : "success"} />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-8 text-right">{res.util}%</span>
                      </div>
                    </div>

                    {/* Active Allocations Timeline List */}
                    <div className="space-y-2">
                      {res.allocations.map(al => (
                        <div key={al.id} className="flex items-center justify-between p-2.5 bg-card border border-border/80 rounded-lg text-xs">
                          <div>
                            <div className="font-semibold text-foreground">{al.projectName}</div>
                            <div className="text-[10px] text-muted-foreground">Role: {al.role} · {al.startDate} to {al.endDate}</div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[9px]">
                              {al.allocationPercent}% Capacity
                            </span>
                            {al.isBillable ? (
                              <span className="text-[9px] font-semibold text-emerald-600">Billable</span>
                            ) : (
                              <span className="text-[9px] font-semibold text-stone-500">Non-Billable</span>
                            )}
                            <button 
                              onClick={() => handleReleaseResource(res.id, al.id)}
                              className="text-red-500 hover:bg-red-500/10 p-1 rounded transition text-[10px] font-medium cursor-pointer"
                            >
                              Release
                            </button>
                          </div>
                        </div>
                      ))}
                      {res.allocations.length === 0 && (
                        <div className="text-center py-2 italic text-muted-foreground text-[10px]">
                          No active allocations. Currently on bench.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation guidelines & details */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
                <h3 className="font-semibold text-sm">Allocation Schema Guidelines</h3>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="font-bold text-foreground">Full Allocation:</span>
                    <span>100% committed to a single workspace project.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-foreground">Partial Allocation:</span>
                    <span>Split capacity (e.g. 50% project A, 50% project B).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-foreground">Shared Allocation:</span>
                    <span>Cross-functional support mapping (20% or less).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-foreground">Shadow Allocation:</span>
                    <span>Non-billable trainee or junior resource tracking.</span>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl text-xs flex gap-2">
                  <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-800 dark:text-amber-400">Capacity Rule Engine</div>
                    <p className="text-amber-700/80 dark:text-amber-500/80 mt-1">If a resource allocation exceeds 100%, an instant warning banner is raised on the planner, and details are marked as over-allocated.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: TIMESHEETS
          ======================================================== */}
      {activeTab === "timesheets" && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Submit weekly timesheet */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Timesheet Entry</h3>
                <p className="text-[10px] text-muted-foreground">Log worked hours against allocated projects</p>
              </div>

              <form onSubmit={handleAddTimesheet} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Select Resource</label>
                  <select 
                    value={timesheetResourceEmail}
                    onChange={(e) => setTimesheetResourceEmail(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-secondary border border-border"
                  >
                    <option value="">Select Resource...</option>
                    {resources.filter(r => !isHumanResource(r)).map(r => (
                      <option key={r.id} value={r.email}>{r.name} ({r.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Project Name</label>
                  <select 
                    value={timesheetProject}
                    onChange={(e) => setTimesheetProject(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-secondary border border-border"
                  >
                    {filteredTimesheetProjects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Task Details</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Design QA round 3, frontend layout adjustments" 
                    value={timesheetTask}
                    onChange={(e) => setTimesheetTask(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Worked Hours</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="24"
                      value={timesheetHours}
                      onChange={(e) => setTimesheetHours(e.target.value)}
                      className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-muted-foreground">Billability</label>
                    <select 
                      value={timesheetBillable ? "yes" : "no"}
                      onChange={(e) => setTimesheetBillable(e.target.value === "yes")}
                      className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                    >
                      <option value="yes">Billable</option>
                      <option value="no">Non-Billable</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Comments / Progress description</label>
                  <textarea 
                    rows={3} 
                    placeholder="Describe deliverables accomplished..." 
                    value={timesheetComments}
                    onChange={(e) => setTimesheetComments(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full h-9 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-copper hover:opacity-90 transition cursor-pointer"
                >
                  Submit Timesheet
                </button>
              </form>
            </div>

            {/* Timesheet approval matrix */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Timesheet Review Board</h3>
                  <p className="text-[10px] text-muted-foreground">Approve or reject submitted log timesheets</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {resources.map(res => {
                  const pendingEntries = res.timesheets.filter(ts => ts.status === "Submitted");
                  if (pendingEntries.length === 0) return null;

                  return (
                    <div key={res.id} className="p-3 bg-secondary/10 border border-border rounded-xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <div className="size-6 rounded-full bg-secondary grid place-items-center text-[10px] font-bold uppercase">
                          {res.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="font-semibold text-xs">{res.name} ({res.role})</span>
                      </div>

                      <div className="space-y-2">
                        {pendingEntries.map(entry => (
                          <div key={entry.id} className="p-3 bg-card border border-border/80 rounded-lg text-xs space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold">{entry.projectName}</div>
                                <div className="text-[10px] text-muted-foreground">Task: {entry.taskName}</div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-foreground">{entry.hours} hrs</span>
                                <div className="text-[9px] text-muted-foreground">{entry.isBillable ? "Billable" : "Non-Billable"}</div>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic bg-secondary/40 p-2 rounded-md">
                              "{entry.comments || "No comments."}"
                            </p>
                            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                              <button 
                                onClick={() => handleTimesheetStatusChange(res.id, entry.id, "Rejected")}
                                className="px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-500/10 text-[10px] font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => handleTimesheetStatusChange(res.id, entry.id, "Approved")}
                                className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-semibold cursor-pointer"
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {resources.every(r => r.timesheets.filter(ts => ts.status === "Submitted").length === 0) && (
                  <div className="text-center py-12 text-muted-foreground text-xs italic">
                    All submitted timesheets reviewed. Clean sheet!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: BILLING & REVENUE
          ======================================================== */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Revenue calculations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Billing generated */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Accumulated Billable Revenue</h4>
              <div className="text-3xl font-bold text-foreground">
                ${resources.reduce((sum, res) => {
                  const billableHours = res.timesheets.filter(ts => ts.status === "Approved" && ts.isBillable).reduce((h, ts) => h + ts.hours, 0);
                  return sum + (billableHours * res.billingRate);
                }, 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground">Calculated as (Billable Hours * Billing Rate) from approved timesheets</p>
            </div>

            {/* Total Resource cost */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Resource Costs</h4>
              <div className="text-3xl font-bold text-foreground">
                ${resources.reduce((sum, res) => {
                  const approvedHours = res.timesheets.filter(ts => ts.status === "Approved").reduce((h, ts) => h + ts.hours, 0);
                  return sum + (approvedHours * res.costRate);
                }, 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground">Calculated as (Total Approved Hours * Cost Rate)</p>
            </div>

            {/* Total Net Profit margin */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-card space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Net Profit Contribution Margin</h4>
              <div className="text-3xl font-bold text-emerald-600">
                {(() => {
                  const rev = resources.reduce((sum, res) => {
                    const billableHours = res.timesheets.filter(ts => ts.status === "Approved" && ts.isBillable).reduce((h, ts) => h + ts.hours, 0);
                    return sum + (billableHours * res.billingRate);
                  }, 0);
                  const cost = resources.reduce((sum, res) => {
                    const approvedHours = res.timesheets.filter(ts => ts.status === "Approved").reduce((h, ts) => h + ts.hours, 0);
                    return sum + (approvedHours * res.costRate);
                  }, 0);
                  const profit = rev - cost;
                  const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0;
                  return `${margin}%`;
                })()}
              </div>
              <p className="text-[10px] text-muted-foreground">Reflects general utilization margins and rates efficiency</p>
            </div>
          </div>

          {/* Revenue Contribution per Project Collapsible Folders */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm">Project-Wise Revenue Matrix</h3>
              <p className="text-[10px] text-muted-foreground">Detailed financial and utilization breakdown grouped by project</p>
            </div>

            <div className="space-y-3">
              {projects.map(p => {
                // For this project, gather all resources and their timesheets on this project
                const contribs = resources.map(res => {
                  const projTimesheets = res.timesheets.filter(ts => 
                    ts.status === "Approved" && 
                    ts.projectName === p.name
                  );
                  const billableHours = projTimesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + ts.hours, 0);
                  const totalHours = projTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
                  const revenue = billableHours * res.billingRate;
                  const cost = totalHours * res.costRate;
                  
                  return {
                    resource: res,
                    billableHours,
                    totalHours,
                    revenue,
                    cost
                  };
                }).filter(c => c.totalHours > 0); // only keep resources with logged hours

                const totalBillableHours = contribs.reduce((sum, c) => sum + c.billableHours, 0);
                const totalRevenue = contribs.reduce((sum, c) => sum + c.revenue, 0);
                const totalCost = contribs.reduce((sum, c) => sum + c.cost, 0);
                const isExpanded = !!expandedProjects[p.id];

                return (
                  <div key={p.id} className="border border-border rounded-xl bg-card overflow-hidden shadow-sm transition-all duration-200">
                    {/* Folder Header */}
                    <div 
                      onClick={() => setExpandedProjects(prev => ({ ...prev, [p.id]: !isExpanded }))}
                      className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition select-none bg-secondary/10"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <FolderOpen className="size-5 text-primary" />
                        ) : (
                          <Folder className="size-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-semibold text-sm text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">Code: {p.code} · Manager: {p.projectManager}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Project Billings</div>
                          <div className="text-sm font-semibold text-emerald-600">${totalRevenue.toLocaleString()}</div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Resource Costs</div>
                          <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">${totalCost.toLocaleString()}</div>
                        </div>
                        <div className="text-right hidden md:block">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Hours Logged</div>
                          <div className="text-sm font-semibold text-foreground">{totalBillableHours} hrs</div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Folder Contents */}
                    {isExpanded && (
                      <div className="border-t border-border bg-card">
                        {contribs.length === 0 ? (
                          <div className="p-5 text-center text-xs text-muted-foreground italic">
                            No billing records found for this project.
                          </div>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="bg-secondary/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                              <tr className="border-b border-border">
                                <th className="text-left font-medium px-5 py-2">Resource Name</th>
                                <th className="text-center font-medium px-3 py-2">Billable Hours</th>
                                <th className="text-center font-medium px-3 py-2">Billing Rate</th>
                                <th className="text-center font-medium px-3 py-2">Cost Rate</th>
                                <th className="text-right font-medium px-5 py-2">Billings Generated</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contribs.map(c => (
                                <tr key={c.resource.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/10 transition">
                                  <td className="px-5 py-2.5">
                                    <div className="font-semibold">{c.resource.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{c.resource.role}</div>
                                  </td>
                                  <td className="text-center font-medium tabular-nums">{c.billableHours} hrs</td>
                                  <td className="text-center font-medium tabular-nums">${c.resource.billingRate}/hr</td>
                                  <td className="text-center font-medium tabular-nums">${c.resource.costRate}/hr</td>
                                  <td className="text-right px-5 font-semibold text-emerald-600">${c.revenue.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: ANALYTICS REPORTS
          ======================================================== */}
      {(activeTab as any) === "analytics" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Chart 1: Utilization Distribution */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Workforce Utilization Distribution</h3>
                <p className="text-[10px] text-muted-foreground">Percentage categorization based on workloads</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilizationPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {utilizationPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Department Utilization */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Department Utilization Comparison</h3>
                <p className="text-[10px] text-muted-foreground">Average resource utilization rate by functional area</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip />
                    <Bar dataKey="utilization" fill="#C67C4E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD RESOURCE DIALOG/MODAL
          ======================================================== */}
      {isAddModalOpen && (() => {
        const weeklyCost = (Number(empCostRate) || 0) * (Number(empAvailability) || 0);
        const monthlyCost = weeklyCost * 4.33;
        const weeklyRevenue = (Number(empBillingRate) || 0) * (Number(empAvailability) || 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />

            {/* Form Container */}
            <div className="relative bg-[#0A0A0A] border border-white/5 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-stone-100 flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-3.5 border-b border-white/5 bg-[#0D0D0D] flex items-center justify-between">
                <div className="flex gap-3 items-center">
                  <div className="size-9 rounded-xl bg-[#C8844A]/10 border border-[#C8844A]/20 flex items-center justify-center shrink-0">
                    <UserPlus className="size-4.5 text-[#C8844A]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-100 text-[15px] tracking-tight">Add New Resource Profile</h3>
                    <p className="text-[10px] text-stone-500 mt-0.5">Create a new resource profile to manage and track your organization resources.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-1.5 rounded-lg hover:bg-stone-900 text-stone-500 hover:text-stone-300 transition cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Steps Progress */}
              <div className="flex items-center justify-center gap-6 py-2.5 border-b border-white/5 bg-[#0E0E0E] text-[11px] font-semibold text-stone-400">
                {/* Step 1: Basic Details */}
                <div 
                  onClick={() => setAddFormTab("basic")}
                  className="flex items-center gap-2 cursor-pointer hover:text-stone-250 transition"
                >
                  {addFormTab === "basic" ? (
                    <span className="size-5 rounded-full bg-[#C8844A] text-white flex items-center justify-center text-[10px]">1</span>
                  ) : (
                    <span className="size-5 rounded-full bg-[#C8844A]/25 text-[#C8844A] border border-[#C8844A]/40 flex items-center justify-center text-[10px]">✓</span>
                  )}
                  <span className={addFormTab === "basic" ? "text-[#C8844A]" : "text-stone-450"}>Basic Details</span>
                </div>
                
                <div className={`h-0.5 w-16 ${addFormTab !== "basic" ? "bg-[#C8844A]" : "bg-white/5"}`} />

                {/* Step 2: Cost & Hours */}
                <div 
                  onClick={() => setAddFormTab("cost")}
                  className="flex items-center gap-2 cursor-pointer hover:text-stone-250 transition"
                >
                  {addFormTab === "cost" ? (
                    <span className="size-5 rounded-full bg-[#C8844A] text-white flex items-center justify-center text-[10px]">2</span>
                  ) : (addFormTab === "skills" ? (
                    <span className="size-5 rounded-full bg-[#C8844A]/25 text-[#C8844A] border border-[#C8844A]/40 flex items-center justify-center text-[10px]">✓</span>
                  ) : (
                    <span className="size-5 rounded-full border border-white/5 text-stone-500 flex items-center justify-center text-[10px]">2</span>
                  ))}
                  <span className={addFormTab === "cost" ? "text-[#C8844A]" : "text-stone-450"}>Cost & Hours</span>
                </div>

                <div className={`h-0.5 w-16 ${addFormTab === "skills" ? "bg-[#C8844A]" : "bg-white/5"}`} />

                {/* Step 3: Skills Profile */}
                <div 
                  onClick={() => setAddFormTab("skills")}
                  className="flex items-center gap-2 cursor-pointer hover:text-stone-250 transition"
                >
                  {addFormTab === "skills" ? (
                    <span className="size-5 rounded-full bg-[#C8844A] text-white flex items-center justify-center text-[10px]">3</span>
                  ) : (
                    <span className="size-5 rounded-full border border-white/5 text-stone-500 flex items-center justify-center text-[10px]">3</span>
                  )}
                  <span className={addFormTab === "skills" ? "text-[#C8844A]" : "text-stone-450"}>Skills Profile</span>
                </div>
              </div>

              {/* Two Column Layout Container */}
              <form onSubmit={handleSaveResource} className="flex flex-col md:flex-row h-[430px]">
                {/* Left Column (Inputs) */}
                <div className="w-full md:w-[65%] p-5 overflow-y-auto border-r border-white/5 space-y-3.5 text-xs scrollbar-none" style={{ scrollbarWidth: "none" }}>
                  {addFormTab === "basic" && (
                    <div className="space-y-3.5 animate-in fade-in duration-200">
                      {/* Resource Name & Verify with AI */}
                      <div className="space-y-1">
                        <label className="font-semibold text-stone-300">Resource Name *</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-stone-500 pointer-events-none">
                            <Cloud className="size-4" />
                          </span>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Azure Virtual Machine"
                            value={empName}
                            onChange={(e) => setEmpName(e.target.value)}
                            className="w-full h-11 pl-10 pr-32 bg-stone-900/40 border border-white/5 text-stone-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 placeholder:text-stone-500 transition-all duration-200"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyWithAI}
                            disabled={isVerifying || !empName}
                            className="absolute right-1.5 h-8 px-3 rounded-lg bg-[#C8844A] hover:bg-[#D89A63] text-[10.5px] text-white font-semibold inline-flex items-center gap-1.5 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Sparkles className="size-3 text-white animate-pulse" />
                            Verify with AI
                          </button>
                        </div>
                        <span className="text-[10px] text-stone-500 block">Enter a unique and descriptive name for this resource.</span>
                      </div>

                      {/* Row 1: Resource Type & Department */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Resource Type / Specification *</label>
                          <DarkSelect
                            value={empDesignation}
                            onValueChange={setEmpDesignation}
                            placeholder="Select Type..."
                            leftIcon={<Wrench className="size-4" />}
                            options={DESIGNATION_OPTIONS}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Department / Team *</label>
                          <DarkSelect
                            value={empDept}
                            onValueChange={setEmpDept}
                            placeholder="Select Department..."
                            leftIcon={<Layers className="size-4" />}
                            options={DEPT_OPTIONS}
                          />
                        </div>
                      </div>

                      {/* Row 2: Manager & Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Manager / Owner *</label>
                          <DarkSelect
                            value={empManager}
                            onValueChange={setEmpManager}
                            placeholder="Select Manager..."
                            leftIcon={<User className="size-4" />}
                            options={MANAGER_OPTIONS}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Resource Status *</label>
                          <DarkSelect
                            value={empStatus}
                            onValueChange={setEmpStatus}
                            placeholder="Select Status..."
                            leftIcon={<CheckCircle className="size-4" />}
                            options={STATUS_OPTIONS}
                          />
                        </div>
                      </div>

                      {/* Project Assignment */}
                      <div className="space-y-1">
                        <label className="font-semibold text-stone-300">Project Assignment *</label>
                        <DarkSelect
                          value={empProjectAssignment}
                          onValueChange={setEmpProjectAssignment}
                          placeholder="Select Project..."
                          leftIcon={<Briefcase className="size-4" />}
                          options={PROJECT_OPTIONS}
                        />
                        <span className="text-[10px] text-stone-500 block">Assign this resource to a project during provisioning.</span>
                      </div>

                      {/* Resource Description */}
                      <div className="space-y-1">
                        <label className="font-semibold text-stone-300">Resource Description</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-stone-500 pointer-events-none">
                            <FileText className="size-4" />
                          </span>
                          <textarea
                            placeholder="Provide a brief description about this resource and its purpose."
                            value={empDescription}
                            onChange={(e) => setEmpDescription(e.target.value)}
                            className="w-full h-20 pl-10 pr-4 py-2 bg-stone-900/40 border border-white/5 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 resize-none transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {addFormTab === "cost" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Grid matching exact layout */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Cost Rate & Currency */}
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Cost Rate ($ / hr) *</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-semibold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={empCostRate}
                              onChange={(e) => setEmpCostRate(e.target.value)}
                              className="w-full h-11 pl-8 pr-3 bg-stone-900/40 border border-white/5 text-stone-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 placeholder:text-stone-500 transition-all duration-200"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Currency *</label>
                          <DarkSelect
                            value={empCurrency}
                            onValueChange={setEmpCurrency}
                            placeholder="Select Currency..."
                            options={CURRENCY_OPTIONS}
                          />
                        </div>

                        {/* Resource Category & Billing Rate */}
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Resource Category *</label>
                          <DarkSelect
                            value={empCategory}
                            onValueChange={setEmpCategory}
                            placeholder="Select Category..."
                            leftIcon={<Server className="size-4" />}
                            options={CATEGORY_OPTIONS}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Billing Rate ($ / hr) *</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-semibold">$</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={empBillingRate}
                              onChange={(e) => setEmpBillingRate(e.target.value)}
                              className="w-full h-11 pl-8 pr-10 bg-stone-900/40 border border-white/5 text-stone-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 placeholder:text-stone-500 transition-all duration-200"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">
                              <Tag className="size-4" />
                            </span>
                          </div>
                        </div>

                        {/* Availability & Provisioning Date */}
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Availability (hrs / wk) *</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">
                              <Clock className="size-4" />
                            </span>
                            <input
                              type="number"
                              min="1"
                              max="168"
                              value={empAvailability}
                              onChange={(e) => setEmpAvailability(e.target.value)}
                              className="w-full h-11 pl-10 pr-3 bg-stone-900/40 border border-white/5 text-stone-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 placeholder:text-stone-500 transition-all duration-200"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-stone-300">Provisioning Date *</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">
                              <Calendar className="size-4" />
                            </span>
                            <input
                              type="date"
                              required
                              value={empJoinDate}
                              onChange={(e) => setEmpJoinDate(e.target.value)}
                              className="w-full h-11 pl-10 pr-3 bg-stone-900/40 border border-white/5 text-stone-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 placeholder:text-stone-500 transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Calculated Resource Economics */}
                      <div className="pt-3.5 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-stone-300 font-semibold">
                          <DollarSign className="size-4 text-[#C8844A]" />
                          <span className="text-[11px] tracking-wider uppercase font-bold text-stone-400">CALCULATED RESOURCE ECONOMICS</span>
                          <span className="text-[9.5px] text-stone-500 font-normal ml-auto">Real-time Estimation</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[#151515] border border-white/5 p-3 rounded-xl space-y-0.5">
                            <div className="text-[9px] uppercase font-semibold text-stone-500">Weekly Cost</div>
                            <div className="text-base font-bold tracking-tight text-[#C8844A]">${weeklyCost.toFixed(2)}</div>
                          </div>
                          <div className="bg-[#151515] border border-white/5 p-3 rounded-xl space-y-0.5">
                            <div className="text-[9px] uppercase font-semibold text-stone-500">Monthly Cost</div>
                            <div className="text-base font-bold tracking-tight text-stone-100">${monthlyCost.toFixed(2)}</div>
                          </div>
                          <div className="bg-[#151515] border border-white/5 p-3 rounded-xl space-y-0.5">
                            <div className="text-[9px] uppercase font-semibold text-stone-500">Weekly Rev</div>
                            <div className="text-base font-bold tracking-tight text-emerald-400">${weeklyRevenue.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {addFormTab === "skills" && (
                    <div className="space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center pb-1">
                        <span className="font-semibold text-stone-300">Skills Directory Mapping</span>
                        <button 
                          type="button" 
                          onClick={addSkillToForm}
                          className="px-2.5 py-1.5 bg-[#1A1A1A] border border-white/5 rounded-lg flex items-center gap-1 hover:bg-[#252525] text-stone-250 transition text-[11px] cursor-pointer"
                        >
                          <Plus className="size-3 text-[#C8844A]" />Add Skill
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-[270px] overflow-y-auto pr-1">
                        {formSkills.map((sk, idx) => (
                          <div key={idx} className="p-3.5 bg-stone-900/20 border border-white/5 rounded-xl grid grid-cols-3 gap-3 relative">
                            <div className="space-y-1 col-span-2">
                              <label className="text-[9px] uppercase font-bold text-stone-400">Skill Name</label>
                              <DarkSelect 
                                value={sk.name}
                                onValueChange={(val) => {
                                  const newSk = [...formSkills];
                                  newSk[idx].name = val;
                                  setFormSkills(newSk);
                                }}
                                size="sm"
                                options={ALL_SKILLS.map(s => ({ value: s, label: s }))}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-stone-400">Proficiency</label>
                              <DarkSelect 
                                value={sk.level}
                                onValueChange={(val) => {
                                  const newSk = [...formSkills];
                                  newSk[idx].level = val as any;
                                  setFormSkills(newSk);
                                }}
                                size="sm"
                                options={PROFICIENCY_OPTIONS}
                              />
                            </div>

                            <div className="space-y-1 col-span-2">
                              <label className="text-[9px] uppercase font-bold text-stone-400">Certification Name</label>
                              <input 
                                type="text" 
                                placeholder="Optional" 
                                value={sk.certification || ""}
                                onChange={(e) => {
                                  const newSk = [...formSkills];
                                  newSk[idx].certification = e.target.value;
                                  setFormSkills(newSk);
                                }}
                                className="w-full h-9 px-3.5 bg-[#1A1A1A] border border-white/5 text-stone-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50 placeholder:text-stone-600"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-stone-400">Experience (Yrs)</label>
                              <input 
                                type="number" 
                                value={sk.yearsExp}
                                onChange={(e) => {
                                  const newSk = [...formSkills];
                                  newSk[idx].yearsExp = Number(e.target.value) || 1;
                                  setFormSkills(newSk);
                                }}
                                className="w-full h-9 px-3.5 bg-[#1A1A1A] border border-white/5 text-stone-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C8844A] focus:border-[#C8844A]/50"
                              />
                            </div>

                            {formSkills.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeSkillFromForm(idx)}
                                className="absolute right-2 top-2 text-red-500 hover:bg-red-500/10 p-0.5 rounded cursor-pointer"
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column (Resource Preview) */}
                <div className="w-full md:w-[35%] p-5 bg-[#0C0C0C] overflow-y-auto space-y-4 flex flex-col justify-start">
                  <div className="flex items-center gap-1.5 text-stone-500 font-bold text-[9.5px] uppercase tracking-wider">
                    <Eye className="size-3.5" />
                    <span>Resource Preview</span>
                  </div>

                  {/* Preview Avatar card */}
                  <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2.5 relative overflow-hidden shadow-xl">
                    <div className="size-14 rounded-2xl bg-[#1A1A1A] border border-white/5 flex items-center justify-center relative shadow-sm">
                      <Cloud className="size-7 text-[#C8844A]" />
                      <span className="absolute bottom-1 right-1 size-4 rounded bg-[#C8844A]/10 border border-[#C8844A]/30 text-[#C8844A] flex items-center justify-center text-[8px] font-bold">
                        📦
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-stone-100 text-[13px] tracking-tight truncate max-w-[190px]">{empName || "Resource Name"}</h4>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-semibold text-emerald-500">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{empStatus || "Available"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preview Table details */}
                  <div className="space-y-2.5 text-[10.5px] pt-1.5 flex-1">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-stone-500 font-medium">Department / Team</span>
                      <span className="font-medium text-stone-300">{empDept}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-stone-500 font-medium">Manager / Owner</span>
                      <span className="font-medium text-stone-300">{empManager || "Yogesh V"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-stone-500 font-medium">Type / Specification</span>
                      <span className="font-medium text-stone-300 truncate max-w-[120px]">{empDesignation || "Other Cloud Service"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-stone-500 font-medium">Assigned Project</span>
                      <span className="font-semibold text-[#C8844A]">{empProjectAssignment || "UVANTHU"}</span>
                    </div>
                    
                    {addFormTab === "basic" ? (
                      <>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-stone-500 font-medium">Availability</span>
                          <span className="font-medium text-stone-300">{empAvailability} hrs/wk</span>
                        </div>
                        {/* Skills Mapped */}
                        <div className="pt-2.5 space-y-1.5">
                          <span className="text-stone-500 font-medium block">Skills Mapped ({formSkills.length})</span>
                          <div className="flex flex-wrap gap-1">
                            {formSkills.map((sk, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-[#C8844A]/10 text-[#C8844A] border border-[#C8844A]/20 text-[9px] font-medium transition duration-200">
                              {sk.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-stone-500 font-medium">Cost Rate</span>
                          <span className="font-medium text-stone-300">${Number(empCostRate || 0).toFixed(2)}/hr</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                          <span className="text-stone-500 font-medium">Availability</span>
                          <span className="font-medium text-stone-300">{empAvailability} hrs/wk</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </form>

              {/* Action buttons (Modal Footer) */}
              <div className="px-6 py-3 border-t border-white/5 flex justify-between bg-[#0B0B0B] text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 px-4.5 rounded-xl border border-white/5 text-stone-300 font-semibold hover:bg-stone-900 transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                {addFormTab === "basic" ? (
                  <button 
                    type="button" 
                    onClick={() => setAddFormTab("cost")}
                    className="h-10 px-4.5 rounded-xl bg-gradient-to-r from-[#C8844A] to-[#D89A63] hover:from-[#D89A63] hover:to-[#E8AA7C] text-white font-semibold shadow-md active:scale-95 transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    Continue <ArrowRight className="size-3.5" />
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={(e) => {
                      const mockEvent = { preventDefault: () => {} } as any;
                      handleSaveResource(mockEvent);
                    }}
                    className="h-10 px-4.5 rounded-xl bg-gradient-to-r from-[#C8844A] to-[#D89A63] hover:from-[#D89A63] hover:to-[#E8AA7C] text-white font-semibold shadow-md active:scale-95 transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {addFormTab === "cost" ? "Continue" : "Save Resource"} {addFormTab === "cost" && <ArrowRight className="size-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          ALLOCATE TO PROJECTS MODAL
          ======================================================== */}
      {isAllocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAllocationModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="font-semibold text-foreground">Allocate Resource to Project</h3>
              <button 
                onClick={() => setIsAllocationModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddAllocation} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Select Project</label>
                <select 
                  value={allocProjectName}
                  onChange={(e) => setAllocProjectName(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  <option value="Atlas Banking Platform">Atlas Banking Platform</option>
                  <option value="Helix CRM Migration">Helix CRM Migration</option>
                  <option value="Nimbus Data Lake">Nimbus Data Lake</option>
                  <option value="Mosaic Mobile Suite">Mosaic Mobile Suite</option>
                  <option value="Lumen Customer 360">Lumen Customer 360</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Allocate Resource</label>
                <select 
                  value={allocResourceEmail}
                  onChange={(e) => setAllocResourceEmail(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  <option value="">Select Resource...</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.email}>{r.name} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Project Role</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Lead Dev, Designer" 
                    value={allocRole}
                    onChange={(e) => setAllocRole(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Allocation Percentage (%)</label>
                  <input 
                    type="number" 
                    min="10" 
                    max="100" 
                    value={allocPercent}
                    onChange={(e) => setAllocPercent(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Start Date</label>
                  <input 
                    type="date" 
                    required 
                    value={allocStart}
                    onChange={(e) => setAllocStart(e.target.value)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">End Date</label>
                  <input 
                    type="date" 
                    required 
                    value={allocEnd}
                    onChange={(e) => setAllocEnd(e.target.value)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Billing Status</label>
                <select 
                  value={allocBillable ? "yes" : "no"}
                  onChange={(e) => setAllocBillable(e.target.value === "yes")}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  <option value="yes">Billable</option>
                  <option value="no">Non-Billable</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Remarks / Allocation Scope</label>
                <input 
                  type="text" 
                  placeholder="Core deliverables responsibilities..." 
                  value={allocRemarks}
                  onChange={(e) => setAllocRemarks(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAllocationModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border hover:bg-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-copper hover:opacity-90"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          RESOURCE DETAILS DRAWER PANEL
          ======================================================== */}
      {selectedResource && (
        <div className="fixed inset-0 flex items-center justify-end" style={{ zIndex: 100 }}>
          {/* Backdrop */}
          <div onClick={() => setSelectedResource(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

          {/* Drawer Body */}
          <div className="relative bg-card border-l border-border h-full w-full max-w-lg shadow-elevated flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-primary" />
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Resource Details</span>
              </div>
              <button 
                onClick={() => setSelectedResource(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Profile top details */}
            <div className="px-6 py-5 border-b border-border/60 flex items-center gap-4 bg-secondary/10">
              <div className="size-14 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-lg font-bold text-white uppercase shrink-0">
                {selectedResource.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold truncate text-foreground">{selectedResource.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{selectedResource.role} · {selectedResource.dept}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="px-2 py-0.5 bg-secondary border border-border text-[9px] rounded font-semibold text-muted-foreground">
                    {selectedResource.employmentType}
                  </span>
                  <StatusChip tone={getStatusTone(selectedResource.status)}>{selectedResource.status}</StatusChip>
                </div>
              </div>
            </div>

            {/* Drawer Sub tabs navigation */}
            <div className="flex border-b border-border text-[11px] font-semibold overflow-x-auto bg-secondary/5 px-4">
              {[
                { id: "overview", label: "Overview" },
                { id: "skills", label: "Skills" },
                { id: "allocations", label: "Allocations" },
                { id: "utilization", label: "Utilization" },
                { id: "billing", label: "Billing" },
                { id: "history", label: "Timesheets" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setProfileTab(t.id as any)}
                  className={`px-3 py-2 border-b-2 whitespace-nowrap transition cursor-pointer ${profileTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* TAB: Overview */}
              {profileTab === "overview" && (
                <div className="space-y-4">
                  <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Contact & Admin details</h4>
                    <div className="grid grid-cols-2 gap-y-2.5">
                      <div className="text-muted-foreground">Employee ID:</div>
                      <div className="font-semibold text-right">{selectedResource.id}</div>
                      <div className="text-muted-foreground">Email Address:</div>
                      <div className="font-semibold text-right truncate">{selectedResource.email}</div>
                      <div className="text-muted-foreground">Phone Number:</div>
                      <div className="font-semibold text-right">{selectedResource.phone}</div>
                      <div className="text-muted-foreground">Location:</div>
                      <div className="font-semibold text-right">{selectedResource.location}</div>
                      <div className="text-muted-foreground">Reports Manager:</div>
                      <div className="font-semibold text-right">{selectedResource.manager}</div>
                      <div className="text-muted-foreground">Joining Date:</div>
                      <div className="font-semibold text-right">{selectedResource.joiningDate}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Skills */}
              {profileTab === "skills" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Skills matrix competencies</h4>
                  <div className="space-y-2">
                    {selectedResource.skills.map((sk, i) => (
                      <div key={i} className="p-3 bg-secondary/20 border border-border rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">{sk.name}</div>
                          {sk.certification && (
                            <div className="text-[9px] text-muted-foreground mt-0.5">Cert: {sk.certification}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-bold">
                            {sk.level}
                          </span>
                          <div className="text-[9px] text-muted-foreground mt-1">{sk.yearsExp} Years Experience</div>
                        </div>
                      </div>
                    ))}
                    {selectedResource.skills.length === 0 && (
                      <p className="text-center italic text-muted-foreground">No skills mapped to this resource.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Allocations */}
              {profileTab === "allocations" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Active project allocations</h4>
                  <div className="space-y-3">
                    {selectedResource.allocations.map(al => (
                      <div key={al.id} className="p-3.5 bg-secondary/25 border border-border rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{al.projectName}</div>
                            <div className="text-[10px] text-muted-foreground">{al.startDate} to {al.endDate}</div>
                          </div>
                          <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded font-bold text-[10px]">
                            {al.allocationPercent}%
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                          <span>Role: {al.role}</span>
                          <span>{al.isBillable ? "Billable" : "Non-billable"}</span>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button 
                            onClick={() => handleReleaseResource(selectedResource.id, al.id)}
                            className="px-2 py-0.5 rounded text-red-500 hover:bg-red-500/10 text-[10px] font-semibold cursor-pointer"
                          >
                            Release from Project
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedResource.allocations.length === 0 && (
                      <p className="text-center italic text-muted-foreground">Currently not assigned to any projects.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Utilization */}
              {profileTab === "utilization" && (
                <div className="space-y-4">
                  <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-4">
                    <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Capacity & Workload summary</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span>Allocated Hours vs Availability:</span>
                        <span>{Math.round(selectedResource.availabilityHrsWk * (selectedResource.util / 100))} / {selectedResource.availabilityHrsWk} hrs/wk</span>
                      </div>
                      <ProgressBar value={selectedResource.util} tone={selectedResource.util > 100 ? "danger" : selectedResource.util > 80 ? "warning" : "success"} />
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 pt-2 text-[11px]">
                      <div className="text-muted-foreground">Capacity Status:</div>
                      <div className="font-bold text-right text-foreground">
                        {selectedResource.util === 0 ? "Underutilized" : selectedResource.util > 100 ? "Overallocated" : selectedResource.util >= 90 ? "Fully Utilized" : "Optimal"}
                      </div>
                      <div className="text-muted-foreground">Remaining capacity:</div>
                      <div className="font-bold text-right text-foreground">
                        {Math.max(0, selectedResource.availabilityHrsWk - Math.round(selectedResource.availabilityHrsWk * (selectedResource.util / 100)))} hrs/wk
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Billing */}
              {profileTab === "billing" && (
                <div className="space-y-4">
                  <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Financial rate matrix</h4>
                    <div className="grid grid-cols-2 gap-y-2.5">
                      <div className="text-muted-foreground">Billing Rate:</div>
                      <div className="font-semibold text-right">${selectedResource.billingRate} / hour</div>
                      <div className="text-muted-foreground">Internal Cost Rate:</div>
                      <div className="font-semibold text-right">${selectedResource.costRate} / hour</div>
                      <div className="text-muted-foreground">Weekly Revenue potential:</div>
                      <div className="font-semibold text-right text-emerald-600">
                        ${(selectedResource.availabilityHrsWk * (selectedResource.util / 100) * selectedResource.billingRate).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Timesheets History */}
              {profileTab === "history" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Submitted log entries</h4>
                  <div className="space-y-2">
                    {selectedResource.timesheets.map(ts => (
                      <div key={ts.id} className="p-3 bg-secondary/20 border border-border rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold">{ts.projectName}</div>
                          <div className="text-[10px] text-muted-foreground">Task: {ts.taskName} · {ts.date}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground">{ts.hours} hrs</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              ts.status === "Approved" ? "bg-emerald-500/10 text-emerald-600" :
                              ts.status === "Rejected" ? "bg-red-500/10 text-red-500" :
                              "bg-amber-500/10 text-amber-500"
                            }`}>
                              {ts.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedResource.timesheets.length === 0 && (
                      <p className="text-center italic text-muted-foreground">No timesheet records submitted.</p>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="p-6 border-t border-border bg-secondary/5 flex gap-2">
              <button 
                onClick={() => setSelectedResource(null)}
                className="w-full h-9 rounded-xl border border-border hover:bg-secondary text-xs font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
