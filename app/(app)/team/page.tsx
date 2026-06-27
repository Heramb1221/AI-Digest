"use client";
// app/(app)/team/page.tsx
// Full team management page — Phase 4 complete implementation.
// Tabs: Overview | Members | Sources

import React, { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Crown, Shield, User as UserIcon,
  Trash2, ChevronDown, Rss, Youtube, MessageSquare,
  Globe, Plus, Copy, Check, Settings, Loader2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { cn, getFaviconUrl } from "@/lib/utils";
import type { SourceType, TeamRole } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id:   string;
  role: TeamRole;
  user: { name: string | null; email: string; image: string | null };
}

interface TeamSource {
  id:          string;
  name:        string;
  url:         string;
  type:        SourceType;
  faviconUrl:  string | null;
  lastFetched: string | null;
}

interface TeamData {
  team:    { id: string; name: string; slug: string; plan: string; _count: { members: number; sources: number } } | null;
  members: Member[];
  sources: TeamSource[];
  myRole:  TeamRole | null;
}

interface PendingInvite {
  id:        string;
  email:     string;
  role:      TeamRole;
  expiresAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_META: Record<TeamRole, { icon: React.ReactNode; label: string; color: string }> = {
  OWNER:  { icon: <Crown  size={12} />, label: "Owner",  color: "text-amber-500" },
  ADMIN:  { icon: <Shield size={12} />, label: "Admin",  color: "text-blue-500"  },
  MEMBER: { icon: <UserIcon size={12} />, label: "Member", color: "text-ink-faint" },
};

const TYPE_ICONS: Record<SourceType, React.ReactNode> = {
  RSS:     <Rss           size={13} />,
  YOUTUBE: <Youtube       size={13} />,
  REDDIT:  <MessageSquare size={13} />,
  EMAIL:   <MessageSquare size={13} />,
  SCRAPE:  <Globe         size={13} />,
};

type Tab = "overview" | "members" | "sources";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { toast }              = useToast();
  const [data,     setData]    = useState<TeamData | null>(null);
  const [invites,  setInvites] = useState<PendingInvite[]>([]);
  const [loading,  setLoading] = useState(true);
  const [tab,      setTab]     = useState<Tab>("overview");
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState("");

  const loadData = useCallback(async () => {
    const [teamRes, inviteRes] = await Promise.all([
      fetch("/api/team"),
      fetch("/api/team/invite"),
    ]);
    const teamData   = await teamRes.json();
    const inviteData = inviteRes.ok ? await inviteRes.json() : { invites: [] };
    setData(teamData);
    setInvites(inviteData.invites ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/team", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: teamName }),
    });
    const body = await res.json();
    setCreating(false);
    if (res.ok) {
      toast({ title: "Team created!", type: "success" });
      loadData();
    } else {
      if (body.upgrade) {
        toast({ title: "Team plan required", description: "Upgrade to TEAM plan to create a workspace.", type: "error" });
      } else {
        toast({ title: body.error ?? "Failed to create team.", type: "error" });
      }
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 flex items-center gap-2 text-ink-muted">
        <Loader2 size={16} className="animate-spin" /> Loading team…
      </div>
    );
  }

