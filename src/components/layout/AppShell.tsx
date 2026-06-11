"use client";

import React, { useEffect, useState } from "react";
import { OrganizationModal } from "./OrganizationModal";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import logo from "@/components/asset/logo.png";
import { useUser, useAuth, useClerk, useOrganization, useOrganizationList, SignOutButton } from "@clerk/nextjs";
import { useWelcomeSpeech } from "@/hooks/useWelcomeSpeech";
import {
  LayoutDashboard, FolderKanban, Users, CalendarRange, Activity,
  ShieldAlert, FolderOpen, Workflow, BarChart3, Settings,
  Search, Bell, ChevronRight, ChevronDown, LogOut, Plus, User,
} from "lucide-react";

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
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:it_administrators", "org:member"],
  "/projects": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:member"],
  "/resources": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads"],
  "/risks": ["org:admin", "org:executive_management", "org:project_managers", "org:department_heads", "org:member"],
  "/documents": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:member"],
  "/approvals": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads"],
  "/reports": ["org:admin", "org:executive_management", "org:project_managers", "org:resource_managers", "org:finance_team", "org:department_heads", "org:it_administrators"],
  "/settings": ["org:admin", "org:it_administrators"],
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
        <div className="h-24 flex items-center justify-center px-4 border-b border-sidebar-border">
          <img src={logo.src} className="h-16 w-auto object-contain" alt="NexusFlow Logo" />
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
            <button className="relative size-10 grid place-items-center rounded-xl hover:bg-secondary transition shrink-0">
              <Bell className="size-[18px] text-muted-foreground" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background" />
            </button>

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
