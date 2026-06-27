"use client";

import React, { useState, useEffect } from "react";
import { signOut }   from "next-auth/react";
import { Input }     from "@/components/ui/input";
import { Button }    from "@/components/ui/button";
import { useToast }  from "@/components/ui/toaster";
import { Download, Trash2, AlertCircle } from "lucide-react";

interface UserSettings {
  name:  string | null;
  email: string;
  plan:  string;
}

export default function ProfileSettingsPage() {
  const { toast }   = useToast();
  const [settings,  setSettings]  = useState<UserSettings | null>(null);
  const [name,      setName]      = useState("");
  const [saving,    setSaving]    = useState(false);
  // Delete account
  const [showDelete,   setShowDelete]   = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting,   setDeleting]   = useState(false);

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data: UserSettings) => {
        setSettings(data);
        setName(data.name ?? "");
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/user/settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    setSaving(false);
    toast({ title: res.ok ? "Profile saved." : "Failed to save.", type: res.ok ? "success" : "error" });
  }

  async function handleExport() {
    window.open("/api/user/export", "_blank");
  }

  async function handleDelete() {
    if (!deletePassword) return;
    setDeleting(true);
    const res  = await fetch("/api/user/delete", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password: deletePassword }),
    });
    setDeleting(false);

    if (res.ok) {
      toast({ title: "Account deleted.", type: "default" });
      signOut({ callbackUrl: "/" });
    } else {
      const data = await res.json();
      toast({ title: data.error ?? "Deletion failed.", type: "error" });
    }
  }

  if (!settings) {
    return (
      <div className="flex flex-col gap-4">
        {[60, 100, 60].map((w, i) => (
          <div key={i} style={{ width: `${w}%` }} className="h-9 bg-paper-sunken rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-sm">
      {/* Profile */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold mb-0.5">Profile</h2>
          <p className="text-sm text-ink-muted">Your name and email address.</p>
        </div>
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
        />
        <Input
          label="Email"
          value={settings.email}
          disabled
          className="opacity-60"
        />
        <div>
          <p className="text-xs font-medium text-ink-muted mb-1.5">Plan</p>
          <span className="inline-flex items-center px-2.5 py-1 rounded bg-paper-sunken text-sm font-medium">
            {settings.plan}
          </span>
        </div>
        <Button onClick={handleSave} loading={saving} className="self-start">
          Save changes
        </Button>
      </div>

      {/* Data export */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold mb-1">Export your data</h3>
        <p className="text-xs text-ink-muted mb-3">
          Download a JSON file containing all your sources, seen articles, bookmarks, and digest history.
        </p>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download size={13} /> Download export
        </Button>
      </div>

      {/* Delete account */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-red-500 mb-1">Delete account</h3>
        <p className="text-xs text-ink-muted mb-3">
          Permanently deletes your account and all data. This cannot be undone.
          Any active subscription will be cancelled.
        </p>
        {!showDelete ? (
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-500 hover:bg-red-50"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={13} /> Delete account
          </Button>
        ) : (
          <div className="flex flex-col gap-3 p-4 border border-red-200 rounded-xl bg-red-50">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">
                Enter your password to confirm account deletion. This action is irreversible.
              </p>
            </div>
            <Input
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="border-red-200"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowDelete(false); setDeletePassword(""); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-500 text-white hover:bg-red-600 border-0"
                loading={deleting}
                onClick={handleDelete}
                disabled={!deletePassword}
              >
                Delete my account
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
