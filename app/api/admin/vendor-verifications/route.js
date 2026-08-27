import { NextResponse } from "next/server";
import { requireAdmin, parsePagination, sanitizeSearchTerm, validateUUID } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { logActivity } from "@/lib/audit";

const BUCKET = "vendor-verification-documents";
const RATE_LIMIT = rateLimit({ maxRequests: 60 });
const VALID_STATUSES = ["pending", "approved", "declined"];
const VALID_SELLER_TYPES = ["individual", "business"];

export async function GET(request) {
  const limited = RATE_LIMIT(request);
  if (limited.error) return limited.error;

  try {
    const { error: authError, admin } = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const sellerType = searchParams.get("seller_type");
    const search = sanitizeSearchTerm(searchParams.get("q"));
    const { page, limit, offset } = parsePagination(searchParams);

    let query = admin.from("vendor_verification_submissions").select("*");
    let countQuery = admin
      .from("vendor_verification_submissions")
      .select("*", { count: "exact", head: true });

    if (VALID_STATUSES.includes(status)) {
      query = query.eq("status", status);
      countQuery = countQuery.eq("status", status);
    }
    if (VALID_SELLER_TYPES.includes(sellerType)) {
      query = query.eq("seller_type", sellerType);
      countQuery = countQuery.eq("seller_type", sellerType);
    }
    if (search) {
      const filter = `full_name.ilike.%${search}%,store_name.ilike.%${search}%,phone_number.ilike.%${search}%`;
      query = query.or(filter);
      countQuery = countQuery.or(filter);
    }

    const [{ data, error }, { count }] = await Promise.all([
      query.order("submitted_at", { ascending: false }).range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (error) {
      return withSecurityHeaders(
        NextResponse.json(
          { message: "Vendor verification is not configured yet. Run the vendor verification migration." },
          { status: 503 },
        ),
      );
    }

    const vendorIds = (data || []).map((item) => item.vendor_id);
    const { data: profiles } = vendorIds.length
      ? await admin.from("profiles").select("id, email, avatar_url").in("id", vendorIds)
      : { data: [] };
    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));

    const submissions = await Promise.all((data || []).map(async (item) => {
      const { data: signed } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(item.identity_document_path, 10 * 60);
      const { identity_document_path, ...safeItem } = item;
      return {
        ...safeItem,
        vendor_email: profilesById.get(item.vendor_id)?.email || null,
        vendor_avatar_url: profilesById.get(item.vendor_id)?.avatar_url || null,
        identity_document_url: signed?.signedUrl || null,
      };
    }));

    return withSecurityHeaders(
      NextResponse.json({ submissions, total: count || 0, page, limit }),
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ message: error.message || "Unable to load verification submissions" }, { status: 500 }),
    );
  }
}

export async function PATCH(request) {
  const limited = RATE_LIMIT(request);
  if (limited.error) return limited.error;

  try {
    const { error: authError, admin, user: adminUser } = await requireAdmin();
    if (authError) return authError;

    const body = await request.json().catch(() => null);
    const submissionId = body?.submission_id;
    const decision = body?.decision;
    const declineReason = String(body?.decline_reason || "").trim().slice(0, 1000);
    const expectedUpdatedAt = String(body?.expected_updated_at || "");

    if (
      !validateUUID(submissionId) ||
      !["approved", "declined"].includes(decision) ||
      !expectedUpdatedAt ||
      Number.isNaN(Date.parse(expectedUpdatedAt))
    ) {
      return withSecurityHeaders(
        NextResponse.json({ message: "A valid submission, revision, and decision are required." }, { status: 400 }),
      );
    }
    if (decision === "declined" && !declineReason) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Add a reason so the vendor knows what to correct." }, { status: 400 }),
      );
    }

    const { data: submission } = await admin
      .from("vendor_verification_submissions")
      .select("id, vendor_id, seller_type, full_name, store_name")
      .eq("id", submissionId)
      .maybeSingle();
    if (!submission) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Verification submission not found." }, { status: 404 }),
      );
    }

    const { error: reviewError } = await admin.rpc("review_vendor_verification", {
      p_submission_id: submissionId,
      p_decision: decision,
      p_admin_id: adminUser.id,
      p_decline_reason: decision === "declined" ? declineReason : null,
      p_expected_updated_at: expectedUpdatedAt,
    });
    if (reviewError) {
      const conflict = /changed|pending|already reviewed/i.test(reviewError.message || "");
      return withSecurityHeaders(
        NextResponse.json(
          { message: conflict ? "This submission changed or was already reviewed. Reload before deciding." : reviewError.message },
          { status: conflict ? 409 : 500 },
        ),
      );
    }

    await logActivity({
      actor_id: adminUser.id,
      action: decision === "approved" ? "approve_vendor_verification" : "decline_vendor_verification",
      entity_type: "vendor",
      entity_id: submission.vendor_id,
      description: `${decision === "approved" ? "Approved" : "Declined"} ${submission.seller_type} vendor verification for ${submission.store_name || submission.full_name}`,
      metadata: {
        submission_id: submissionId,
        seller_type: submission.seller_type,
        decline_reason: decision === "declined" ? declineReason : null,
      },
    });

    return withSecurityHeaders(
      NextResponse.json({
        message: decision === "approved" ? "Vendor verified successfully." : "Verification declined.",
        status: decision,
      }),
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ message: error.message || "Unable to review verification" }, { status: 500 }),
    );
  }
}