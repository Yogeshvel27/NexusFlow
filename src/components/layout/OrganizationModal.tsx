"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import {
  X, Search, Users, Settings, Mail, ChevronDown,
  MoreHorizontal, Check, Shield, UserCheck, DollarSign,
  Building2, BarChart2, User, Loader2, Calendar, Award, UserPlus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
const ROLES = [
  { key: "org:admin", label: "Admin", icon: Shield },
  { key: "org:resource_managers", label: "Resource Manager", icon: UserCheck },
  { key: "org:project_managers", label: "Project Manager", icon: Users },
  { key: "org:it_administrators", label: "IT Administrators", icon: Settings },
  { key: "org:finance_team", label: "Finance Team", icon: DollarSign },
  { key: "org:department_heads", label: "Department Head", icon: Building2 },
  { key: "org:executive_management", label: "PMO", icon: BarChart2 },
  { key: "org:member", label: "Team Member", icon: User },
];

const S = {
  bg: "#111111", sidebar: "#0d0d0d", border: "rgba(198,124,78,0.12)",
  input: "#1a1a1a", primary: "#C67C4E", gold: "#D4A373",
  muted: "#6b7280", text: "#f5f4f2", sub: "#a8a29e",
};

const roleLabel = (k: string) => ROLES.find((r) => r.key === k)?.label ?? k;
const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "—";

interface Props { open: boolean; onClose: () => void; }

