"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Edit3,
  FileText,
  Heart,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Upload,
  User,
  X,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import useProfile from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { resolveUserRole } from "@/lib/auth";
import { getUserInitial } from "@/lib/utils";

function getWishlistCount(userId) {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(`cheaper_wishlist_ids_${userId}`);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.length : 0;
  } catch {
    return 0;
  }
}

export default function BuyerProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error, updateProfile, setProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({
    orders: 0,
    delivered: 0,
    saved: 0,
    spent: 0,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.email_confirmed_at) {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
      return;
    }

    let cancelled = false;
    async function verifyBuyer() {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role = resolveUserRole(user, profileRow?.role);
      if (!cancelled && role !== "buyer") {
        router.replace(role === "vendor" ? "/vendor-profile" : "/dashboard");
      }
    }

    verifyBuyer();
    return () => {
      cancelled = true;
    };
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function loadBuyerStats() {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("status, total")
        .eq("buyer_id", user.id);

      if (cancelled) return;
      if (ordersError) {
        setStats((current) => ({ ...current, loading: false }));
        return;
      }

      const orderRows = orders || [];
      setStats({
        orders: orderRows.length,
        delivered: orderRows.filter((order) => order.status === "delivered").length,
        saved: getWishlistCount(user.id),
        spent: orderRows.reduce((total, order) => total + (Number(order.total) || 0), 0),
        loading: false,
      });
    }

    loadBuyerStats();
    const refreshWishlist = () =>
      setStats((current) => ({ ...current, saved: getWishlistCount(user.id) }));
    window.addEventListener("storage", refreshWishlist);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", refreshWishlist);
    };
  }, [user?.id]);

  const loading = authLoading || profileLoading;
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Buyer";
  const memberSince = useMemo(() => {
    const value = profile?.created_at || user?.created_at;
    return value
      ? new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Recently";
  }, [profile?.created_at, user?.created_at]);

  function startEdit() {
    setEditForm({
      full_name: profile?.full_name || displayName,
      phone_number: profile?.phone_number || profile?.phone || "",
      location: profile?.location || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
      avatar_file: null,
    });
    setSaveError(null);
    setSaveSuccess(false);
    setIsEditing(true);
  }

  async function handleSave(event) {
    event?.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    try {
      let finalAvatarUrl = editForm.avatar_url || "";

      if (editForm.avatar_file) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", editForm.avatar_file);
        const uploadResponse = await fetch("/api/profile/avatar", {
          method: "POST",
          body: formData,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadResult.message || "Profile image upload failed.");
        }
        finalAvatarUrl = uploadResult.url;
      }

      const result = await updateProfile({
        full_name: editForm.full_name?.trim() || displayName,
        phone_number: editForm.phone_number?.trim() || "",
        phone: editForm.phone_number?.trim() || "",
        location: editForm.location?.trim() || "",
        bio: editForm.bio?.trim() || "",
        avatar_url: finalAvatarUrl,
      });

      if (result?.error) {
        setSaveError(result.error.message || "Could not save your profile.");
        return;
      }

      if (result.data) {
        setProfile(result.data);
        window.dispatchEvent(new CustomEvent("profile-updated", { detail: result.data }));
      }
      setIsEditing(false);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 4000);
    } catch (saveErr) {
      setSaveError(saveErr.message || "Could not upload or save your profile picture.");
    } finally {
      setIsUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md">
          <p className="text-red-700 font-semibold mb-2">Error loading profile</p>
          <p className="text-xs text-red-500">{error.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1180px] mx-auto space-y-8">
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {profile?.avatar_url ? (
                profile.avatar_url.startsWith("data:application/pdf") || profile.avatar_url.endsWith(".pdf") ? (
                  <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center text-red-600">
                    <FileText size={28} />
                    <span className="text-[9px] font-bold mt-1">PDF</span>
                  </div>
                ) : (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                  />
                )
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                  {getUserInitial(profile, user)}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-black">{displayName}</h1>
                  <span className="text-xs text-gray-500 font-medium">Buyer</span>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <ShieldCheck size={10} /> Verified account
                  </span>
                  {stats.orders > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                      <Award size={10} /> Active shopper
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-gray-400 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <Mail size={12} /> {profile?.email || user?.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Member since {memberSince}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              {isEditing ? (
                <div className="flex gap-2">
                  <button onClick={handleSave} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="border border-gray-200 text-gray-600 bg-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition flex items-center gap-1.5">
                    <X size={14} /> Cancel
                  </button>
                </div>
              ) : (
                <button onClick={startEdit} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5">
                  <Edit3 size={14} /> Edit profile
                </button>
              )}
            </div>
          </div>
        </section>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm font-semibold">
            Profile updated successfully.
          </div>
        )}
        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm font-semibold flex items-center justify-between">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)}><X size={16} /></button>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Orders placed", value: stats.loading ? "…" : stats.orders, icon: ShoppingBag, color: "text-blue-600 bg-blue-50 border-blue-100" },
            { label: "Items delivered", value: stats.loading ? "…" : stats.delivered, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
            { label: "Saved items", value: stats.loading ? "…" : stats.saved, icon: Heart, color: "text-pink-600 bg-pink-50 border-pink-100" },
            { label: "Total spent", value: stats.loading ? "…" : `$${stats.spent.toFixed(2)}`, icon: Package, color: "text-amber-600 bg-amber-50 border-amber-100" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-xl border ${stat.color}`}><stat.icon size={20} /></div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-black mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-3">Profile details</h2>
            <form onSubmit={handleSave} className="grid sm:grid-cols-2 gap-6">
              {[
                { label: "Full name", field: "full_name", icon: User },
                { label: "Email address", value: profile?.email || user?.email, icon: Mail, disabled: true },
                { label: "Phone number", field: "phone_number", icon: Phone },
                { label: "Location", field: "location", icon: MapPin },
              ].map((field) => (
                <div key={field.label} className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">{field.label}</label>
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <field.icon size={14} className="text-gray-400 flex-shrink-0" />
                    {isEditing && !field.disabled ? (
                      <input
                        value={editForm[field.field] || ""}
                        onChange={(event) => setEditForm({ ...editForm, [field.field]: event.target.value })}
                        className="w-full bg-transparent outline-none text-sm text-black"
                      />
                    ) : (
                      <span className="text-sm text-gray-700 truncate">{field.disabled ? field.value : profile?.[field.field] || "Not provided"}</span>
                    )}
                  </div>
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Profile picture</label>
                {isEditing ? (
                  <label className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 transition">
                    {editForm.avatar_url ? (
                      <img
                        src={editForm.avatar_url}
                        alt="Selected profile preview"
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        <User size={14} className="text-gray-400" />
                      </div>
                    )}
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <Upload size={13} /> Choose image
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) {
                          setSaveError("Please choose an image file.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setEditForm((current) => ({
                              ...current,
                              avatar_url: URL.createObjectURL(file),
                              avatar_file: file,
                            }));
                            setSaveError(null);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <User size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700">Saved to your profile</span>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">About you</label>
                {isEditing ? (
                  <textarea
                    value={editForm.bio || ""}
                    onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-black outline-none"
                    placeholder="Tell sellers a little about yourself"
                  />
                ) : (
                  <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4">
                    {profile?.bio || "No description provided."}
                  </p>
                )}
              </div>
              {isEditing && (
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5">
                    <Save size={14} /> {isUploading ? "Uploading…" : "Save changes"}
                  </button>
                </div>
              )}
            </form>
          </div>

          <aside className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-3">Your activity</h2>
              {[
                { label: "Shopping history", value: `${stats.orders} orders`, icon: ShoppingBag, href: "/dashboard/buyer?tab=orders" },
                { label: "Saved products", value: `${stats.saved} saved`, icon: Heart, href: "/dashboard/buyer?tab=wishlist" },
                { label: "Browse marketplace", value: "Find products", icon: Search, href: "/dashboard/buyer/marketplace" },
                { label: "Account settings", value: "Manage preferences", icon: Settings, href: "/settings" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center"><item.icon size={16} className="text-gray-500" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-black">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.value}</p>
                  </div>
                  <Activity size={14} className="text-gray-300 group-hover:text-black" />
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}