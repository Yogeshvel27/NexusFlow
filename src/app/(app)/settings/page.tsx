"use client";


import { Building2, Bell, Lock, Palette, Plug, Users2 } from "lucide-react";
import { useState } from "react";



const tabs = [
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "team", label: "Team", icon: Users2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Plug },
];

function Settings() {
  const [active, setActive] = useState("workspace");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your workspace preferences</p>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive ? "bg-gradient-to-r from-primary/10 to-accent/5 text-foreground font-medium shadow-soft" : "text-muted-foreground hover:bg-secondary"
                }`}>
                <Icon className={`size-4 ${isActive ? "text-primary" : ""}`} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
          <div>
            <div className="font-semibold">Workspace Profile</div>
            <p className="text-sm text-muted-foreground">Public information visible to your organization</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium">Organization name</label>
              <input defaultValue="Praxis Consulting Group" className="mt-1.5 w-full h-10 px-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-[12px] font-medium">Workspace URL</label>
              <input defaultValue="praxis.io/workspace" className="mt-1.5 w-full h-10 px-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-[12px] font-medium">Default currency</label>
              <select className="mt-1.5 w-full h-10 px-3 rounded-xl bg-card border border-border focus:outline-none text-sm">
                <option>USD — US Dollar</option><option>EUR — Euro</option><option>GBP — British Pound</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium">Fiscal year start</label>
              <select className="mt-1.5 w-full h-10 px-3 rounded-xl bg-card border border-border focus:outline-none text-sm">
                <option>January</option><option>April</option><option>July</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <div className="font-semibold mb-3">Preferences</div>
            {[
              { l: "Weekly executive digest", d: "A summary of portfolio health every Monday" },
              { l: "Risk escalation alerts", d: "Immediate notification for critical risks" },
              { l: "Approval reminders", d: "Daily summary of pending approvals" },
            ].map((p) => (
              <label key={p.l} className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer">
                <div>
                  <div className="text-sm font-medium">{p.l}</div>
                  <div className="text-xs text-muted-foreground">{p.d}</div>
                </div>
                <div className="relative w-10 h-6 rounded-full bg-gradient-to-r from-primary to-accent shadow-inner">
                  <div className="absolute top-0.5 right-0.5 size-5 rounded-full bg-white shadow" />
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
            <button className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper">Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
