import { requireAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";
import { NextResponse } from "next/server";

const RATE_LIMIT_INST = rateLimit({ maxRequests: 30 });

function parsePagination(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function sanitizeSearchTerm(term) {
  if (!term || typeof term !== "string") return "";
  return term.trim().replace(/[%_'()\\]/g, " ").slice(0, 200);
}

export async function GET(req) {
  const rl = RATE_LIMIT_INST(req);
  if (rl.error) return rl.error;

  try {
    const { error, admin } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePagination(searchParams);
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const search = sanitizeSearchTerm(searchParams.get("q"));
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    let q = admin
      .from("activity_logs")
      .select("*, actor:profiles!activity_logs_actor_id_fkey(full_name, email)", { count: "exact" });

    if (action) {
      q = q.eq("action", action);
    }

    if (entityType) {
      q = q.eq("entity_type", entityType);
    }

    if (search) {
      q = q.or(`description.ilike.%${search}%,action.ilike.%${search}%`);
    }

    if (dateFrom) {
      q = q.gte("created_at", dateFrom);
    }

    if (dateTo) {
      q = q.lte("created_at", dateTo);
    }

    const { data, error: dbError, count } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return withSecurityHeaders(
        NextResponse.json({ message: "Failed to fetch activity logs" }, { status: 500 })
      );
    }

    const logs = (data || []).map((log) => ({
      ...log,
      actor_name: log.actor?.full_name || log.actor?.email || "Unknown",
    }));

    const response = NextResponse.json({
      logs,
      total: count || 0,
      page,
      limit,
    });

    return withSecurityHeaders(response);
  } catch {
    return withSecurityHeaders(
      NextResponse.json({ message: "Internal server error" }, { status: 500 })
    );
  }
}