export function OrganizationModal({ open, onClose }: Props) {
  const { organization, membership, isLoaded } = useOrganization();
  const { user } = useUser();

  const isAdmin = membership?.role === "org:admin";
  const canInvite = !!(membership?.role && membership.role !== "org:member");

  const [tab, setTab] = useState<"members" | "invitations">("members");
  const [nav, setNav] = useState<"general" | "members">("members");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("org:member");
  const [roleOpen, setRoleOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [actOpen, setActOpen] = useState<string | null>(null);
  const [mRoleOpen, setMRoleOpen] = useState<string | null>(null);
  const [dbMembers, setDbMembers] = useState<any[]>([]);

  const roleTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    if (isAdmin) {
      if (organization) {
        organization.getMemberships({ pageSize: 50 }).then((res) => {
          setDbMembers(res.data ?? []);
        }).catch((e) => {
          console.warn("Failed to fetch memberships in OrganizationModal:", e);
        });
      }
    } else {
      supabase.from("resources").select("*").then(({ data, error }) => {
        if (data && !error) {
          const mapped = data.map(r => ({
            id: r.id,
            role: r.role || "org:member",
            publicUserData: {
              userId: r.id,
              firstName: r.name.split(" ")[0] || "",
              lastName: r.name.split(" ").slice(1).join(" ") || "",
              identifier: r.email,
              imageUrl: null
            }
          }));
          setDbMembers(mapped);
        }
      });
    }
  }, [open, organization, isAdmin]);

  useEffect(() => {
    if (!open || !organization || !isAdmin) return;
    organization.getInvitations().then((r) => setInvitations(r.data ?? [])).catch(() => {});
  }, [open, organization, isAdmin]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (roleTriggerRef.current && !roleTriggerRef.current.contains(target)) {
        setRoleOpen(false);
        setDropPos(null);
      }
      setActOpen(null);
      setMRoleOpen(null);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (!open) return null;

  const members = dbMembers.filter((m: any) => {
    if (!search) return true;
    const n = (m.publicUserData?.firstName ?? "") + " " + (m.publicUserData?.lastName ?? "");
    const e = m.publicUserData?.identifier ?? "";
    return (
      n.toLowerCase().includes(search.toLowerCase()) ||
      e.toLowerCase().includes(search.toLowerCase())
    );
  });

  const selectedRole = ROLES.find((r) => r.key === role) ?? ROLES[ROLES.length - 1];
  const SelectedIcon = selectedRole.icon;

  const adminMember = dbMembers.find((m: any) => m.role === "org:admin");
  const adminName = adminMember
    ? [adminMember.publicUserData?.firstName, adminMember.publicUserData?.lastName].filter(Boolean).join(" ") || adminMember.publicUserData?.identifier
    : "Organization Admin";
  const adminEmail = adminMember?.publicUserData?.identifier || "admin@organization.com";

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.emailAddresses?.[0]?.emailAddress?.slice(0, 2).toUpperCase() || "EM";

  function openRoleDropdown() {
    if (roleOpen) {
      setRoleOpen(false);
      setDropPos(null);
      return;
    }
    const rect = roleTriggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const DROPDOWN_H = ROLES.length * 38 + 12;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const topPos = spaceBelow >= DROPDOWN_H
      ? rect.bottom + 4
      : rect.top - DROPDOWN_H - 4;
    setDropPos({
      top: topPos,
      left: rect.right - Math.max(rect.width, 210),
      minWidth: Math.max(rect.width, 210),
    });
    setRoleOpen(true);
  }

  async function invite() {
    if (!organization || !email.trim()) return;
    setSending(true); setErr("");
    try {
      await organization.inviteMember({ emailAddress: email.trim(), role });
      setEmail("");
      const res = await organization.getInvitations();
      setInvitations(res.data ?? []);
    } catch (e: any) {
      setErr(e?.errors?.[0]?.message ?? "Failed to send.");
    }
    setSending(false);
  }

  async function updateRole(userId: string, r: string) {
    if (!organization) return;
    try { 
      await organization.updateMember({ userId, role: r }); 
      const res = await organization.getMemberships({ pageSize: 50 });
      setDbMembers(res.data ?? []);
    } catch {}
    setMRoleOpen(null);
  }

  async function removeMember(userId: string) {
    if (!organization) return;
    try { 
      await organization.removeMember(userId); 
      const res = await organization.getMemberships({ pageSize: 50 });
      setDbMembers(res.data ?? []);
    } catch {}
    setActOpen(null);
  }

  async function revokeInv(id: string) {
    try {
      const inv = invitations.find((i) => i.id === id);
      if (inv) await inv.revoke();
      setInvitations((p) => p.filter((i) => i.id !== id));
    } catch {}
  }

  return (
    <>
      {/* ── Fixed-position role dropdown portal ── */}
      {roleOpen && dropPos && canInvite && (
        <div
          style={{
            position: "fixed",
            top: dropPos.top,
            left: dropPos.left,
            minWidth: dropPos.minWidth,
            zIndex: 99999,
            background: S.input,
            border: "1px solid rgba(198,124,78,0.25)",
            borderRadius: "0.75rem",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
            padding: "4px 0",
          }}
        >
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.key}
                onClick={() => { setRole(r.key); setRoleOpen(false); setDropPos(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm"
                style={{ color: role === r.key ? S.gold : S.text }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(198,124,78,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon className="size-3.5 shrink-0" style={{ color: role === r.key ? S.primary : S.muted }} />
                <span className="flex-1 text-left">{r.label}</span>
                {role === r.key && <Check className="size-3.5" style={{ color: S.primary }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Modal backdrop ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.8)" }}
      >
        {/* Modal shell */}
        <div
          className="relative flex w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            background: S.bg,
            border: `1px solid ${S.border}`,
            maxWidth: !isLoaded ? "450px" : canInvite ? "1150px" : "620px",
            height: !isLoaded ? "350px" : canInvite ? "90vh" : "auto",
            minHeight: !isLoaded ? "350px" : canInvite ? "600px" : "unset",
          }}
        >
          {!isLoaded ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-[#C67C4E]" />
              <span className="text-sm text-stone-400">Loading organization details...</span>
            </div>
          ) : canInvite ? (
            <>
              {/* ── ADMIN VIEW: SIDEBAR + MEMBERS MANAGEMENT ── */}
              {/* LEFT SIDEBAR */}
              <div
                className="w-60 shrink-0 flex flex-col"
                style={{ background: S.sidebar, borderRight: `1px solid ${S.border}` }}
              >
                <div className="px-5 pt-5 pb-4">
                  <div className="text-base font-bold text-white">Organization</div>
                  <div className="text-xs mt-0.5" style={{ color: S.sub }}>Manage your organization.</div>
                </div>
                <nav className="flex flex-col gap-1.5 px-3">
                  {[
                    { key: "general", label: "General", icon: Settings },
                    { key: "members", label: "Members", icon: Users },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setNav(key as any)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left w-full"
                      style={{
                        background: nav === key ? "rgba(198,124,78,0.15)" : "transparent",
                        color: nav === key ? S.gold : S.sub,
                      }}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* MAIN CONTENT */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
                  <h2 className="text-base font-bold text-white">Members</h2>
                  <button
                    onClick={onClose}
                    className="size-7 grid place-items-center rounded-lg transition-colors"
                    style={{ color: S.muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div
                  className="flex px-6 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {(["members", "invitations"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="flex items-center gap-1.5 px-1 pb-2.5 mr-5 text-sm font-medium capitalize"
                      style={{
                        color: tab === t ? S.gold : S.muted,
                        borderBottom: tab === t ? `2px solid ${S.primary}` : "2px solid transparent",
                      }}
                    >
                      {t === "members" ? "Members" : "Invitations"}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          background: tab === t ? "rgba(198,124,78,0.2)" : "rgba(255,255,255,0.06)",
                          color: tab === t ? S.gold : S.muted,
                        }}
                      >
                        {t === "members" ? dbMembers.length : invitations.length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search row */}
                <div className="flex items-center gap-2.5 px-6 pt-3 pb-2 shrink-0">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: S.muted }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search members"
                      className="w-full h-9 pl-8 pr-4 rounded-lg text-sm outline-none"
                      style={{ background: S.input, border: "1px solid rgba(255,255,255,0.10)", color: S.text }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = S.primary)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                    />
                  </div>
                  <button
                    className="h-9 px-4 rounded-lg text-sm font-semibold shrink-0"
                    style={{ background: "transparent", border: "1px solid rgba(198,124,78,0.5)", color: S.gold }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(198,124,78,0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Invite
                  </button>
                </div>

                {/* Invite form — single row */}
                {tab === "members" && (
                  <div className="px-6 pb-3 shrink-0">
                    <div className="text-xs font-semibold text-white mb-1">Invite new members</div>
                    <div className="text-xs mb-2" style={{ color: S.muted }}>
                      Enter or paste one or more email addresses, separated by spaces or commas.
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: S.muted }} />
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && invite()}
                          placeholder="Enter email addresses"
                          className="w-full h-9 pl-8 pr-8 rounded-lg text-sm outline-none"
                          style={{ background: S.input, border: "1px solid rgba(255,255,255,0.10)", color: S.text }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = S.primary)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
                        />
                        {email && (
                          <button
                            onClick={() => setEmail("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2"
                            style={{ color: S.muted }}
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>

                      <button
                        ref={roleTriggerRef}
                        onClick={openRoleDropdown}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium shrink-0"
                        style={{ background: S.input, border: "1px solid rgba(255,255,255,0.12)", color: S.text, minWidth: 160 }}
                      >
                        <SelectedIcon className="size-3.5 shrink-0" style={{ color: S.primary }} />
                        <span className="flex-1 text-left truncate">{selectedRole.label}</span>
                        <ChevronDown className="size-3.5 shrink-0" style={{ color: S.muted }} />
                      </button>

                      <button
                        onClick={() => { setEmail(""); setErr(""); }}
                        className="h-9 px-3 rounded-lg text-sm font-medium shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", color: S.sub, border: "1px solid rgba(255,255,255,0.08)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      >
                        Cancel
                      </button>

                      <button
                        onClick={invite}
                        disabled={!email.trim() || sending}
                        className="h-9 px-4 rounded-lg text-sm font-semibold shrink-0 disabled:opacity-50"
                        style={{
                          background: `linear-gradient(135deg,${S.gold},${S.primary})`,
                          color: "#fff",
                          boxShadow: "0 3px 10px rgba(198,124,78,0.30)",
                        }}
                      >
                        {sending ? "Sending…" : "Send invitation"}
                      </button>
                    </div>
                    {err && <div className="text-xs text-red-400 mt-1">{err}</div>}
                  </div>
                )}

                {/* Table area */}
                <div className="flex-1 overflow-y-auto px-6 min-h-0">
                  {tab === "members" && (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0" style={{ background: S.bg }}>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                          {["User", "Joined", "Role", "Actions"].map((h) => (
                            <th key={h} className="text-left py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: S.muted }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {members.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-sm" style={{ color: S.muted }}>No members found.</td>
                          </tr>
                        ) : (
                          members.map((m: any) => {
                            const isMe = m.publicUserData?.userId === user?.id;
                            const name = [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" ") || m.publicUserData?.identifier || "Unknown";
                            const eml = m.publicUserData?.identifier ?? "";
                            const avatar = m.publicUserData?.imageUrl;
                            return (
                              <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-2.5">
                                    {avatar ? (
                                      <img src={avatar} className="size-8 rounded-full object-cover ring-2 ring-[#C67C4E]/20" alt="" />
                                    ) : (
                                      <div className="size-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: "rgba(198,124,78,0.2)", color: S.primary }}>
                                        {name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-white text-xs">{name}</span>
                                        {isMe && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(198,124,78,0.15)", color: S.gold, border: "1px solid rgba(198,124,78,0.25)" }}>
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px]" style={{ color: S.muted }}>{eml}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4 text-xs" style={{ color: S.sub }}>{fmtDate(m.createdAt)}</td>
                                <td className="py-2.5 pr-4">
                                  {isAdmin ? (
                                    <div className="relative inline-block">
                                      <button
                                        onClick={() => setMRoleOpen(mRoleOpen === m.id ? null : m.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                                        style={{ background: "rgba(255,255,255,0.06)", color: S.text, border: "1px solid rgba(255,255,255,0.08)" }}
                                      >
                                        {roleLabel(m.role)}
                                        <ChevronDown className="size-3" style={{ color: S.muted }} />
                                      </button>
                                      {mRoleOpen === m.id && !isMe && (
                                        <div className="absolute left-0 top-9 z-50 rounded-lg overflow-hidden shadow-2xl py-1" style={{ background: S.input, border: "1px solid rgba(198,124,78,0.2)", minWidth: 170 }}>
                                          {ROLES.map((r) => (
                                            <button
                                              key={r.key}
                                              onClick={() => updateRole(m.publicUserData?.userId!, r.key)}
                                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left"
                                              style={{ color: m.role === r.key ? S.gold : S.text }}
                                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(198,124,78,0.12)")}
                                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                              {r.label}
                                              {m.role === r.key && <Check className="size-3 ml-auto" style={{ color: S.primary }} />}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-medium" style={{ color: S.sub }}>
                                      {roleLabel(m.role)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  {!isMe && isAdmin && (
                                    <div className="relative inline-block">
                                      <button
                                        onClick={() => setActOpen(actOpen === m.id ? null : m.id)}
                                        className="size-6 grid place-items-center rounded-md transition-colors"
                                        style={{ color: S.muted }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                      >
                                        <MoreHorizontal className="size-3.5" />
                                      </button>
                                      {actOpen === m.id && (
                                        <div className="absolute right-0 top-8 z-50 rounded-lg overflow-hidden shadow-2xl py-1" style={{ background: S.input, border: "1px solid rgba(255,255,255,0.1)", minWidth: 150 }}>
                                          <button
                                            onClick={() => removeMember(m.publicUserData?.userId!)}
                                            className="w-full px-3 py-1.5 text-xs text-left text-red-400"
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                          >
                                            Remove member
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}

                  {tab === "invitations" && (
                    invitations.length === 0 ? (
                      <div className="py-10 text-center text-sm" style={{ color: S.muted }}>No invitations to display</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="sticky top-0" style={{ background: S.bg }}>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {["Email", "Role", "Actions"].map((h) => (
                              <th key={h} className="text-left py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: S.muted }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {invitations.map((inv) => (
                            <tr key={inv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <td className="py-2.5 pr-4 text-xs text-white">{inv.emailAddress}</td>
                              <td className="py-2.5 pr-4 text-xs" style={{ color: S.sub }}>{roleLabel(inv.role)}</td>
                              <td className="py-2.5">
                                <button
                                  onClick={() => revokeInv(inv.id)}
                                  className="text-xs px-2.5 py-1 rounded-md"
                                  style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                                >
                                  Revoke
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}
                </div>

                {/* Footer */}
                <div
                  className="shrink-0 px-6 py-3 flex items-center gap-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: S.muted }}
                >
                  <Users className="size-3.5" />
                  <span className="text-xs">{dbMembers.length} of 5 seats used</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── NON-ADMIN VIEW: BEAUTIFUL DETAILS CARD ── */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative p-6">
                {/* Header with Logo + Org Name */}
                <div className="flex items-center gap-4 pt-2 pb-6 shrink-0 relative">
                  <div
                    className="size-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg border-2 border-[#C67C4E] relative overflow-hidden"
                    style={{
                      boxShadow: "0 0 15px rgba(198, 124, 78, 0.35)",
                    }}
                  >
                    {organization?.imageUrl ? (
                      <img src={organization.imageUrl} className="size-full object-cover" alt="" />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-gradient-to-br from-[#C67C4E] to-[#D4A373] text-white">
                        {organization?.name?.slice(0, 2).toUpperCase() || "OR"}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">{organization?.name}</h2>
                    <p className="text-xs font-semibold" style={{ color: S.sub }}>Organization Details</p>
                  </div>

                  <button
                    onClick={onClose}
                    className="absolute right-0 top-2 size-7 grid place-items-center rounded-lg transition-colors text-stone-500 hover:text-white"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Content Cards Grid */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Card: User Profile */}
                    <div
                      className="rounded-2xl border p-5 flex flex-col items-center justify-center text-center relative"
                      style={{
                        background: S.sidebar,
                        borderColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="size-20 rounded-full border-2 border-stone-850 overflow-hidden mb-3 ring-4 ring-[#C67C4E]/10">
                        {user?.imageUrl ? (
                          <img src={user.imageUrl} className="size-full object-cover" alt="" />
                        ) : (
                          <div className="size-full bg-stone-800 text-white font-bold flex items-center justify-center text-lg">
                            {userInitials}
                          </div>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white mb-0.5">{user?.fullName || "User"}</h3>
                      <div className="flex items-center gap-1 text-[11px] font-semibold mb-1.5" style={{ color: S.gold }}>
                        <User className="size-3 shrink-0" style={{ color: S.primary }} />
                        <span>{roleLabel(membership?.role || "org:member")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-stone-500 truncate w-full justify-center">
                        <Mail className="size-3 shrink-0" />
                        <span className="truncate max-w-[150px]">{user?.primaryEmailAddress?.emailAddress}</span>
                      </div>
                    </div>

                    {/* Right Side Cards */}
                    <div className="flex flex-col gap-4">
                      {/* Joined On Card */}
                      <div
                        className="flex items-center gap-3.5 p-4 rounded-2xl border flex-1"
                        style={{
                          background: S.sidebar,
                          borderColor: "rgba(255,255,255,0.05)",
                        }}
                      >
                        <div className="size-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
                          <Calendar className="size-4.5" />
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-stone-500 tracking-wider uppercase leading-none">Joined On</div>
                          <div className="text-sm font-bold text-white mt-1 leading-none">{fmtDate(membership?.createdAt)}</div>
                        </div>
                      </div>

                      {/* Role Card */}
                      <div
                        className="flex items-center gap-3.5 p-4 rounded-2xl border flex-1"
                        style={{
                          background: S.sidebar,
                          borderColor: "rgba(198,124,78,0.3)", // Copper border highlighting role card
                          boxShadow: "0 0 12px rgba(198, 124, 78, 0.05)",
                        }}
                      >
                        <div className="size-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
                          <Award className="size-4.5" />
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-stone-500 tracking-wider uppercase leading-none">Role</div>
                          <div className="text-sm font-bold text-white mt-1 leading-none">{roleLabel(membership?.role || "org:member")}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Card: Added By */}
                  <div
                    className="flex items-center gap-3.5 p-4.5 rounded-2xl border shrink-0"
                    style={{
                      background: S.sidebar,
                      borderColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="size-10 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-500 shrink-0">
                      <UserPlus className="size-4.5" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-stone-500 tracking-wider uppercase leading-none mb-1">Added By</div>
                      <div className="text-sm font-bold text-white leading-none">{adminName}</div>
                      <div className="text-[10px] text-stone-500 mt-1 leading-none">{adminEmail}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
