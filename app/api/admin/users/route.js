import { requireAdmin, validateUUID, sanitizeSearchTerm, parsePagination } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { logActivity } from "@/lib/audit";
import { NextResponse } from "next/server";

const VALID_ROLES = ["buyer", "vendor", "admin"];
const RATE_LIMIT_INST = rateLimit({ maxRequests: 60 });

export async function GET(req) {
  const rl = RATE_LIMIT_INST(req);
  if (rl.error) return rl.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = sanitizeSearchTerm(searchParams.get("q"));
    const { page, limit, offset } = parsePagination(searchParams);

    let countQuery = admin.from("profiles").select("*", { count: "exact", head: true });
    let q = admin.from("profiles").select("*");

    if (role && VALID_ROLES.includes(role)) {
      q = q.eq("role", role);
      countQuery = countQuery.eq("role", role);
    }

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error: dbError } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to fetch users" }, { status: 500 })
      );
    }

    const { count: total } = await countQuery;

    const response = NextResponse.json({ users: data || [], total: total || 0, page, limit });
    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}

export async function PATCH(req) {
  const rl = RATE_LIMIT_INST(req);
  if (rl.error) return rl.error;

  try {
    const { error: authError, admin, user: adminUser } = await requireAdmin();
    if (authError) return authError;

    const body = await req.json().catch(() => null);
    if (!body) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Invalid request body" }, { status: 400 })
      );
    }

    const { user_id, action, value } = body;

    if (!user_id || !validateUUID(user_id)) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Valid user_id is required" }, { status: 400 })
      );
    }

    if (user_id === adminUser.id && action === "change_role" && value === "buyer") {
      return withSecurityHeaders(
        NextResponse.json({ message: "Cannot demote yourself from admin" }, { status: 403 })
      );
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (!targetProfile) {
      return withSecurityHeaders(
        NextResponse.json({ message: "User not found" }, { status: 404 })
      );
    }

    switch (action) {
      case "change_role": {
        if (!value || !VALID_ROLES.includes(value)) {
          return withSecurityHeaders(
            NextResponse.json({ message: "Invalid role. Must be one of: buyer, vendor, admin" }, { status: 400 })
          );
        }

        if (targetProfile.role === value) {
          return withSecurityHeaders(
            NextResponse.json({ message: `User already has role: ${value}` }, { status: 400 })
          );
        }

        const { error: updateError } = await admin
          .from("profiles")
          .update({ role: value })
          .eq("id", user_id);

        if (updateError) {
          return withSecurityHeaders(
            NextResponse.json({ message: "Failed to update role" }, { status: 500 })
          );
        }

        try {
          const { createAdminClient } = await import("@/lib/supabaseAdmin");
          const authAdmin = createAdminClient();
          await authAdmin.auth.admin.updateUserById(user_id, {
            user_metadata: { role: value },
            app_metadata: { role: value },
          });
        } catch {
          // Best effort — profile role is source of truth
        }

        await logActivity({
          actor_id: adminUser.id,
          action: "change_role",
          entity_type: "user",
          entity_id: user_id,
          description: `Changed role: ${targetProfile.role} → ${value}`,
          metadata: { user_id, previous_role: targetProfile.role, new_role: value },
        });

        const response = NextResponse.json({ message: "Role updated successfully" });
        return withSecurityHeaders(response);
      }

      case "suspend": {
        const { error: suspendError } = await admin
          .from("profiles")
          .update({ suspended: true, suspended_at: new Date().toISOString(), suspended_by: adminUser.id })
          .eq("id", user_id);

        if (suspendError) {
          return withSecurityHeaders(
            NextResponse.json({ message: "Failed to suspend user" }, { status: 500 })
          );
        }

        await logActivity({
          actor_id: adminUser.id,
          action: "suspend_user",
          entity_type: "user",
          entity_id: user_id,
          description: `Suspended user: ${targetProfile.full_name || targetProfile.email}`,
          metadata: { user_id },
        });

        const response = NextResponse.json({ message: "User suspended successfully" });
        return withSecurityHeaders(response);
      }

      case "unsuspend": {
        const { error: unsuspendError } = await admin
          .from("profiles")
          .update({ suspended: false, suspended_at: null, suspended_by: null })
          .eq("id", user_id);

        if (unsuspendError) {
          return withSecurityHeaders(
            NextResponse.json({ message: "Failed to unsuspend user" }, { status: 500 })
          );
        }

        await logActivity({
          actor_id: adminUser.id,
          action: "unsuspend_user",
          entity_type: "user",
          entity_id: user_id,
          description: `Unsuspended user: ${targetProfile.full_name || targetProfile.email}`,
          metadata: { user_id },
        });

        const response = NextResponse.json({ message: "User unsuspended successfully" });
        return withSecurityHeaders(response);
      }

      case "soft_delete": {
        const { error: deleteError } = await admin
          .from("profiles")
          .update({
            deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: adminUser.id,
            role: null,
          })
          .eq("id", user_id);

        if (deleteError) {
          return withSecurityHeaders(
            NextResponse.json({ message: "Failed to soft-delete user" }, { status: 500 })
          );
        }

        await logActivity({
          actor_id: adminUser.id,
          action: "soft_delete_user",
          entity_type: "user",
          entity_id: user_id,
          description: `Soft-deleted user: ${targetProfile.full_name || targetProfile.email}`,
          metadata: { user_id },
        });

        const response = NextResponse.json({ message: "User soft-deleted successfully" });
        return withSecurityHeaders(response);
      }

      case "restore": {
        const { error: restoreError } = await admin
          .from("profiles")
          .update({ deleted: false, deleted_at: null, deleted_by: null })
          .eq("id", user_id);

        if (restoreError) {
          return withSecurityHeaders(
            NextResponse.json({ message: "Failed to restore user" }, { status: 500 })
          );
        }

        await logActivity({
          actor_id: adminUser.id,
          action: "restore_user",
          entity_type: "user",
          entity_id: user_id,
          description: `Restored user: ${targetProfile.full_name || targetProfile.email}`,
          metadata: { user_id },
        });

        const response = NextResponse.json({ message: "User restored successfully" });
        return withSecurityHeaders(response);
      }

      default:
        return withSecurityHeaders(
          NextResponse.json({ message: "Invalid action" }, { status: 400 })
        );
    }
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}
