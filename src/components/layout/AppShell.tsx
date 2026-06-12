"use client";

import React, { useEffect, useState } from "react";
import { OrganizationModal } from "./OrganizationModal";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import logo from "@/components/asset/white-logo.png";
import Image from "next/image";
import { useUser, useAuth, useClerk, useOrganization, useOrganizationList, SignOutButton } from "@clerk/nextjs";
import { useWelcomeSpeech } from "@/hooks/useWelcomeSpeech";
import { toast } from "sonner";
import {
  LayoutDashboard, FolderKanban, Users, CalendarRange, Activity,
  ShieldAlert, FolderOpen, Workflow, BarChart3, Settings,
  Search, Bell, ChevronRight, ChevronDown, LogOut, Plus, User,
  AlertTriangle, CheckCircle2, Folder, FileCheck, X
} from "lucide-react";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "budget" | "approval" | "upload" | "risk";
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    title: "Pending Approval",
    message: "PMO Review pending for 'Q3 Resource Plan' workflow step.",
    type: "approval",
    time: "5m ago",
    read: false
  },
  {
    id: "n-2",
    title: "Budget Alert",
    message: "Project 'Atlas Banking Platform' has reached 85% budget utilization.",
    type: "budget",
    time: "1h ago",
    read: false
  },
  {
    id: "n-3",
    title: "New Document Upload",
    message: "Sasha Reyes uploaded 'Atlas-Architecture-v4.pdf' to folder Architecture.",
    type: "upload",
    time: "2h ago",
    read: true
  },
  {
    id: "n-4",
    title: "Risk Level Raised",
    message: "New High Severity risk 'Database Migration Latency' registered.",
    type: "risk",
    time: "1d ago",
    read: true
  }
];

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  {
    to: "/resources",
    label: "Resource Management",
    icon: Users,
    children: [
      { to: "/resources", label: "Directory", icon: Users },
      { to: "/resources/allocation", label: "Resource Allocation", icon: CalendarRange },
      { to: "/resources/utilization", label: "Utilization Tracking", icon: Activity },
    ],
  },
  { to: "/risks", label: "Risk Management", icon: ShieldAlert },
  { to: "/documents", label: "Document Repository", icon: FolderOpen },
  { to: "/approvals", label: "Workflow Approvals", icon: Workflow },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
] as const;

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:it_administrators", "org:member"],
  "/projects": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:it_administrators", "org:member"],
  "/resources": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:department_heads", "org:it_administrators"],
  "/risks": ["org:admin", "org:executive_management", "org:project_managers", "org:department_heads", "org:it_administrators", "org:member"],
  "/documents": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:it_administrators", "org:member"],
  "/approvals": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:it_administrators"],
  "/reports": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:it_administrators"],
};

function crumbsFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.map((p, i) => ({
    label: p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + parts.slice(0, i + 1).join("/"),
  }));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const crumbs = crumbsFromPath(pathname);
  
  // Audio welcome voice synthesis hook triggered on login
  useWelcomeSpeech();
  const { user } = useUser();
  const { orgRole } = useAuth();
  const clerk = useClerk();
  const { organization } = useOrganization();
  const { isLoaded: isOrgListLoaded, setActive: setOrgActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true }
  });
  const organizationList = userMemberships?.data;

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Synchronize notifications with localStorage
  useEffect(() => {
    const saved = localStorage.getItem("nexus_notifications");
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      setNotifications(INITIAL_NOTIFICATIONS);
      localStorage.setItem("nexus_notifications", JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }, []);

  // Sync state across components/tabs
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem("nexus_notifications");
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    };
    window.addEventListener("nexus-notifications-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("nexus-notifications-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Update notifications helper
  const updateNotifications = (newNotifs: AppNotification[]) => {
    setNotifications(newNotifs);
    localStorage.setItem("nexus_notifications", JSON.stringify(newNotifs));
    window.dispatchEvent(new Event("nexus-notifications-updated"));
  };

  // Poll database for approved requests raised by this user
  useEffect(() => {
    if (!user) return;
    
    // Determine user's full name to compare with requester
    const userFullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    
    async function checkNewApprovals() {
      try {
        const { data: dbApprovals, error } = await supabase
          .from("approvals")
          .select("*")
          .eq("status", "Approved");
          
        if (error || !dbApprovals) return;
        
        // Load notified approval IDs to avoid duplicates
        const notifiedStr = localStorage.getItem("nexus_notified_approvals");
        const notifiedIds: string[] = notifiedStr ? JSON.parse(notifiedStr) : [];
        
        let newNotifiedIds = [...notifiedIds];
        let hasNewNotification = false;
        
        const currentNotificationsStr = localStorage.getItem("nexus_notifications");
        let currentNotifications: AppNotification[] = currentNotificationsStr 
          ? JSON.parse(currentNotificationsStr) 
          : INITIAL_NOTIFICATIONS;
          
        for (const req of dbApprovals) {
          // If the requester matches the current user
          const isUserRequest = req.requester && (
            req.requester.toLowerCase().includes(userFullName.toLowerCase()) || 
            (userFullName.toLowerCase().includes("systemadmin") && req.requester.toLowerCase().includes("systemadmin"))
          );
          
          if (isUserRequest && !notifiedIds.includes(req.id)) {
            // Found a new approved request raised by this user!
            newNotifiedIds.push(req.id);
            hasNewNotification = true;
            
            // Pop up!
            toast.success(`Request ${req.id} for project "${req.project_name || req.project}" has been approved!`, {
              duration: 10000,
              icon: <CheckCircle2 className="size-5 text-green-500" />
            });
            
            // Add notification item
            const newNotif: AppNotification = {
              id: `n-approval-approved-${req.id}-${Date.now()}`,
              title: "Request Approved",
              message: `Your request ${req.id} for "${req.project_name || req.project}" ($${Number(req.amount || 0).toLocaleString()}) has been approved.`,
              type: "approval",
              time: "Just now",
              read: false
            };
            currentNotifications = [newNotif, ...currentNotifications];
          }
        }
        
        if (hasNewNotification) {
          localStorage.setItem("nexus_notified_approvals", JSON.stringify(newNotifiedIds));
          localStorage.setItem("nexus_notifications", JSON.stringify(currentNotifications));
          setNotifications(currentNotifications);
          window.dispatchEvent(new Event("nexus-notifications-updated"));
        }
      } catch (err) {
        console.error("Error checking new approvals:", err);
      }
    }
    
    // Check immediately on mount, and then poll every 6 seconds
    checkNewApprovals();
    const interval = setInterval(checkNewApprovals, 6000);
    return () => clearInterval(interval);
  }, [user]);

  const userImageUrl = user?.imageUrl;
  // Clerk always provides an imageUrl (auto-generated). Only treat as a real
  // uploaded photo if it is NOT one of Clerk's generated default avatars.
  const hasCustomPhoto =
    !!userImageUrl &&
    !userImageUrl.includes("img.clerk.com") &&
    !userImageUrl.includes("gravatar.com") &&
    !userImageUrl.includes("clerk.dev");
  const avatarSrc = hasCustomPhoto ? userImageUrl! : "/default-avatar.png";
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.emailAddresses?.[0]?.emailAddress?.slice(0, 2).toUpperCase() || "EM";

  useEffect(() => {
    async function syncUser() {
      if (!user) return;
      try {
        const userEmail = user.primaryEmailAddress?.emailAddress || "";
        const userName = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

        // Map Clerk Organization Role to application roles
        let appRole = "Team Member";
        if (orgRole) {
          const roleLower = orgRole.toLowerCase();
          if (roleLower.includes("admin")) {
            appRole = "Admin";
          } else if (roleLower.includes("department_heads")) {
            appRole = "Department Head";
          } else if (roleLower.includes("executive_management")) {
            appRole = "Executive Management";
          } else if (roleLower.includes("finance_team")) {
            appRole = "Finance Team";
          } else if (roleLower.includes("it_administrators")) {
            appRole = "IT Administrator";
          } else if (roleLower.includes("project_managers")) {
            appRole = "Project Manager";
          } else if (roleLower.includes("resource_managers")) {
            appRole = "Resource Manager";
          } else if (roleLower.includes("team_members")) {
            appRole = "Team Member";
          } else if (roleLower.includes("manager")) {
            appRole = "Resource Manager";
          } else if (roleLower.includes("member")) {
            appRole = "Team Member";
          }
        }

        const { data: existingUser, error: selectError } = await supabase
          .from("users")
          .select("*")
          .eq("email", userEmail)
          .maybeSingle();

        if (!selectError && existingUser) {
          const updateFields: any = {
            name: userName,
            status: "Active",
            last_active: new Date().toISOString(),
          };

          // Sync role if orgRole is present
          if (orgRole) {
            updateFields.role = appRole;
          }

          if (!existingUser.id || existingUser.status === "Invited") {
            updateFields.id = user.id;
          }

          await supabase
            .from("users")
            .update(updateFields)
            .eq("email", userEmail);
        } else {
          const { error: insertError } = await supabase.from("users").insert([
            {
              id: user.id,
              email: userEmail,
              name: userName,
              role: appRole,
              status: "Active",
              last_active: new Date().toISOString(),
            },
          ]);

          if (insertError) {
            if (
              insertError.code === "23505" || 
              String((insertError as any).status) === "409" || 
              insertError.message?.toLowerCase().includes("duplicate") ||
              insertError.message?.toLowerCase().includes("conflict")
            ) {
              const updateFields: any = {
                id: user.id,
                name: userName,
                status: "Active",
                last_active: new Date().toISOString(),
              };
              if (orgRole) {
                updateFields.role = appRole;
              }

              await supabase
                .from("users")
                .update(updateFields)
                .eq("email", userEmail);
            } else {
              console.warn("Insert user failed:", insertError.message);
            }
          }
        }
      } catch (err) {
        console.warn("Could not sync user to Supabase:", err);
      }
    }
    syncUser();
  }, [user, orgRole]);

  // Client-side route access guard
  useEffect(() => {
    if (pathname && orgRole) {
      const baseRoute = Object.keys(ROUTE_PERMISSIONS).find(
        (r) => pathname === r || pathname.startsWith(r + "/")
      );
      if (baseRoute) {
        const allowed = ROUTE_PERMISSIONS[baseRoute];
        if (allowed && !allowed.includes(orgRole)) {
          window.location.href = "/dashboard";
        }
      }
    }
  }, [pathname, orgRole]);

  return (
    <>
    <OrganizationModal open={showOrgModal} onClose={() => setShowOrgModal(false)} />
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="h-28 flex items-center justify-center px-4 border-b border-sidebar-border">
          <Image src={logo} className="h-[100px] w-auto object-contain" alt="NexusFlow Logo" priority />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <div className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/40">Workspace</div>
          {nav
            .filter((item) => {
              if (!orgRole) return true;
              const allowed = ROUTE_PERMISSIONS[item.to];
              return !allowed || allowed.includes(orgRole);
            })
            .map((item) => {
              const hasChildren = "children" in item;
            const active = hasChildren
              ? pathname.startsWith(item.to)
              : (pathname === item.to || pathname.startsWith(item.to + "/"));
            const Icon = item.icon;
            const isExpanded = hasChildren && pathname.startsWith(item.to);

            return (
              <div key={item.to} className="space-y-1">
                <Link
                  href={item.to}
                  className={[
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-white shadow-[inset_2px_0_0_0_var(--color-primary)] font-medium"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white",
                  ].join(" ")}
                >
                  <Icon className={["size-[18px] transition-colors", active ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"].join(" ")} />
                  <span className="truncate flex-1">{item.label}</span>
                </Link>

                {hasChildren && isExpanded && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l border-sidebar-border/30 ml-5 flex flex-col">
                    {item.children.map((child) => {
                      const childActive = pathname === child.to;
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.to}
                          href={child.to}
                          className={[
                            "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all duration-150",
                            childActive
                              ? "bg-sidebar-accent/50 text-white font-medium shadow-[inset_2px_0_0_0_var(--color-primary)]"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-white",
                          ].join(" ")}
                        >
                          <ChildIcon className={["size-3.5 transition-colors", childActive ? "text-primary" : "text-sidebar-foreground/45"].join(" ")} />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 ml-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl">
          {/* Left Side: Search Box */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                placeholder="Search projects, resources, documents…"
                className="w-full h-10 pl-9 pr-20 rounded-xl bg-secondary/60 border border-transparent focus:bg-card focus:border-border focus:outline-none focus:ring-2 focus:ring-primary/15 text-sm placeholder:text-muted-foreground transition"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>

          {/* Right Side: Notification Bell, Org Switcher & User Profile */}
          <div className="flex items-center gap-4">
            {/* Notification Bell with interactive dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserDropdown(false);
                  setShowOrgDropdown(false);
                }}
                className="relative size-10 grid place-items-center rounded-xl hover:bg-secondary transition shrink-0 cursor-pointer"
              >
                <Bell className="size-[18px] text-muted-foreground" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                  
                  {/* Dropdown Card */}
                  <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in-50 slide-in-from-top-1 duration-200">
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Notifications</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {notifications.filter(n => !n.read).length} new
                          </span>
                        )}
                      </div>
                      {notifications.some(n => !n.read) && (
                        <button 
                          onClick={() => {
                            updateNotifications(notifications.map(n => ({ ...n, read: true })));
                            toast.success("All notifications marked as read");
                          }}
                          className="text-[10px] font-medium text-primary hover:underline cursor-pointer border-none bg-transparent"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const IconComponent = {
                            budget: AlertTriangle,
                            approval: FileCheck,
                            upload: Folder,
                            risk: ShieldAlert
                          }[notif.type] || Bell;

                          const colorClass = {
                            budget: "text-amber-500 bg-amber-500/10",
                            approval: "text-[#C67C4E] bg-[#C67C4E]/10",
                            upload: "text-blue-500 bg-blue-500/10",
                            risk: "text-red-500 bg-red-500/10"
                          }[notif.type] || "text-muted-foreground bg-secondary";

                          return (
                            <div 
                              key={notif.id} 
                              onClick={() => {
                                updateNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                setShowNotifications(false);
                              }}
                              className={`p-3.5 flex gap-3 text-left hover:bg-secondary/30 transition cursor-pointer relative ${!notif.read ? 'bg-primary/5' : ''}`}
                            >
                              <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                <IconComponent className="size-4" />
                              </div>
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-semibold text-xs text-foreground truncate">{notif.title}</span>
                                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">{notif.time}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">{notif.message}</p>
                              </div>
                              {!notif.read && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-2.5 bg-secondary/10 border-t border-border flex justify-between gap-2">
                        <button 
                          onClick={() => {
                            updateNotifications([]);
                            toast.success("Notifications cleared");
                          }}
                          className="w-full text-[10px] font-medium text-muted-foreground hover:text-foreground text-center py-1 rounded hover:bg-secondary/40 transition cursor-pointer border-none bg-transparent"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-border" />

            {/* Organization Switcher */}
            <div className="relative">
              {organization ? (
                <div 
                  onClick={() => {
                    setShowOrgModal(true);
                    setShowOrgDropdown(false);
                    setShowUserDropdown(false);
                  }}
                  className="flex items-center gap-2 bg-sidebar/90 hover:bg-sidebar border border-sidebar-border rounded-xl p-1.5 pl-2 pr-3 transition cursor-pointer select-none"
                >
                  {/* Organization avatar */}
                  {organization.imageUrl ? (
                    <img src={organization.imageUrl} className="size-6 rounded-lg object-cover" alt="Org Logo" />
                  ) : (
                    <div className="size-6 rounded-lg bg-gradient-to-br from-[#C67C4E] to-[#D4A373] text-white font-bold text-[10px] flex items-center justify-center shadow-sm">
                      {organization.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="text-left min-w-0 flex-1 pr-1">
                    <div className="text-xs font-semibold leading-tight text-white truncate max-w-[100px]">{organization.name}</div>
                    <div className="text-[10px] text-sidebar-foreground/60 leading-tight">
                      {orgRole ? (() => {
                        const r = orgRole.toLowerCase();
                        if (r.includes("admin")) return "Admin";
                        if (r.includes("department_heads")) return "Department Head";
                        if (r.includes("executive_management")) return "Executive Management";
                        if (r.includes("finance_team")) return "Finance Team";
                        if (r.includes("it_administrators")) return "IT Administrator";
                        if (r.includes("project_managers")) return "Project Manager";
                        if (r.includes("resource_managers")) return "Resource Manager";
                        if (r.includes("team_members")) return "Team Member";
                        if (r.includes("manager")) return "Resource Manager";
                        return "Member";
                      })() : "Member"}
                    </div>
                  </div>

                  {/* Switch Dropdown Toggle Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOrgDropdown(!showOrgDropdown);
                      setShowUserDropdown(false);
                    }}
                    className="p-1 rounded-md hover:bg-sidebar-border text-sidebar-foreground/60 hover:text-white transition-colors"
                    title="Switch Organization"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>

                  {/* Manage Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOrgModal(true);
                      setShowOrgDropdown(false);
                    }}
                    className="p-1 rounded-md hover:bg-sidebar-border text-sidebar-foreground/60 hover:text-white transition-colors"
                    title="Manage Organization"
                  >
                    <Settings className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => clerk.openCreateOrganization()}
                  className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Create/Join Org</span>
                </button>
              )}

              {/* Organization Dropdown */}
              {showOrgDropdown && organizationList && organizationList.length > 0 && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-sidebar text-sidebar-foreground border border-sidebar-border shadow-lg py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Switch Organization</div>
                  {organizationList.map((membershipItem: any) => {
                    const org = membershipItem.organization;
                    const active = org.id === organization?.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          setOrgActive?.({ organization: org.id });
                          setShowOrgDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                          active ? "bg-sidebar-accent text-white font-medium" : "hover:bg-sidebar-accent/60 text-sidebar-foreground/75 hover:text-white"
                        }`}
                      >
                        {org.imageUrl ? (
                          <img src={org.imageUrl} className="size-5 rounded object-cover" alt="" />
                        ) : (
                          <div className="size-5 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate flex-1">{org.name}</span>
                      </button>
                    );
                  })}
                  {(!orgRole || orgRole.toLowerCase().includes("admin")) && (
                    <>
                      <div className="h-px bg-sidebar-border my-1.5" />
                      <button
                        onClick={() => {
                          clerk.openCreateOrganization();
                          setShowOrgDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-sidebar-accent/60 transition-colors font-medium"
                      >
                        <Plus className="size-4" />
                        <span>Create Organization</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-border" />

            {/* User Profile Dropdown */}
            <div className="relative">
              <div 
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowOrgDropdown(false);
                }}
                className="flex items-center gap-3 p-1 rounded-xl hover:bg-secondary/50 transition cursor-pointer select-none"
              >
                <img
                  src={avatarSrc}
                  className="size-9 rounded-full object-cover ring-2 ring-[#C67C4E]/40 ring-offset-1 ring-offset-background shadow-md"
                  alt="User avatar"
                />
                <div className="text-left hidden md:block pl-1">
                  <div className="text-sm font-medium leading-tight">
                    {user?.fullName || user?.firstName || "User"}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight">
                    {user?.primaryEmailAddress?.emailAddress || ""}
                  </div>
                </div>
              </div>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-sidebar text-sidebar-foreground border border-sidebar-border shadow-lg py-1.5 z-50">
                  <div className="px-3 py-2 border-b border-sidebar-border mb-1.5 flex items-center gap-2">
                    <img
                      src={avatarSrc}
                      className="size-8 rounded-full object-cover ring-2 ring-[#C67C4E]/50"
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">{user?.fullName || user?.firstName || "User"}</div>
                      <div className="text-[10px] text-sidebar-foreground/60 truncate">{user?.primaryEmailAddress?.emailAddress}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      clerk.openUserProfile();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white transition-colors"
                  >
                    <User className="size-4" />
                    <span>Manage Account</span>
                  </button>
                  
                  <div className="h-px bg-sidebar-border my-1.5" />
                  
                  <SignOutButton redirectUrl="/">
                    <button
                      onClick={() => setShowUserDropdown(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="size-4" />
                      <span>Sign out</span>
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </div>
        </header>

        {crumbs.length > 0 && (
          <div className="px-8 pt-6 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">Home</Link>
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1.5">
                <ChevronRight className="size-3.5 text-border" />
                <span className={i === crumbs.length - 1 ? "text-foreground font-medium" : ""}>{c.label}</span>
              </span>
            ))}
          </div>
        )}

        <main className="flex-1 px-8 py-6">
          {children}
        </main>
      </div>
    </div>
    </>
  );
}
