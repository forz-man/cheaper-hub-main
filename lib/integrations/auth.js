import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

function normalizeRole(role) {
  if (role === "seller" || role === "vendor") return "vendor";
  if (role === "buyer") return "buyer";
  if (role === "admin") return "admin";
  return null;
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

export async function requireVendor() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ message: "Authentication required." }, { status: 401 }),
      user: null,
      admin: null,
      profile: null,
    };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, store_name, full_name")
    .eq("id", user.id)
    .maybeSingle();
  // Only the database profile is authoritative. user_metadata is mutable by
  // the signed-in user and must never unlock service-role integration APIs.
  const role = normalizeRole(profile?.role);

  if (role !== "vendor") {
    return {
      error: NextResponse.json({ message: "Vendor access required." }, { status: 403 }),
      user: null,
      admin: null,
      profile: null,
    };
  }

  return { error: null, user, admin, profile };
}

export function vendorDisplayName(user, profile) {
  return (
    profile?.store_name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Vendor"
  );
}