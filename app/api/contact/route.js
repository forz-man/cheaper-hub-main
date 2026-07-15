import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact — stores a public contact-form submission.
// Uses the admin client because the anonymous/authenticated client has no
// SELECT policy on contact_messages (by design — submissions are
// write-only from the browser); the insert policy still applies to what a
// direct client insert could do, this route just goes through service role
// since it's the same trusted-server path used elsewhere in the app.
export async function POST(request) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const subject = (body.subject || "").trim();
    const message = (body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { message: "Name, email, and message are required." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ message: "Message is too long." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("contact_messages").insert({
      name: name.slice(0, 200),
      email: email.slice(0, 200),
      subject: subject.slice(0, 200) || null,
      message,
    });

    if (error) {
      // Most likely cause: the contact_messages table hasn't been created
      // yet in this project's Supabase instance (see supabase/schema.sql).
      console.error("contact_messages insert error:", error.message);
      return NextResponse.json(
        { message: "Could not send your message right now. Please try again shortly." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
