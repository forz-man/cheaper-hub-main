import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function requireAdmin(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ message: "Authentication required" }, { status: 401 }), supabase, admin: null, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ message: "Admin access required" }, { status: 403 }), supabase, admin: null, user: null };
  }

  const admin = createAdminClient();
  return { error: null, supabase, admin, user };
}

export function validateUUID(str) {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function sanitizeSearchTerm(term) {
  if (!term || typeof term !== "string") return "";
  return term.trim().replace(/[%_'()\\]/g, " ").slice(0, 200);
}

export function parsePagination(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
