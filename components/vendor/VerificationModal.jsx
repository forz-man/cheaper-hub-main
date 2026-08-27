"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  ShieldCheck,
  Store,
  Upload,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import VerifiedSellerBadge from "@/components/VerifiedSellerBadge";

const EMPTY_FORM = {
  seller_type: "",
  full_name: "",
  phone_number: "",
  location: "",
  store_name: "",
  business_category: "",
  business_registration_details: "",
  business_description: "",
  website: "",
  additional_notes: "",
};

function Field({ label, required, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10";

export default function VerificationModal({ open, onClose, profile, onSubmitted }) {
  const [step, setStep] = useState("type");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submission, setSubmission] = useState(null);
  const [identityFile, setIdentityFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setMessage("");
    setErrors({});

    fetch("/api/vendor/verification")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load verification");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const existing = data.submission;
        setSubmission(existing);
        setForm({
          ...EMPTY_FORM,
          seller_type: existing?.seller_type || data.profile?.seller_type || "",
          full_name: existing?.full_name || profile?.full_name || "",
          phone_number: existing?.phone_number || profile?.phone_number || profile?.phone || "",
          location: existing?.location || profile?.location || "",
          store_name: existing?.store_name || profile?.store_name || "",
          business_category: existing?.business_category || "",
          business_registration_details: existing?.business_registration_details || "",
          business_description: existing?.business_description || profile?.bio || "",
          website: existing?.website || profile?.website || "",
          additional_notes: existing?.additional_notes || "",
        });
        setStep(existing?.status === "pending" || existing?.status === "approved" ? "status" : existing ? "status" : "type");
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, profile]);

  if (!open) return null;

  const chooseType = (sellerType) => {
    setForm((current) => ({ ...current, seller_type: sellerType }));
    setIdentityFile(null);
    setErrors({});
    setStep("form");
  };

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setErrors({});

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.set(key, value));
      if (identityFile) body.set("identity_document", identityFile);

      const response = await fetch("/api/vendor/verification", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors || {});
        throw new Error(data.message || "Unable to submit verification");
      }

      const pending = {
        ...form,
        id: data.submission_id,
        status: "pending",
        identity_document_name: identityFile?.name,
        decline_reason: null,
      };
      setSubmission(pending);
      setStep("status");
      onSubmitted?.({
        seller_type: form.seller_type,
        verification_status: "pending",
        full_name: form.full_name,
        phone_number: form.phone_number,
        location: form.location,
        ...(form.seller_type === "business" ? {
          store_name: form.store_name,
          bio: form.business_description,
          website: form.website,
        } : {}),
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-black">Vendor verification</h2>
            <p className="mt-1 text-xs text-gray-500">Your documents are private and only visible to Cheaper administrators.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-black" aria-label="Close verification">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          {message && step !== "form" && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{message}</div>
          )}
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin" /> Loading verification…
            </div>
          ) : step === "type" ? (
            <div>
              <div className="mb-6 text-center">
                <ShieldCheck size={34} className="mx-auto mb-3 text-gray-800" />
                <h3 className="text-xl font-bold text-black">How are you selling?</h3>
                <p className="mt-1 text-sm text-gray-500">We use a different review checklist for individual and registered business sellers.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <button onClick={() => chooseType("individual")} className="rounded-2xl border-2 border-gray-200 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-50/40">
                  <UserRound size={24} className="mb-4 text-emerald-700" />
                  <div className="font-bold text-black">Individual</div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">Casual seller. We review your name, phone, location, and government ID.</p>
                  <div className="mt-4"><VerifiedSellerBadge sellerType="individual" verificationStatus="approved" /></div>
                </button>
                <button onClick={() => chooseType("business")} className="rounded-2xl border-2 border-gray-200 p-5 text-left transition hover:border-indigo-500 hover:bg-indigo-50/40">
                  <Building2 size={24} className="mb-4 text-indigo-700" />
                  <div className="font-bold text-black">Business / Store</div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">Registered business. We also review your store name, category, and registration.</p>
                  <div className="mt-4"><VerifiedSellerBadge sellerType="business" verificationStatus="approved" /></div>
                </button>
              </div>
            </div>
          ) : step === "status" ? (
            <div className="py-4 text-center">
              {submission?.status === "approved" ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-600" />
                  <h3 className="text-xl font-bold text-black">Your account is verified</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Buyers can now see your verification badge on your profile and product listings.</p>
                  <div className="mt-5 flex justify-center">
                    <VerifiedSellerBadge sellerType={submission.seller_type} verificationStatus="approved" />
                  </div>
                </>
              ) : submission?.status === "declined" ? (
                <>
                  <XCircle size={48} className="mx-auto mb-4 text-red-500" />
                  <h3 className="text-xl font-bold text-black">Changes are needed</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{submission.decline_reason || "Review your information and submit it again."}</p>
                  <button onClick={() => setStep("form")} className="mt-6 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
                    Update and resubmit
                  </button>
                </>
              ) : (
                <>
                  <FileCheck2 size={48} className="mx-auto mb-4 text-amber-500" />
                  <h3 className="text-xl font-bold text-black">Verification under review</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">An administrator will review your details and identity document. Your badge appears only after approval.</p>
                  <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    <Loader2 size={12} className="animate-spin" /> Pending admin review
                  </div>
                </>
              )}
              <div className="mt-8">
                <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-400 hover:text-black">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  {form.seller_type === "business" ? <Store size={20} className="text-indigo-700" /> : <UserRound size={20} className="text-emerald-700" />}
                  <div>
                    <div className="text-sm font-bold text-black">{form.seller_type === "business" ? "Business / Store verification" : "Individual seller verification"}</div>
                    <div className="text-[11px] text-gray-500">All fields marked * are required.</div>
                  </div>
                </div>
                <button type="button" onClick={() => setStep("type")} className="text-xs font-semibold text-gray-500 hover:text-black">Change</button>
              </div>

              {message && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{message}</div>}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required error={errors.full_name}>
                  <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className={inputClass} autoComplete="name" />
                </Field>
                <Field label="Phone number" required error={errors.phone_number}>
                  <input value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} className={inputClass} autoComplete="tel" />
                </Field>
              </div>

              {form.seller_type === "business" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Store / business name" required error={errors.store_name}>
                      <input value={form.store_name} onChange={(e) => update("store_name", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Business category" required error={errors.business_category}>
                      <input value={form.business_category} onChange={(e) => update("business_category", e.target.value)} className={inputClass} placeholder="e.g. Fashion retail" />
                    </Field>
                  </div>
                  <Field label="Business registration or license number" required error={errors.business_registration_details}>
                    <input value={form.business_registration_details} onChange={(e) => update("business_registration_details", e.target.value)} className={inputClass} />
                  </Field>
                </>
              )}

              <Field label={form.seller_type === "business" ? "Business location" : "Location (city / area only)"} required error={errors.location}>
                <input value={form.location} onChange={(e) => update("location", e.target.value)} className={inputClass} placeholder={form.seller_type === "business" ? "City, state or region" : "City or area — no full address"} />
              </Field>

              {form.seller_type === "business" && (
                <>
                  <Field label="Business description">
                    <textarea value={form.business_description} onChange={(e) => update("business_description", e.target.value)} className={`${inputClass} resize-none`} rows={3} />
                  </Field>
                  <Field label="Website or social link" error={errors.website}>
                    <input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} className={inputClass} placeholder="https://" />
                  </Field>
                </>
              )}

              <Field label="Government-issued identity document" required error={errors.identity_document}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-gray-200 p-4 transition hover:border-gray-400">
                  <span className="flex min-w-0 items-center gap-3">
                    {identityFile ? <FileText size={20} className="text-emerald-600" /> : <Upload size={20} className="text-gray-400" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-black">{identityFile?.name || "Choose ID document"}</span>
                      <span className="block text-[11px] text-gray-500">PDF, JPEG, PNG, or WEBP · maximum 10MB</span>
                    </span>
                  </span>
                  <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">Browse</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      setIdentityFile(e.target.files?.[0] || null);
                      setErrors((current) => ({ ...current, identity_document: undefined }));
                    }}
                  />
                </label>
              </Field>

              <Field label="Anything else?">
                <textarea value={form.additional_notes} onChange={(e) => update("additional_notes", e.target.value)} className={`${inputClass} resize-none`} rows={3} placeholder="Optional context for the review team" />
              </Field>

              <div className="flex gap-3 border-t border-gray-100 pt-5">
                <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:border-gray-400">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
                  Submit for review
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}