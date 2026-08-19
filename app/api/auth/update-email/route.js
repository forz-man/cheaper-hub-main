import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendEmailChangedNotification } from "@/lib/emails/email-changed";

export async function POST(request) {
  const { email: newEmail } = await request.json();

  if (!newEmail || typeof newEmail !== "string" || !newEmail.includes("@")) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "New email is the same as your current email." },
      { status: 400 }
    );
  }

  const oldEmail = user.email;

  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Notify both old and new addresses — non-blocking, never fails the request.
  const changedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  sendEmailChangedNotification({ oldEmail, newEmail, changedAt }).catch((err) =>
    console.error("[update-email] Failed to send notification:", err.message)
  );

  return NextResponse.json({ success: true });
}
