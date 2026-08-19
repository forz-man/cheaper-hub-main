import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/secure-headers";

const ROLE_LIMIT = rateLimit({ maxRequests: 10 });

function json(payload, init) {
  return withSecurityHeaders(NextResponse.json(payload, init));
}

export async function POST(request) {
  const limited = ROLE_LIMIT(request);
  if (limited.error) return limited.error;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ message: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== "buyer" && role !== "vendor") {
    return json({ message: "Choose a valid account type." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return json({ message: "Your account type could not be loaded." }, { status: 500 });
  }
  if (profile?.role && profile.role !== role) {
    return json({ message: "Your account type has already been selected." }, { status: 409 });
  }

  const { error: saveError } = await admin
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  if (saveError) {
    return json({ message: "Your account type could not be saved." }, { status: 500 });
  }

  // Keep metadata aligned for non-authoritative UI hints. Privileged APIs never
  // trust this field; only profiles.role authorizes vendor/admin operations.
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, role },
  });

  return json({ role });
}