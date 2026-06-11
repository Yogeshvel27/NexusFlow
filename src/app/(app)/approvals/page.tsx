"use client";

import React, { useState, useEffect } from "react";
import { Check, Clock, X, MessageSquare, Plus, User, FileText, Sparkles, DollarSign, Layers } from "lucide-react";
import { StatusChip, statusTone } from "@/components/status-chip";
import { formatCurrency } from "@/lib/mock";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// ==========================================
// TYPES
// ==========================================

export interface ApprovalRequest {
  id: string;
  type: "Change Request" | "Budget Increase" | "Resource Request" | "Milestone Sign-off" | "Vendor Onboarding";
  project: string;
  requester: string;
  stage: "Draft" | "Manager Review" | "PMO Review" | "Finance Review" | "Approved" | "Rejected";
  amount: number;
  submitted: string;
  description: string;
}

export interface AuditLog {
  who: string;
  what: string;
  target: string;
  when: string;
}

const STAGES = ["Draft", "Manager Review", "PMO Review", "Finance Review", "Approved"];

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: "APR-3201",
    type: "Change Request",
    project: "Atlas Banking Platform",
    requester: "Sasha Reyes",
    stage: "PMO Review",
    amount: 84000,
    submitted: "2d ago",
    description: "Scope extension for OAuth2 multi-factor authentication setup."
  },
  {
    id: "APR-3198",
    type: "Budget Increase",
    project: "Helix CRM Migration",
    requester: "Marcus Lee",
    stage: "Finance Review",
    amount: 120000,
    submitted: "1d ago",
    description: "Server migration cloud consumption buffer overruns."
  },
  {
    id: "APR-3194",
    type: "Resource Request",
    project: "Quartz Identity Service",
    requester: "Daniel Otieno",
    stage: "Manager Review",
    amount: 0,
    submitted: "4h ago",
    description: "Requesting additional QA Lead allocation for final penetration sweeps."
  },
  {
    id: "APR-3190",
    type: "Milestone Sign-off",
    project: "Mosaic Mobile Suite",
    requester: "Elena Voss",
    stage: "Approved",
    amount: 0,
    submitted: "Yesterday",
    description: "Wireframe layouts and interactive component prototypes completed."
  },
  {
    id: "APR-3187",
    type: "Vendor Onboarding",
    project: "Nimbus Data Lake",
    requester: "Priya Shah",
    stage: "Draft",
    amount: 0,
    submitted: "3d ago",
    description: "Onboarding Snowflake integration specialists contract."
  }
];

const INITIAL_AUDITS: AuditLog[] = [
  { who: "Hana Müller", what: "approved", target: "APR-3198 budget increase", when: "12m ago" },
  { who: "Marcus Lee", what: "submitted", target: "APR-3198 to Finance", when: "1h ago" },
  { who: "Evelyn Marsh", what: "commented", target: "Need scope clarification", when: "3h ago" },
  { who: "Sasha Reyes", what: "advanced", target: "APR-3201 to PMO", when: "1d ago" },
  { who: "Yuki Tanaka", what: "rejected", target: "APR-3170 vendor contract", when: "2d ago" }
];

// Map stages to required roles for approval simulation
const STAGE_REQUIRED_ROLES: Record<string, string[]> = {
  "Draft": ["Admin", "Project Manager", "Team Member"],
  "Manager Review": ["Admin", "Resource Manager", "Department Head"],
  "PMO Review": ["Admin", "Project Manager", "Department Head"],
  "Finance Review": ["Admin", "Finance Team"],
  "Approved": []
};

