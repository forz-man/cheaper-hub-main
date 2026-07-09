import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

// POST /api/messages — send a message and update conversation last_message
export async function POST(request) {
  try {
    const supabase = await createClient();

    // Derive sender from server-side session — never trust client-supplied sender_id
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { conversation_id, message } = await request.json();

    if (!conversation_id || !message) {
      return NextResponse.json(
        { message: "conversation_id and message are required" },
        { status: 400 }
      );
    }

    const sender_id = user.id;

    // Insert the message
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({ conversation_id, sender_id, message })
      .select()
      .single();

    if (msgErr) {
      return NextResponse.json({ message: msgErr.message }, { status: 500 });
    }

    // Update conversation's last_message so the list stays sorted + preview shows
    await supabase
      .from("conversations")
      .update({
        last_message: message,
        last_message_at: msg.created_at,
      })
      .eq("id", conversation_id);

    return NextResponse.json(msg, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET /api/messages?conversationId=<uuid> — fetch all messages in a conversation
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ message: "conversationId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
