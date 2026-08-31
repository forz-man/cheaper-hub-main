"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings as SettingsIcon,
  Shield,
  Store,
  Upload,
  User,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useProfile from "@/hooks/useProfile";
import { hasPasswordIdentity } from "@/lib/account-settings.mjs";
import { dashboardTabHref, resolveUserRole } from "@/lib/auth";

const EMPTY_FORM = {
  full_name: "",
  phone_number: "",
  location: "",
  bio: "",
  avatar_url: "",
  store_name: "",
  website: "",
  email_notifications: true,
  sms_notifications: false,
};

function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-black focus-within:ring-1 focus-within:ring-black">
        <Icon size={14} className="text-gray-400 shrink-0" />
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [activeSection, setActiveSection] = useState("account");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirm: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const role = resolveUserRole(user, profile?.role);
  const isVendor = role === "vendor";
  const canUsePassword = hasPasswordIdentity(user);
  const loading = authLoading || profileLoading;
  const dashboardHref = dashboardTabHref(role);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/settings");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || "",
      phone_number: profile.phone_number || profile.phone || "",
      location: profile.location || "",
      bio: profile.bio || "",
      avatar_url: profile.avatar_url || "",
      store_name: profile.store_name || "",
      website: profile.website || "",
      email_notifications: profile.email_notifications !== false,
      sms_notifications: !!profile.sms_notifications,
    });
  }, [profile]);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (["account", "security", "notifications"].includes(section)) {
      setActiveSection(section);
    }
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAvatar(file) {
    if (!file) return;
    setSaveError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Profile image upload failed.");
      updateField("avatar_url", payload.url);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    const updates = {
      full_name: form.full_name,
      phone_number: form.phone_number,
      location: form.location,
      bio: form.bio,
      avatar_url: form.avatar_url,
      email_notifications: form.email_notifications,
      sms_notifications: form.sms_notifications,
      ...(isVendor ? { store_name: form.store_name, website: form.website } : {}),
    };
    const result = await updateProfile(updates);
    setSaving(false);
    if (result?.error) {
      setSaveError(result.error.message || "Could not save your settings.");
      return;
    }
    setSaveMessage("Your account settings are synced across Cheaper.");
  }

  async function handleEmailChange(event) {
    event.preventDefault();
    setEmailSaving(true);
    setEmailError("");
    setEmailMessage("");
    try {
      const response = await fetch("/api/auth/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not request the email change.");
      setNewEmail("");
      setEmailMessage(
        payload.warning ||
          "Email change requested. Supabase will send the confirmation link; Cheaper's separate security notice was queued."
      );
    } catch (error) {
      setEmailError(error.message);
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.password.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          password: passwordForm.password,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update your password.");
      setPasswordForm({ currentPassword: "", password: "", confirm: "" });
      setPasswordMessage(payload.warning || "Password updated and the security email was queued.");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1040px] mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-xl text-white"><SettingsIcon size={20} /></div>
            <div>
              <h1 className="text-2xl font-bold text-black">Account Settings</h1>
              <p className="text-xs text-gray-400 mt-1">
                One place for your {isVendor ? "vendor" : "buyer"} profile, security, and preferences
              </p>
            </div>
          </div>
          <Link href={dashboardHref} className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1">
            Back to Dashboard <ChevronRight size={14} />
          </Link>
        </header>

        <div className="grid md:grid-cols-4 gap-8">
          <nav className="md:col-span-1 flex md:flex-col gap-1 overflow-x-auto">
            {[
              { id: "account", label: "Profile & account", icon: User },
              { id: "security", label: "Login & security", icon: Shield },
              { id: "notifications", label: "Notifications", icon: Bell },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveSection(id);
                  window.history.replaceState({}, "", `/settings?section=${id}`);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left whitespace-nowrap ${
                  activeSection === id ? "bg-black text-white" : "text-gray-500 hover:bg-white"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>

          <section className="md:col-span-3 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            {activeSection === "account" && (
              <form onSubmit={handleSave} className="space-y-6">
                <h2 className="text-base font-bold border-b border-gray-100 pb-3">Profile & account details</h2>
                {saveMessage && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">{saveMessage}</p>}
                {saveError && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">{saveError}</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name" icon={User}>
                    <input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="bg-transparent text-sm w-full outline-none" required />
                  </Field>
                  <Field label="Confirmed email" icon={Mail}>
                    <input value={user?.email || profile?.email || ""} disabled className="bg-transparent text-sm text-gray-400 w-full outline-none" />
                  </Field>
                  <Field label="Phone number" icon={Phone}>
                    <input value={form.phone_number} onChange={(e) => updateField("phone_number", e.target.value)} className="bg-transparent text-sm w-full outline-none" />
                  </Field>
                  <Field label="Location" icon={MapPin}>
                    <input value={form.location} onChange={(e) => updateField("location", e.target.value)} className="bg-transparent text-sm w-full outline-none" />
                  </Field>
                  {isVendor && (
                    <>
                      <Field label="Store / business name" icon={Store}>
                        <input value={form.store_name} onChange={(e) => updateField("store_name", e.target.value)} className="bg-transparent text-sm w-full outline-none" />
                      </Field>
                      <Field label="Website" icon={Globe}>
                        <input type="url" value={form.website} onChange={(e) => updateField("website", e.target.value)} className="bg-transparent text-sm w-full outline-none" />
                      </Field>
                    </>
                  )}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Profile picture</label>
                    <label className="flex items-center gap-3 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
                      {form.avatar_url ? <img src={form.avatar_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <User size={18} className="text-gray-400" />}
                      <span className="text-xs font-semibold text-gray-600"><Upload size={13} className="inline mr-1" />{uploading ? "Uploading…" : "Choose image"}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading} onChange={(e) => handleAvatar(e.target.files?.[0])} />
                    </label>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">{isVendor ? "About your store" : "About you"}</label>
                    <textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} rows={4} maxLength={1000} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none" />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button disabled={saving || uploading} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                    <Save size={14} /> {saving ? "Saving…" : "Save account details"}
                  </button>
                </div>
              </form>
            )}

            {activeSection === "security" && (
              <div className="space-y-8">
                <h2 className="text-base font-bold border-b border-gray-100 pb-3">Login & security</h2>
                <form onSubmit={handleEmailChange} className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Mail size={15} /> Change email</h3>
                  <p className="text-xs text-gray-400">Your profile will update only after Supabase confirms the new address.</p>
                  {emailMessage && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{emailMessage}</p>}
                  {emailError && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{emailError}</p>}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Field label="New email address" icon={Mail}>
                      <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-transparent text-sm w-full outline-none" required />
                    </Field>
                    <button disabled={emailSaving} className="self-end bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">{emailSaving ? "Sending…" : "Request change"}</button>
                  </div>
                </form>

                <div className="border-t border-gray-100" />
                {canUsePassword ? (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2"><Lock size={15} /> Change password</h3>
                    <p className="text-xs text-gray-400">For your security, confirm your current password first.</p>
                    {passwordMessage && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{passwordMessage}</p>}
                    {passwordError && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{passwordError}</p>}
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        ["Current password", "currentPassword"],
                        ["New password", "password"],
                        ["Confirm new password", "confirm"],
                      ].map(([label, key]) => (
                        <Field key={key} label={label} icon={Lock}>
                          <input type="password" value={passwordForm[key]} onChange={(e) => setPasswordForm((current) => ({ ...current, [key]: e.target.value }))} className="bg-transparent text-sm w-full outline-none" required />
                        </Field>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button disabled={passwordSaving} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">{passwordSaving ? "Updating…" : "Update password"}</button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
                    <h3 className="text-sm font-bold text-blue-900">Google sign-in account</h3>
                    <p className="text-xs text-blue-700 mt-1">You do not currently use a Cheaper password. You can securely create one through an email verification link.</p>
                    <Link href="/forgot-password" className="inline-block mt-3 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">Set up a password</Link>
                  </div>
                )}
              </div>
            )}

            {activeSection === "notifications" && (
              <form onSubmit={handleSave} className="space-y-6">
                <h2 className="text-base font-bold border-b border-gray-100 pb-3">Notification preferences</h2>
                {saveMessage && <p className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{saveMessage}</p>}
                {saveError && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{saveError}</p>}
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={form.email_notifications} onChange={(e) => updateField("email_notifications", e.target.checked)} className="mt-1" />
                  <span><strong className="block text-sm">Email notifications</strong><span className="text-xs text-gray-400">Receive order, payout, and account alerts by email. Essential security emails are always sent.</span></span>
                </label>
                <label className="flex items-start gap-3 opacity-60">
                  <input type="checkbox" checked={form.sms_notifications} onChange={(e) => updateField("sms_notifications", e.target.checked)} className="mt-1" />
                  <span><strong className="block text-sm">SMS preference</strong><span className="text-xs text-gray-400">Save your preference for future SMS support. Text delivery is not active yet.</span></span>
                </label>
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button disabled={saving} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"><Save size={14} />{saving ? "Saving…" : "Save preferences"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}