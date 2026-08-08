import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "\n========================================================================\n" +
      "MISSING SUPABASE SERVICE ROLE KEY:\n" +
      "The E2E test requires the service_role key to bypass email verification.\n\n" +
      "How to resolve this:\n" +
      "1. Open your Supabase Dashboard (https://supabase.com/dashboard)\n" +
      "2. Go to Project Settings -> API\n" +
      "3. Find the key labeled 'service_role' (under 'Project API keys')\n" +
      "4. Copy the service_role key (which is a secret key, starts with 'sb_secret_' or 'eyJ')\n" +
      "5. Open your '.env.local' file and append the following line:\n" +
      "   SUPABASE_SERVICE_ROLE_KEY=your_copied_secret_service_role_key\n" +
      "========================================================================\n"
    );
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in your .env.local file.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function deleteUserIfExists(email) {
  try {
    const supabase = createAdminClient();
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("[Cleanup] Failed to list users:", listError.message);
      return;
    }

    const targetUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (targetUser) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUser.id);
      if (deleteError) {
        console.error(`[Cleanup] Failed to delete user ${email}:`, deleteError.message);
      } else {
        console.log(`[Cleanup] Successfully cleaned up existing user: ${email}`);
      }
    }
  } catch (err) {
    console.warn("[Cleanup] Warning during user cleanup:", err.message);
  }
}

export async function getVerificationLink(email) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
  });

  if (error) {
    throw new Error(`Failed to generate verification link for ${email}: ${error.message}`);
  }

  if (!data?.properties?.action_link) {
    throw new Error(`No action_link returned in Supabase generateLink response for ${email}.`);
  }

  return data.properties.action_link;
}
