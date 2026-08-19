"use client";

import { useState, useEffect } from "react";
import useProfile from "@/hooks/useProfile";
import { 
  User, Store, Mail, Shield, Bell, Save, CheckCircle2, ChevronRight, Settings as SettingsIcon, Lock
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { profile, loading, updateProfile } = useProfile();
  const [activeSection, setActiveSection] = useState("account");
  const [form, setForm] = useState({
    full_name: "",
    store_name: "",
    location: "",
    email_notifications: true,
    sms_notifications: false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Password change state
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        store_name: profile.store_name || "",
        location: profile.location || "",
        email_notifications: profile.email_notifications !== false,
        sms_notifications: !!profile.sms_notifications,
      });
    }
  }, [profile]);

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess(false);
    setEmailSaving(true);
    try {
      const res = await fetch("/api/auth/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Something went wrong. Please try again.");
      } else {
        setEmailSuccess(true);
        setNewEmail("");
      }
    } catch {
      setEmailError("Unable to connect. Please try again.");
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (passwordForm.password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordForm.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Something went wrong. Please try again.");
      } else {
        setPasswordSuccess(true);
        setPasswordForm({ password: "", confirm: "" });
      }
    } catch {
      setPasswordError("Unable to connect. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccess(false);
    
    await updateProfile({
      full_name: form.full_name,
      store_name: form.store_name,
      location: form.location,
      email_notifications: form.email_notifications,
      sms_notifications: form.sms_notifications,
    });
    
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 800);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading settings…</p>
        </div>
      </div>
    );
  }

  const email = profile?.email || "user@example.com";

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1000px] mx-auto space-y-8">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-xl text-white">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Account Settings</h1>
              <p className="text-xs text-gray-400 mt-1">Manage your account credentials, notifications, and store settings</p>
            </div>
          </div>
          <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-1">
            Back to Dashboard <ChevronRight size={14} />
          </Link>
        </div>

        {/* Layout grid */}
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="md:col-span-1 flex flex-col gap-1">
            {[
              { id: "account", label: "Account Details", icon: User },
              { id: "security", label: "Login & Security", icon: Shield },
              { id: "notifications", label: "Notifications", icon: Bell },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveSection(section.id);
                  setSuccess(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeSection === section.id
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-500 hover:bg-white hover:text-black border border-transparent hover:border-gray-200"
                }`}
              >
                <section.icon size={16} />
                {section.label}
              </button>
            ))}
          </div>

          {/* Form Content area */}
          <div className="md:col-span-3 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSave} className="space-y-6">
              
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Settings updated successfully!
                </div>
              )}

              {activeSection === "account" && (
                <div className="space-y-6">
                  <h3 className="text-base font-bold text-black border-b border-gray-100 pb-3" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Account Details</h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Full Name</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                        <User size={14} className="text-gray-400" />
                        <input
                          type="text"
                          value={form.full_name}
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                          className="bg-transparent text-xs text-black w-full outline-none font-medium"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Store / Company Name</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                        <Store size={14} className="text-gray-400" />
                        <input
                          type="text"
                          value={form.store_name}
                          onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                          className="bg-transparent text-xs text-black w-full outline-none font-medium"
                          placeholder="e.g. Acme Goods"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Email Address (Read-only)</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed opacity-75">
                        <Mail size={14} className="text-gray-400" />
                        <input
                          type="text"
                          value={email}
                          disabled
                          className="bg-transparent text-xs text-gray-400 w-full outline-none font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Registered Location</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                        <Store size={14} className="text-gray-400" />
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          className="bg-transparent text-xs text-black w-full outline-none font-medium"
                          placeholder="e.g. San Francisco, CA"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "security" && (
                <div className="space-y-8">
                  <h3 className="text-base font-bold text-black border-b border-gray-100 pb-3" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Login & Security</h3>

                  {/* Change Email */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail size={15} className="text-gray-400" />
                      <span className="text-sm font-bold text-black">Change Email Address</span>
                    </div>
                    <p className="text-[11px] text-gray-400 -mt-2">
                      A confirmation link will be sent to your new address before the change takes effect. Both your old and new addresses will receive a security notification.
                    </p>

                    {emailSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                        <CheckCircle2 size={15} className="text-emerald-500" />
                        Confirmation email sent — check your inbox to complete the change.
                      </div>
                    )}
                    {emailError && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-600 font-semibold">
                        {emailError}
                      </div>
                    )}

                    <form onSubmit={handleEmailChange} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500">New Email Address</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                          <Mail size={14} className="text-gray-400 shrink-0" />
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            required
                            placeholder="new@example.com"
                            className="bg-transparent text-xs text-black w-full outline-none font-medium"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={emailSaving || !newEmail}
                        className="bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        <Save size={13} />
                        {emailSaving ? "Sending…" : "Update Email"}
                      </button>
                    </form>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Change Password */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-gray-400" />
                      <span className="text-sm font-bold text-black">Change Password</span>
                    </div>
                    <p className="text-[11px] text-gray-400 -mt-2">
                      You will receive a security email once your password is updated.
                    </p>

                    {passwordSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                        <CheckCircle2 size={15} className="text-emerald-500" />
                        Password updated successfully.
                      </div>
                    )}
                    {passwordError && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-600 font-semibold">
                        {passwordError}
                      </div>
                    )}

                    <form onSubmit={handlePasswordChange} className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500">New Password</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                          <Lock size={14} className="text-gray-400 shrink-0" />
                          <input
                            type="password"
                            value={passwordForm.password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                            required
                            placeholder="Min. 6 characters"
                            className="bg-transparent text-xs text-black w-full outline-none font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500">Confirm New Password</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                          <Lock size={14} className="text-gray-400 shrink-0" />
                          <input
                            type="password"
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                            required
                            placeholder="Repeat password"
                            className="bg-transparent text-xs text-black w-full outline-none font-medium"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={passwordSaving || !passwordForm.password || !passwordForm.confirm}
                          className="bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={13} />
                          {passwordSaving ? "Updating…" : "Update Password"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <h3 className="text-base font-bold text-black border-b border-gray-100 pb-3" style={{ fontFamily: "var(--font-hanken), sans-serif" }}>Preferences</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.email_notifications}
                        onChange={(e) => setForm({ ...form, email_notifications: e.target.checked })}
                        className="rounded border-gray-300 text-black focus:ring-black w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-black">Email notifications</span>
                        <p className="text-[10px] text-gray-400 font-medium">Receive order notifications and payout alerts by email.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.sms_notifications}
                        onChange={(e) => setForm({ ...form, sms_notifications: e.target.checked })}
                        className="rounded border-gray-300 text-black focus:ring-black w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-black">SMS text alerts</span>
                        <p className="text-[10px] text-gray-400 font-medium">Receive direct SMS notifications for crucial buyer delivery updates.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Save Button */}
              {activeSection !== "security" && (
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    {saving ? "Saving Changes…" : "Save Settings"}
                  </button>
                </div>
              )}

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
