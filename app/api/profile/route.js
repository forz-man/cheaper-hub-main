import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { normalizeRole, resolveUserRole } from "@/lib/auth";
import { sanitizeProfileUpdates } from "@/lib/account-settings.mjs";

async function getAuthenticatedAccount() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

export async function GET() {
  try {
    const account = await getAuthenticatedAccount();
    if (!account) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: currentProfile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", account.user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const role = resolveUserRole(account.user, currentProfile?.role);
    const confirmedEmail = account.user.email_confirmed_at ? account.user.email : null;
    const defaults = {
      id: account.user.id,
      email: confirmedEmail || currentProfile?.email || "",
      full_name:
        currentProfile?.full_name ||
        account.user.user_metadata?.full_name ||
        account.user.user_metadata?.name ||
        account.user.email?.split("@")[0] ||
        "User",
      role: normalizeRole(role) || "buyer",
    };

    let profile = currentProfile;
    if (!currentProfile) {
      const { data, error } = await admin
        .from("profiles")
        .insert(defaults)
        .select()
        .single();
      if (error) throw error;
      profile = data;
    } else if (confirmedEmail && currentProfile.email !== confirmedEmail) {
      const { data, error } = await admin
        .from("profiles")
        .update({ email: confirmedEmail, updated_at: new Date().toISOString() })
        .eq("id", account.user.id)
        .select()
        .single();
      if (error) throw error;
      profile = data;
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const account = await getAuthenticatedAccount();
    if (!account) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: currentProfile, error: readError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", account.user.id)
      .maybeSingle();
    if (readError) throw readError;

    const role = resolveUserRole(account.user, currentProfile?.role);
    const updates = sanitizeProfileUpdates(await request.json(), role);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid profile changes supplied." }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();
    const { data: profile, error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", account.user.id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json(
      { error: error.message || "Could not update your profile." },
      { status: 500 }
    );
  }
}
