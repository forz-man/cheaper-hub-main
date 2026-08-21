import { createAdminClient } from "@/lib/supabaseAdmin";
import { sendContactSupportNotification } from "@/lib/emails/contact-support";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact — stores a public contact-form submission and sends support notification.
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
    if (message.length < 5) {
      return NextResponse.json({ message: "Message must be at least 5 characters long." }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ message: "Message is too long (maximum 5,000 characters)." }, { status: 400 });
    }

    // 1. Store message in Supabase contact_messages table
    let dbSuccess = false;
    try {
      const admin = createAdminClient();
      const { error: dbError } = await admin.from("contact_messages").insert({
        name: name.slice(0, 200),
        email: email.slice(0, 200),
        subject: subject.slice(0, 200) || null,
        message,
      });

      if (dbError) {
        console.warn("contact_messages insert error:", dbError.message);
      } else {
        dbSuccess = true;
      }
    } catch (dbErr) {
      console.warn("Database storage error:", dbErr.message);
    }

    // 2. Dispatch email notification to support@cheaper.com via Resend if configured
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        await sendContactSupportNotification({
          name: name.slice(0, 200),
          email: email.slice(0, 200),
          subject: subject.slice(0, 200) || "Support Request",
          message,
        });
        emailSent = true;
      } catch (emailErr) {
        console.warn("Resend email notification failed:", emailErr.message);
      }
    } else {
      console.info("RESEND_API_KEY is not set. Support message saved in queue.");
    }

    // If both DB and email failed completely, return error
    if (!dbSuccess && !emailSent && process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { message: "Could not send your message right now. Please try again shortly." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been received.",
      emailSent,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
