import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { validateVendorVerification } from "@/lib/vendor-verification.mjs";

const BUCKET = "vendor-verification-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function requireVendor() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "vendor") {
    return { error: "Vendor access required", status: 403 };
  }

  return { user, profile };
}

async function ensurePrivateBucket(admin) {
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (bucket) return;

  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_TYPES.keys()],
  });
  if (error && !error.message?.toLowerCase().includes("already exists")) throw error;
}

export async function GET() {
  try {
    const auth = await requireVendor();
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("vendor_verification_submissions")
      .select(`
        id, seller_type, status, full_name, phone_number, location,
        store_name, business_category, business_registration_details,
        business_description, website, additional_notes,
        identity_document_name, identity_document_type, identity_document_size,
        decline_reason, submitted_at, reviewed_at
      `)
      .eq("vendor_id", auth.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { message: "Vendor verification is not configured yet. Run the vendor verification migration." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      profile: {
        ...auth.profile,
        seller_type: data?.seller_type || null,
        verification_status: data?.status || "not_submitted",
      },
      submission: data || null,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to load verification status" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  let uploadedPath = null;
  try {
    const auth = await requireVendor();
    if (auth.error) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const formData = await request.formData();
    const file = formData.get("identity_document");
    const hasFile = file && typeof file !== "string";
    const input = Object.fromEntries(
      [...formData.entries()].filter(([key, value]) => key !== "identity_document" && typeof value === "string"),
    );
    const validation = validateVendorVerification(input, { hasIdentityDocument: hasFile });

    if (!validation.valid) {
      return NextResponse.json(
        { message: "Please correct the highlighted verification details.", errors: validation.errors },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Identity document must be a PDF, JPEG, PNG, or WEBP file." },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { message: "Identity document must be smaller than 10MB." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    await ensurePrivateBucket(admin);

    const { data: existing, error: existingError } = await admin
      .from("vendor_verification_submissions")
      .select("identity_document_path, status")
      .eq("vendor_id", auth.user.id)
      .maybeSingle();
    if (existingError) {
      return NextResponse.json(
        { message: "Vendor verification is not configured yet. Run the vendor verification migration." },
        { status: 503 },
      );
    }
    if (existing?.status === "approved") {
      return NextResponse.json({ message: "This vendor is already verified." }, { status: 409 });
    }
    if (existing?.status === "pending") {
      return NextResponse.json(
        { message: "Your verification is already under review and cannot be changed until an admin decides." },
        { status: 409 },
      );
    }

    const extension = ALLOWED_TYPES.get(file.type);
    uploadedPath = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(uploadedPath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const values = validation.values;
    const { data: submissionId, error: submitError } = await admin.rpc(
      "submit_vendor_verification",
      {
        p_vendor_id: auth.user.id,
        p_seller_type: values.seller_type,
        p_full_name: values.full_name,
        p_phone_number: values.phone_number,
        p_location: values.location,
        p_store_name: values.store_name,
        p_business_category: values.business_category,
        p_business_registration_details: values.business_registration_details,
        p_business_description: values.business_description,
        p_website: values.website,
        p_additional_notes: values.additional_notes,
        p_identity_document_path: uploadedPath,
        p_identity_document_name: String(file.name || `identity.${extension}`).slice(0, 255),
        p_identity_document_type: file.type,
        p_identity_document_size: file.size,
      },
    );

    if (submitError) {
      await admin.storage.from(BUCKET).remove([uploadedPath]);
      uploadedPath = null;
      throw submitError;
    }

    if (existing?.identity_document_path && existing.identity_document_path !== uploadedPath) {
      await admin.storage.from(BUCKET).remove([existing.identity_document_path]);
    }

    return NextResponse.json({
      message: "Verification submitted for admin review.",
      submission_id: submissionId,
      status: "pending",
    });
  } catch (error) {
    if (uploadedPath) {
      try {
        await createAdminClient().storage.from(BUCKET).remove([uploadedPath]);
      } catch {}
    }
    return NextResponse.json(
      {
        message: error.message?.includes("schema cache")
          ? "Vendor verification is not configured yet. Run the vendor verification migration."
          : error.message || "Unable to submit verification",
      },
      { status: 500 },
    );
  }
}