  // No team yet
  if (!data?.team) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 flex flex-col items-center text-center gap-6">
        <div className="h-16 w-16 rounded-2xl bg-paper-sunken flex items-center justify-center">
          <Users size={28} className="text-ink-faint" />
        </div>
        <div>
          <h1 className="text-xl font-semibold mb-2">You're not in a team yet</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Create a workspace to share sources with colleagues. Team plan required.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <Input
            placeholder="Workspace name e.g. Acme Engineering"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
          />
          <Button loading={creating} onClick={handleCreateTeam} className="w-full">
            <Plus size={14} /> Create workspace
          </Button>
        </div>
        <p className="text-xs text-ink-faint">
          Have an invite link?{" "}
          <a href="/accept-invite" className="text-accent underline underline-offset-2">Accept it here</a>
        </p>
      </div>
    );
  }

  const { team, members, sources, myRole } = data;
  const isPrivileged = myRole === "OWNER" || myRole === "ADMIN";

  async function handleLeaveTeam() {
    if (!confirm("Leave this team? You'll lose access to all shared sources.")) return;
    const res  = await fetch("/api/team/leave", { method: "POST" });
    const body = await res.json();
    if (res.ok) {
      toast({ title: body.message ?? "Left team.", type: "default" });
      loadData();
    } else {
      toast({ title: body.error ?? "Could not leave team.", type: "error" });
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{team.name}</h1>
          <p className="text-sm text-ink-muted">
            {team._count.members} member{team._count.members !== 1 ? "s" : ""} · {team._count.sources} source{team._count.sources !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {myRole !== "OWNER" && (
            <button
              onClick={handleLeaveTeam}
              className="text-xs text-ink-faint hover:text-red-500 transition-colors border border-border rounded-md px-2.5 py-1.5"
            >
              Leave team
            </button>
          )}
          <span className="text-xs font-semibold bg-accent-subtle text-accent px-2.5 py-1 rounded-full border border-accent/20">
            {myRole?.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["overview", "members", "sources"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px",
              tab === t
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab team={team} members={members} sources={sources} myRole={myRole} />
      )}
      {tab === "members" && (
        <MembersTab
          members={members}
          invites={invites}
          myRole={myRole}
          isPrivileged={isPrivileged}
          onRefresh={loadData}
          toast={toast}
        />
      )}
      {tab === "sources" && (
        <SourcesTab
          sources={sources}
          isPrivileged={isPrivileged}
          teamId={team.id}
          onRefresh={loadData}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ team, members, sources, myRole }: {
  team: NonNullable<TeamData["team"]>;
  members: Member[];
  sources: TeamSource[];
  myRole: TeamRole | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Members",   value: team._count.members  },
          { label: "Sources",   value: team._count.sources  },
          { label: "Plan",      value: team.plan            },
        ].map(({ label, value }) => (
          <div key={label} className="border border-border rounded-xl p-4 bg-paper-raised text-center">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent members */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Members</h3>
        <div className="flex flex-col gap-1">
          {members.slice(0, 5).map((m) => {
            const meta = ROLE_META[m.role];
            return (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-paper-raised">
                <div className="h-7 w-7 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                  {(m.user.name ?? m.user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user.name ?? m.user.email}</p>
                  {m.user.name && <p className="text-xs text-ink-faint truncate">{m.user.email}</p>}
                </div>
                <span className={cn("flex items-center gap-1 text-xs", meta.color)}>
                  {meta.icon} {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ members, invites, myRole, isPrivileged, onRefresh, toast }: {
  members:      Member[];
  invites:      PendingInvite[];
  myRole:       TeamRole | null;
  isPrivileged: boolean;
  onRefresh:    () => void;
  toast:        (opts: { title: string; type: "success"|"error"|"default" }) => void;
}) {
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState<"MEMBER"|"ADMIN">("MEMBER");
  const [inviting,     setInviting]     = useState(false);
  const [removing,     setRemoving]     = useState<string | null>(null);
  const [copied,       setCopied]       = useState<string | null>(null);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch("/api/team/invite", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    const data = await res.json();
    if (res.ok) {
      toast({ title: `Invite sent to ${inviteEmail}.`, type: "success" });
      setInviteEmail("");
      onRefresh();
    } else {
      toast({ title: data.error ?? "Failed to send invite.", type: "error" });
    }
  }

  async function handleRemove(memberId: string, email: string) {
    if (!confirm(`Remove ${email} from the team?`)) return;
    setRemoving(memberId);
    await fetch(`/api/team/members/${memberId}`, { method: "DELETE" });
    setRemoving(null);
    toast({ title: `${email} removed.`, type: "default" });
    onRefresh();
  }

  async function handleRoleChange(memberId: string, role: string) {
    const res = await fetch(`/api/team/members/${memberId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ role }),
    });
    if (res.ok) {
      toast({ title: "Role updated.", type: "success" });
      onRefresh();
    } else {
      const data = await res.json();
      toast({ title: data.error ?? "Failed to update role.", type: "error" });
    }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Invite link copied.", type: "success" });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Invite form */}
      {isPrivileged && (
        <div className="border border-border rounded-xl p-4 bg-paper-raised flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Invite a teammate</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "MEMBER"|"ADMIN")}
              className="border border-border rounded px-2 text-sm bg-paper-raised text-ink"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button loading={inviting} onClick={handleInvite}>
              <UserPlus size={14} /> Invite
            </Button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold mb-1">Members ({members.length})</h3>
        {members.map((m) => {
          const meta    = ROLE_META[m.role];
          const canEdit = isPrivileged && m.role !== "OWNER";
          return (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-paper-raised group">
              <div className="h-7 w-7 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                {(m.user.name ?? m.user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name ?? m.user.email}</p>
                {m.user.name && <p className="text-xs text-ink-faint truncate">{m.user.email}</p>}
              </div>

              {/* Role selector (OWNER/ADMIN can change non-owner roles) */}
              {canEdit ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  className="text-xs border border-border rounded px-1.5 py-0.5 bg-paper-raised text-ink"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              ) : (
                <span className={cn("flex items-center gap-1 text-xs", meta.color)}>
                  {meta.icon} {meta.label}
                </span>
              )}

              {/* Remove button */}
              {canEdit && (
                <button
                  onClick={() => handleRemove(m.id, m.user.email)}
                  disabled={removing === m.id}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all"
                >
                  {removing === m.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold mb-1 text-ink-muted">Pending invites ({invites.length})</h3>
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-border bg-paper-sunken">
              <div className="h-7 w-7 rounded-full bg-paper-sunken border border-border flex items-center justify-center text-ink-faint text-xs shrink-0">
                ?
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-muted truncate">{inv.email}</p>
                <p className="text-xs text-ink-faint">
                  {inv.role.toLowerCase()} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => copyInviteLink(inv.id)}
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
              >
                {copied === inv.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                Copy link
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sources tab ──────────────────────────────────────────────────────────────

function SourcesTab({ sources, isPrivileged, teamId, onRefresh, toast }: {
  sources:      TeamSource[];
  isPrivileged: boolean;
  teamId:       string;
  onRefresh:    () => void;
  toast:        (opts: { title: string; description?: string; type: "success"|"error"|"default" }) => void;
}) {
  const [showAdd,    setShowAdd]    = useState(false);
  const [addType,    setAddType]    = useState<SourceType>("RSS");
  const [addName,    setAddName]    = useState("");
  const [addUrl,     setAddUrl]     = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError,   setAddError]   = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  // OPML
  const [opmlLoading, setOpmlLoading] = useState(false);

  async function handleAdd() {
    setAddError(null);
    if (!addName.trim() || !addUrl.trim()) { setAddError("Name and URL are required."); return; }
    setAddLoading(true);
    const res = await fetch("/api/team/sources", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: addType, name: addName.trim(), url: addUrl.trim() }),
    });
    setAddLoading(false);
    if (res.ok) {
      toast({ title: `"${addName}" added to team.`, type: "success" });
      setAddName(""); setAddUrl(""); setShowAdd(false);
      onRefresh();
    } else {
      const data = await res.json();
      setAddError(data.error ?? "Failed to add source.");
    }
  }

  async function handleDelete(id: string, name: string) {
    setDeleting(id);
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    setDeleting(null);
    toast({ title: `"${name}" removed.`, type: "default" });
    onRefresh();
  }

  async function handleOPML(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpmlLoading(true);
    const text = await file.text();
    const res  = await fetch("/api/sources/opml", {
      method:  "POST",
      headers: { "Content-Type": "text/xml" },
      body:    text,
    });
    setOpmlLoading(false);
    const data = await res.json();
    toast({ title: `Imported ${data.added} sources.`, description: data.limited ? "Some skipped due to limits." : undefined, type: "success" });
    onRefresh();
    e.target.value = "";
  }

  const SOURCE_TYPES: { type: SourceType; label: string }[] = [
    { type: "RSS",     label: "RSS / Blog"     },
    { type: "YOUTUBE", label: "YouTube"         },
    { type: "REDDIT",  label: "Subreddit"       },
    { type: "SCRAPE",  label: "Webpage"         },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Actions bar */}
      {isPrivileged && (
        <div className="flex gap-2 justify-end">
          <label className="cursor-pointer">
            <input type="file" accept=".opml,.xml" className="hidden" onChange={handleOPML} disabled={opmlLoading} />
            <Button variant="outline" size="sm" className="pointer-events-none" loading={opmlLoading}>
              Import OPML
            </Button>
          </label>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={13} /> Add source
          </Button>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="border border-border rounded-xl p-4 bg-paper-raised flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Add team source</h3>
          <div className="flex flex-wrap gap-2">
            {SOURCE_TYPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setAddType(type)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                  addType === type ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" placeholder="Source name" value={addName} onChange={(e) => setAddName(e.target.value)} />
            <Input label="URL" type="url" placeholder="https://…" value={addUrl} onChange={(e) => { setAddUrl(e.target.value); setAddError(null); }} />
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" loading={addLoading} onClick={handleAdd}>Add</Button>
          </div>
        </div>
      )}

      {/* Source list */}
      {sources.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-ink-muted">No shared sources yet.</p>
          {isPrivileged && <p className="text-xs text-ink-faint mt-1">Add sources that all team members can see in their digest.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-paper-raised group">
              <img
                src={s.faviconUrl ?? getFaviconUrl(s.url)}
                alt=""
                className="h-4 w-4 rounded object-contain shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-ink-faint truncate">{s.url}</p>
              </div>
              <span className="flex items-center gap-1 text-2xs text-ink-faint bg-paper-sunken px-1.5 py-0.5 rounded shrink-0">
                {TYPE_ICONS[s.type]} {s.type}
              </span>
              {isPrivileged && (
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  disabled={deleting === s.id}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all shrink-0"
                >
                  {deleting === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
