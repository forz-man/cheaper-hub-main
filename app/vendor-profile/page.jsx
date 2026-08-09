"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import useProfile from "@/hooks/useProfile";
import useVendorStats from "@/hooks/useVendorStats";
import { supabase } from "@/lib/supabase";
import { 
  User, Store, Mail, Phone, Globe, MapPin, Calendar, 
  Award, ShieldCheck, PhoneCall, ListCollapse, BarChart3, 
  Settings as SettingsIcon, Activity as ActivityIcon, Edit3, Save, X,
  FileText, Camera, Upload
} from "lucide-react";
import { getUserInitial } from "@/lib/utils";

export default function VendorProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error, updateProfile, setProfile } = useProfile();
  const vendorStats = useVendorStats(user?.id);
  const [activeTab, setActiveTab] = useState("Overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Dynamic Performance Metrics State
  const [performance, setPerformance] = useState({
    fulfillmentRate: "100% (New Seller)",
    buyerRating: "No ratings yet",
    responseRate: "100%",
    loading: true,
  });

  // Cropper & Upload States
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [imagePos, setImagePos] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.email_confirmed_at) {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchPerformanceMetrics() {
      try {
        // 1. Fulfillment Rate
        const { data: orderItems, error: itemsErr } = await supabase
          .from("order_items")
          .select("fulfillment_status")
          .eq("vendor_id", user.id);

        let fulfillmentRate = "100% (New Seller)";
        if (!itemsErr && orderItems && orderItems.length > 0) {
          const totalOrders = orderItems.length;
          const fulfilledOrders = orderItems.filter(item => 
            item.fulfillment_status === "shipped" || item.fulfillment_status === "delivered"
          ).length;
          const rate = Math.round((fulfilledOrders / totalOrders) * 100);
          fulfillmentRate = `${rate}%`;
        }

        // 2. Buyer Rating
        const { data: reviews, error: reviewsErr } = await supabase
          .from("reviews")
          .select("rating, products!inner(vendor_id)")
          .eq("products.vendor_id", user.id);

        let buyerRating = "No ratings yet";
        if (!reviewsErr && reviews && reviews.length > 0) {
          const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
          const avgRating = (totalRating / reviews.length).toFixed(1);
          buyerRating = `${avgRating} / 5.0`;
        }

        // 3. Response Rate
        const { data: conversations, error: convErr } = await supabase
          .from("conversations")
          .select("id, buyer_id")
          .eq("seller_id", user.id);

        let responseRate = "100%";
        if (!convErr && conversations && conversations.length > 0) {
          let totalIncoming = 0;
          let responded = 0;

          for (const conv of conversations) {
            const { data: msgs, error: msgsErr } = await supabase
              .from("messages")
              .select("sender_id, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: true });

            if (!msgsErr && msgs && msgs.length > 0) {
              const firstBuyerMsgIdx = msgs.findIndex(m => m.sender_id === conv.buyer_id);
              if (firstBuyerMsgIdx !== -1) {
                totalIncoming++;
                const sellerReplied = msgs.slice(firstBuyerMsgIdx + 1).some(m => m.sender_id === user.id);
                if (sellerReplied) {
                  responded++;
                }
              }
            }
          }

          if (totalIncoming > 0) {
            responseRate = `${Math.round((responded / totalIncoming) * 100)}%`;
          }
        }

        setPerformance({
          fulfillmentRate,
          buyerRating,
          responseRate,
          loading: false,
        });
      } catch (err) {
        console.error("Error fetching performance metrics:", err);
        setPerformance(prev => ({ ...prev, loading: false }));
      }
    }

    fetchPerformanceMetrics();
  }, [user?.id]);

  const loading = authLoading || profileLoading;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["Overview", "Activity", "Settings"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md">
          <p className="text-red-700 font-semibold mb-2">Error loading profile</p>
          <p className="text-xs text-red-500">{error.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const startEdit = () => {
    setEditForm({
      full_name: profile?.full_name || "",
      store_name: profile?.store_name || "",
      phone_number: profile?.phone_number || profile?.phone || "",
      website: profile?.website || "",
      location: profile?.location || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
    });
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user session found.");

      let finalAvatarUrl = editForm.avatar_url || "";
      if (finalAvatarUrl.startsWith("data:")) {
        setIsUploading(true);
        try {
          const response = await fetch(finalAvatarUrl);
          const blob = await response.blob();
          const fileExt = blob.type.split('/')[1] || 'jpg';
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: true
            });

          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            finalAvatarUrl = publicUrl;
          } else {
            console.warn("Supabase storage upload failed, falling back to saving data URL:", uploadErr);
          }
        } catch (uploadErr) {
          console.warn("Storage upload exception, falling back to saving data URL:", uploadErr);
        } finally {
          setIsUploading(false);
        }
      }

      const cleanPayload = {
        id: user.id, // Primary key
        email: user?.email || profile?.email || profile?.emailAddress || '',
        full_name: editForm.full_name || editForm.fullName || '',
        store_name: editForm.store_name || editForm.storeName || '',
        phone_number: editForm.phone_number || editForm.phoneNumber || '',
        phone: editForm.phone_number || editForm.phoneNumber || '', // Backward compatibility
        website: editForm.website || '',
        location: editForm.location || '',
        bio: editForm.bio || '',
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString()
      };

      const { data, error: saveErr } = await supabase
        .from('profiles')
        .upsert(cleanPayload, { onConflict: 'id' })
        .select()
        .single();

      if (saveErr) {
        console.error("Save failed:", saveErr);
        throw saveErr;
      }

      // Merge new data with existing profile state so we preserve badges, listings_count, etc. in UI
      setProfile({
        ...profile,
        ...data
      });
      setSaveSuccess(true);
      setIsEditing(false);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("Profile Save Error:", err);
      setSaveError(err.message || "An unexpected error occurred while saving.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto space-y-8">
        
        {/* ── TOP HEADER CARD ── */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Avatar first letter */}
              {profile?.avatar_url ? (
                (profile.avatar_url.startsWith("data:application/pdf") || profile.avatar_url.endsWith(".pdf")) ? (
                  <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center shadow-lg flex-shrink-0 text-red-600">
                    <FileText size={32} />
                    <span className="text-[9px] font-bold mt-1 uppercase">PDF Profile</span>
                  </div>
                ) : (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name || "Avatar"} 
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg flex-shrink-0" 
                  />
                )
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center text-white font-bold text-3xl shadow-lg flex-shrink-0">
                  {getUserInitial(profile, user)}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-black">{profile?.full_name}</h1>
                  <span className="text-xs text-gray-500 font-medium">@{profile?.username}</span>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                  {profile?.badges?.map((badge, idx) => {
                    const Icon = badge.includes("Email") ? ShieldCheck : badge.includes("Phone") ? PhoneCall : Award;
                    const badgeClass = badge.includes("Preferred") 
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200";
                    return (
                      <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}>
                        <Icon size={10} />
                        {badge}
                      </span>
                    );
                  })}
                </div>
                
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-gray-400 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {profile?.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Member since {profile?.member_since}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center flex-shrink-0">
              {isEditing ? (
                <div className="flex gap-2">
                  <button onClick={handleSave} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5 shadow-sm">
                    <Save size={14} />
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="border border-gray-200 text-gray-600 bg-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition flex items-center gap-1.5 shadow-sm">
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={startEdit} className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5 shadow-sm">
                  <Edit3 size={14} />
                  Edit profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
            <span>Profile updated successfully!</span>
            <button onClick={() => setSaveSuccess(false)} className="text-emerald-500 hover:text-emerald-700">
              <X size={16} />
            </button>
          </div>
        )}
        
        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col">
              <span className="font-bold">Failed to save profile</span>
              <span className="text-xs font-normal mt-1">{saveError}</span>
            </div>
            <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── STAT METRICS CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Listings", value: vendorStats.loading ? "…" : vendorStats.listings, icon: ListCollapse, color: "text-blue-600 bg-blue-50 border-blue-100" },
            { label: "Live inventory", value: vendorStats.loading ? "…" : vendorStats.inventory, icon: Store, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
            { label: "Deals", value: vendorStats.loading ? "…" : vendorStats.deals, icon: BarChart3, color: "text-purple-600 bg-purple-50 border-purple-100" },
            { label: "Revenue", value: vendorStats.loading ? "…" : `$${vendorStats.revenue.toFixed(2)}`, icon: Award, color: "text-amber-600 bg-amber-50 border-amber-100" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-xl border ${stat.color} flex-shrink-0`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-black mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── NAVIGATION TABS ── */}
        <div className="flex border-b border-gray-200 gap-6">
          {["Overview", "Activity", "Settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-4 text-sm font-semibold relative transition-colors ${
                activeTab === tab ? "text-black" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        {activeTab === "Overview" && (
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Info Grid */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
                <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-3">Profile details</h2>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { label: "Vendor / Full Name", val: profile?.full_name, field: "full_name", icon: User },
                    { label: "Company / Store Name", val: profile?.store_name, field: "store_name", icon: Store },
                    { label: "Email Address", val: profile?.email, field: "email", icon: Mail, disabled: true },
                    { label: "Phone Number", val: profile?.phone_number || profile?.phone, field: "phone_number", icon: Phone },
                    { label: "Website", val: profile?.website, field: "website", icon: Globe },
                    { label: "Registered Address / Location", val: profile?.location, field: "location", icon: MapPin },
                    { label: "Avatar Image URL", val: profile?.avatar_url, field: "avatar_url", icon: User }
                  ].map((field, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">{field.label}</label>
                      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                        <field.icon size={14} className="text-gray-400 flex-shrink-0" />
                        {isEditing && !field.disabled ? (
                          field.field === "avatar_url" ? (
                            <div className="flex items-center gap-3 w-full">
                              <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50 transition select-none">
                                <Upload size={12} className="text-gray-500" />
                                Upload Image/PDF
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const result = event.target?.result;
                                      if (typeof result !== "string") return;

                                      if (file.type === "application/pdf") {
                                        setEditForm(prev => ({ ...prev, avatar_url: result }));
                                      } else {
                                        setCropImageSrc(result);
                                        setZoom(1);
                                        setImagePos({ x: 0, y: 0 });
                                        setShowCropModal(true);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                              {editForm.avatar_url && (
                                <span className="text-[10px] text-gray-400 font-semibold truncate max-w-[120px]">
                                  {editForm.avatar_url.startsWith("data:application/pdf") ? "📄 PDF Document" : "🖼️ Cropped Image"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={editForm[field.field]}
                              onChange={(e) => setEditForm({ ...editForm, [field.field]: e.target.value })}
                              className="bg-transparent text-sm text-black w-full focus:outline-none font-medium"
                            />
                          )
                        ) : (
                          field.field === "avatar_url" && field.val ? (
                            (field.val.startsWith("data:application/pdf") || field.val.endsWith(".pdf")) ? (
                              <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5 truncate">
                                <FileText size={14} className="flex-shrink-0" /> PDF Document
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-black truncate">{field.val}</span>
                            )
                          ) : (
                            <span className="text-sm font-semibold text-black truncate">{field.val || "—"}</span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Section: About this vendor */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-3">About this vendor</h2>
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-black focus:outline-none font-medium"
                  />
                ) : (
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">
                    {profile?.bio || "No description provided."}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Performance snapshot */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-black border-b border-gray-100 pb-3">Performance snapshot</h2>
              
              <div className="space-y-4">
                {[
                  { label: "Fulfillment Rate", value: performance.loading ? "Loading..." : performance.fulfillmentRate, desc: "Orders dispatched within 24 hours" },
                  { label: "Buyer Rating", value: performance.loading ? "Loading..." : performance.buyerRating, desc: "Based on customer transactions" },
                  { label: "Response Rate", value: performance.loading ? "Loading..." : performance.responseRate, desc: "Messages answered within 2 hours" }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-gray-700">{item.label}</span>
                      <span className="text-sm font-black text-black">{item.value}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "Activity" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm text-center py-16">
            <ActivityIcon size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-black">No recent vendor activity</p>
            <p className="text-xs text-gray-400 mt-1">Actions taken on listings and deals will display here.</p>
          </div>
        )}

        {activeTab === "Settings" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm text-center py-16">
            <SettingsIcon size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-black">Settings dashboard is locked</p>
            <p className="text-xs text-gray-400 mt-1">Configure payouts and platform preferences in settings tab.</p>
          </div>
        )}

      </div>

      {/* ── IMAGE CROPPER MODAL ── */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-black flex items-center gap-2">
                <Camera size={16} className="text-gray-500" />
                Crop Avatar
              </h3>
              <button 
                onClick={() => { setShowCropModal(false); setCropImageSrc(""); }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cropping Area */}
            <div className="p-6 flex flex-col items-center gap-6 overflow-y-auto">
              <div 
                className="relative w-[240px] h-[240px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden cursor-move select-none"
                onMouseDown={(e) => {
                  setDragStart({ x: e.clientX - imagePos.x, y: e.clientY - imagePos.y });
                }}
                onMouseMove={(e) => {
                  if (!dragStart) return;
                  setImagePos({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                  });
                }}
                onMouseUp={() => setDragStart(null)}
                onMouseLeave={() => setDragStart(null)}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  setDragStart({ x: touch.clientX - imagePos.x, y: touch.clientY - imagePos.y });
                }}
                onTouchMove={(e) => {
                  if (!dragStart) return;
                  const touch = e.touches[0];
                  setImagePos({
                    x: touch.clientX - dragStart.x,
                    y: touch.clientY - dragStart.y
                  });
                }}
                onTouchEnd={() => setDragStart(null)}
              >
                {/* Circular Crop Guide Mask overlay */}
                <div className="absolute inset-0 border-[20px] border-black/40 pointer-events-none z-10 flex items-center justify-center">
                  <div className="w-[200px] h-[200px] rounded-full border border-white/60 pointer-events-none" />
                </div>

                {/* The Preview Image */}
                {cropImageSrc && (
                  <img
                    src={cropImageSrc}
                    alt="Preview"
                    className="absolute max-w-none origin-center pointer-events-none"
                    style={{
                      transform: `translate(${imagePos.x}px, ${imagePos.y}px) scale(${zoom})`,
                      top: 'calc(50% - 100px)',
                      left: 'calc(50% - 100px)',
                      width: '200px',
                      height: '200px',
                      objectFit: 'contain'
                    }}
                  />
                )}
              </div>

              {/* Zoom Controls */}
              <div className="w-full space-y-1.5 px-2">
                <div className="flex justify-between text-xs text-gray-400 font-semibold">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2.5">
              <button
                onClick={() => { setShowCropModal(false); setCropImageSrc(""); }}
                className="px-4 py-2 border border-gray-200 text-gray-600 bg-white rounded-xl text-xs font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const canvas = document.createElement("canvas");
                  canvas.width = 200;
                  canvas.height = 200;
                  const ctx = canvas.getContext("2d");

                  const img = new Image();
                  img.src = cropImageSrc;
                  img.onload = () => {
                    ctx.clearRect(0, 0, 200, 200);

                    // Destination dimensions of scaled image
                    const dWidth = 200 * zoom;
                    const dHeight = 200 * zoom;

                    // Centered coordinate offset
                    const dx = (200 - dWidth) / 2 + imagePos.x;
                    const dy = (200 - dHeight) / 2 + imagePos.y;

                    ctx.drawImage(img, dx, dy, dWidth, dHeight);

                    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
                    setEditForm(prev => ({ ...prev, avatar_url: croppedDataUrl }));
                    setShowCropModal(false);
                    setCropImageSrc("");
                  };
                }}
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