function Approvals() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeFilter, setActiveFilter] = useState<"All" | "Mine" | "Awaiting me">("Awaiting me");
  
  // Simulating the user's role from Clerk
  const [actingRole, setActingRole] = useState<string>("Admin");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  // New Request Form State
  const [reqType, setReqType] = useState<ApprovalRequest['type']>("Change Request");
  const [reqProject, setReqProject] = useState("Atlas Banking Platform");
  const [reqRequester, setReqRequester] = useState("Yogesh V");
  const [reqAmount, setReqAmount] = useState("");
  const [reqDesc, setReqDesc] = useState("");

  // Comment Form State
  const [commentText, setCommentText] = useState("");

  // Load from Supabase, with local storage fallback
  useEffect(() => {
    async function loadApprovals() {
      try {
        const { data: dbApprovals, error: appError } = await supabase.from("approvals").select("*");
        const { data: dbAudits, error: auditError } = await supabase.from("approval_audit_logs").select("*");

        let currentReqs: ApprovalRequest[] = [];
        let currentAudits: AuditLog[] = [];

        if (appError || auditError || !dbApprovals || dbApprovals.length === 0) {
          const savedReqs = localStorage.getItem("nexus_approvals");
          const savedAudits = localStorage.getItem("nexus_approvals_audits");
          if (savedReqs && savedAudits) {
            currentReqs = JSON.parse(savedReqs);
            currentAudits = JSON.parse(savedAudits);
          } else {
            currentReqs = INITIAL_REQUESTS;
            currentAudits = INITIAL_AUDITS;
            localStorage.setItem("nexus_approvals", JSON.stringify(INITIAL_REQUESTS));
            localStorage.setItem("nexus_approvals_audits", JSON.stringify(INITIAL_AUDITS));
          }
        } else {
          currentReqs = dbApprovals.map(a => ({
            id: a.id,
            type: a.type as ApprovalRequest['type'],
            project: a.project,
            requester: a.requester,
            stage: a.stage as ApprovalRequest['stage'],
            amount: Number(a.amount),
            submitted: a.submitted,
            description: a.description
          }));
          currentAudits = (dbAudits || []).map(au => ({
            who: au.who,
            what: au.what,
            target: au.target,
            when: au.when ? new Date(au.when).toLocaleString() : new Date().toLocaleString()
          }));
        }

        setRequests(currentReqs);
        setAuditLogs(currentAudits);
      } catch (err) {
        console.error("Failed to load approvals from Supabase:", err);
        const savedReqs = localStorage.getItem("nexus_approvals");
        const savedAudits = localStorage.getItem("nexus_approvals_audits");
        if (savedReqs && savedAudits) {
          setRequests(JSON.parse(savedReqs));
          setAuditLogs(JSON.parse(savedAudits));
        }
      }
    }
    loadApprovals();
  }, []);

  const saveState = async (updatedReqs: ApprovalRequest[], updatedAudits: AuditLog[]) => {
    setRequests(updatedReqs);
    setAuditLogs(updatedAudits);
    localStorage.setItem("nexus_approvals", JSON.stringify(updatedReqs));
    localStorage.setItem("nexus_approvals_audits", JSON.stringify(updatedAudits));

    try {
      const approvalRows = updatedReqs.map(a => ({
        id: a.id,
        type: a.type,
        project: a.project,
        requester: a.requester,
        stage: a.stage,
        amount: a.amount,
        submitted: a.submitted,
        description: a.description
      }));
      await supabase.from("approvals").upsert(approvalRows);

      const auditRows = updatedAudits.map(au => ({
        who: au.who,
        what: au.what,
        target: au.target,
        when: au.when ? new Date(au.when).toISOString() : new Date().toISOString()
      }));
      
      await supabase.from("approval_audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (auditRows.length > 0) {
        await supabase.from("approval_audit_logs").insert(auditRows);
      }
    } catch (err) {
      console.error("Failed to sync approvals/audits to Supabase:", err);
    }
  };

  // Check if current acting role can approve this request at its current stage
  const canRoleApprove = (req: ApprovalRequest) => {
    if (req.stage === "Approved" || req.stage === "Rejected") return false;
    const requiredRoles = STAGE_REQUIRED_ROLES[req.stage];
    return requiredRoles ? requiredRoles.includes(actingRole) : false;
  };

  // Handlers
  const handleApprove = (req: ApprovalRequest) => {
    if (!canRoleApprove(req)) {
      toast.error(`Awaiting approval from: ${STAGE_REQUIRED_ROLES[req.stage]?.join(" or ")}`);
      return;
    }

    const currentIdx = STAGES.indexOf(req.stage);
    let nextStage: ApprovalRequest['stage'] = req.stage;

    if (currentIdx < STAGES.length - 1) {
      let nextIdx = currentIdx + 1;
      
      // Conditional skip: Skip Finance Review if Amount is $0
      if (STAGES[nextIdx] === "Finance Review" && req.amount === 0) {
        nextIdx += 1; // skip directly to Approved
      }

      nextStage = STAGES[nextIdx] as ApprovalRequest['stage'];
    }

    const updatedReqs = requests.map(r => r.id === req.id ? { ...r, stage: nextStage } : r);
    const newAudit: AuditLog = {
      who: `Yogesh V (${actingRole})`,
      what: nextStage === "Approved" ? "approved" : "advanced",
      target: `${req.id} to ${nextStage}`,
      when: "Just now"
    };
    const updatedAudits = [newAudit, ...auditLogs];

    saveState(updatedReqs, updatedAudits);
    toast.success(`Request ${req.id} advanced to ${nextStage}!`);
  };

  const handleReject = (req: ApprovalRequest) => {
    if (!canRoleApprove(req)) {
      toast.error(`Awaiting approval from: ${STAGE_REQUIRED_ROLES[req.stage]?.join(" or ")}`);
      return;
    }

    const updatedReqs = requests.map(r => r.id === req.id ? { ...r, stage: "Rejected" as any } : r);
    const newAudit: AuditLog = {
      who: `Yogesh V (${actingRole})`,
      what: "rejected",
      target: `${req.id} request`,
      when: "Just now"
    };
    const updatedAudits = [newAudit, ...auditLogs];

    saveState(updatedReqs, updatedAudits);
    toast.error(`Request ${req.id} rejected.`);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedRequest) return;

    const newAudit: AuditLog = {
      who: `Yogesh V (${actingRole})`,
      what: "commented",
      target: `"${commentText}" on ${selectedRequest.id}`,
      when: "Just now"
    };
    const updatedAudits = [newAudit, ...auditLogs];
    
    saveState(requests, updatedAudits);
    setIsCommentOpen(false);
    setCommentText("");
    toast.success("Comment added to activity log.");
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDesc.trim()) {
      toast.error("Please add a description.");
      return;
    }

    const nextIdNum = requests.reduce((max, r) => {
      const match = r.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        return num > max ? num : max;
      }
      return max;
    }, 3200);

    const newReq: ApprovalRequest = {
      id: `APR-${nextIdNum + 1}`,
      type: reqType,
      project: reqProject,
      requester: reqRequester,
      stage: "Draft",
      amount: Number(reqAmount) || 0,
      submitted: "Just now",
      description: reqDesc
    };

    const newAudit: AuditLog = {
      who: reqRequester,
      what: "created draft",
      target: `${newReq.id} request`,
      when: "Just now"
    };

    saveState([newReq, ...requests], [newAudit, ...auditLogs]);
    setIsCreateOpen(false);
    toast.success(`Request ${newReq.id} initialized in Draft.`);

    // Reset Form
    setReqAmount("");
    setReqDesc("");
  };

  // Submit Draft to manager review
  const handleSubmitDraft = (req: ApprovalRequest) => {
    const updatedReqs = requests.map(r => r.id === req.id ? { ...r, stage: "Manager Review" as any } : r);
    const newAudit: AuditLog = {
      who: req.requester,
      what: "submitted",
      target: `${req.id} to Manager Review`,
      when: "Just now"
    };
    saveState(updatedReqs, [newAudit, ...auditLogs]);
    toast.success(`Draft ${req.id} submitted for manager review.`);
  };

  // Filter logic
  const filteredRequests = requests.filter(r => {
    if (activeFilter === "Mine") {
      return r.requester.toLowerCase().includes("yogesh") || r.requester === "Yogesh V";
    }
    if (activeFilter === "Awaiting me") {
      return canRoleApprove(r);
    }
    return true; // "All"
  });

  // Dynamic counts for pipeline visual headers
  const getStageCount = (stageName: string) => {
    return requests.filter(r => r.stage === stageName).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Workflow Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure, review, and audit approval change requests</p>
        </div>
        <div className="flex gap-2">
          {/* Active Simulating Role Selector */}
          <div className="flex items-center gap-2 bg-secondary/80 border border-border px-3 rounded-xl h-10">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Acting As Role:</span>
            <select 
              value={actingRole}
              onChange={(e) => setActingRole(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold text-primary focus:outline-none cursor-pointer"
            >
              <option value="Admin">Admin (Full Access)</option>
              <option value="Team Member">Team Member (Drafts)</option>
              <option value="Resource Manager">Resource Manager</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Finance Team">Finance Team</option>
              <option value="Department Head">Department Head</option>
            </select>
          </div>

          <button 
            onClick={() => setIsCreateOpen(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="size-4" />Create Request
          </button>
        </div>
      </div>

      {/* Visual Pipeline Headers */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="grid grid-cols-5 gap-3">
          {STAGES.map((s, i) => (
            <div key={s} className="relative">
              <div className="rounded-xl border border-border p-4 bg-secondary/10 hover:shadow-soft transition">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate max-w-[80px]">{s}</div>
                  <div className="size-6 rounded-full bg-gradient-to-br from-primary to-accent text-white text-[11px] font-bold grid place-items-center">
                    {getStageCount(s)}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">Avg cycle: {[1, 2, 3, 2, 0][i]}d</div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${20 + i * 18}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left: Queue */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
            <div className="font-semibold text-sm">Approval Requests Queue</div>
            <div className="flex gap-1 p-1 bg-secondary rounded-xl text-xs">
              {[
                { id: "All", label: "All Records" },
                { id: "Mine", label: "My Drafts / Requests" },
                { id: "Awaiting me", label: "Awaiting Action" }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    activeFilter === tab.id ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {filteredRequests.map((req) => {
              const isDraft = req.stage === "Draft";
              const isRejected = req.stage === "Rejected";
              const isApproved = req.stage === "Approved";
              const canUserApprove = canRoleApprove(req);

              return (
                <div key={req.id} className="p-5 hover:bg-secondary/20 transition space-y-3">
                  <div className="flex items-start gap-4 justify-between">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-secondary border border-border/80 grid place-items-center text-xs font-bold text-muted-foreground uppercase">
                        {req.id.slice(-3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground">{req.type}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            isApproved ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                            isRejected ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                            "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}>
                            {req.stage}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Project: {req.project} · Requester: {req.requester} · {req.submitted}
                        </div>
                        {req.amount > 0 && (
                          <div className="mt-1 text-xs font-bold text-foreground">{formatCurrency(req.amount)}</div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2 italic bg-secondary/30 p-2.5 rounded-lg border border-border/40">
                          "{req.description}"
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          setSelectedRequest(req);
                          setIsCommentOpen(true);
                        }}
                        className="h-8 px-2.5 rounded-lg border border-border hover:bg-secondary text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="size-3.5" />Comment
                      </button>

                      {isDraft ? (
                        <button 
                          onClick={() => handleSubmitDraft(req)}
                          className="h-8 px-3 rounded-lg bg-primary text-white text-[10px] font-bold shadow-copper inline-flex items-center gap-1 hover:opacity-90 cursor-pointer"
                        >
                          <Sparkles className="size-3.5" />Submit Request
                        </button>
                      ) : (
                        !isApproved && !isRejected && (
                          <>
                            <button 
                              onClick={() => handleReject(req)}
                              className={`h-8 px-3 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                                canUserApprove ? "border-red-200 text-red-500 hover:bg-red-500/10" : "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                              }`}
                              disabled={!canUserApprove}
                            >
                              <X className="size-3.5" />Reject
                            </button>
                            <button 
                              onClick={() => handleApprove(req)}
                              className={`h-8 px-3 rounded-lg text-white text-[10px] font-bold shadow-copper inline-flex items-center gap-1 hover:opacity-90 cursor-pointer ${
                                canUserApprove ? "bg-gradient-to-r from-primary to-accent" : "bg-stone-300 dark:bg-stone-800 text-muted-foreground opacity-50 cursor-not-allowed"
                              }`}
                              disabled={!canUserApprove}
                            >
                              <Check className="size-3.5" />Approve
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </div>

                  {/* Flow Steps Pipeline visualization per item */}
                  {!isRejected && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                      {STAGES.map((s, si) => {
                        const currentIdx = STAGES.indexOf(req.stage);
                        const done = req.stage === "Approved" ? true : si < currentIdx;
                        const active = si === currentIdx && req.stage !== "Approved";
                        return (
                          <div key={s} className="flex items-center gap-2">
                            <div className={`size-5 rounded-full grid place-items-center text-[9px] font-bold transition ${
                              done ? "bg-emerald-500 text-white" : active ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                            }`}>
                              {done ? <Check className="size-3.5" /> : si + 1}
                            </div>
                            <span className={`text-[9px] font-medium hidden md:inline ${
                              active ? "text-primary font-bold" : "text-muted-foreground"
                            }`}>{s}</span>
                            {si < STAGES.length - 1 && <div className={`w-4 h-px ${done ? "bg-emerald-500" : "bg-border"}`} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredRequests.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs italic">
                No approval requests found in this queue.
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity Log */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="font-semibold text-sm mb-4">Activity & Audit Log</div>
          <div className="space-y-4 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
            
            {auditLogs.map((log, i) => (
              <div key={i} className="relative flex items-start gap-3 text-xs">
                <div className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-white ring-4 ring-card shrink-0">
                  <Clock className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-foreground">
                    <span className="font-semibold text-foreground">{log.who}</span>{" "}
                    <span className="text-muted-foreground">{log.what}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">{log.target}</div>
                  <div className="text-[9px] text-primary mt-1 font-bold">{log.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE REQUEST MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsCreateOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="font-semibold text-foreground">Initiate Approval Workflow</h3>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Request Type</label>
                <select 
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value as any)}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  <option value="Change Request">Change Request</option>
                  <option value="Budget Increase">Budget Increase</option>
                  <option value="Resource Request">Resource Request</option>
                  <option value="Milestone Sign-off">Milestone Sign-off</option>
                  <option value="Vendor Onboarding">Vendor Onboarding</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Select Project</label>
                <select 
                  value={reqProject}
                  onChange={(e) => setReqProject(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                >
                  <option value="Atlas Banking Platform">Atlas Banking Platform</option>
                  <option value="Helix CRM Migration">Helix CRM Migration</option>
                  <option value="Nimbus Data Lake">Nimbus Data Lake</option>
                  <option value="Mosaic Mobile Suite">Mosaic Mobile Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Requester Name</label>
                  <input 
                    type="text" 
                    required 
                    value={reqRequester}
                    onChange={(e) => setReqRequester(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Amount ($ Cost Impact)</label>
                  <input 
                    type="number" 
                    placeholder="0 if not applicable" 
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Justification / Proposal Details</label>
                <textarea 
                  rows={3} 
                  required
                  placeholder="Detail scope changes, budget impact justifications, etc..." 
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border hover:bg-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-copper hover:opacity-90"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMENT MODAL */}
      {isCommentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsCommentOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="font-semibold text-foreground">Add Audit Comment</h3>
              <button 
                onClick={() => setIsCommentOpen(false)} 
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddComment} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Audit Feedback Message</label>
                <textarea 
                  rows={3} 
                  required
                  placeholder="Add clarification notes, approval comments..." 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCommentOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border hover:bg-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-copper hover:opacity-90"
                >
                  Log Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Approvals;
