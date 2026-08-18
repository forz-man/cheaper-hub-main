import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";



export async function GET(request) {
  try {
    const supabase = await createClient();
    const surface = new URL(request.url).searchParams.get("surface");

    let query = supabase
      .from("products")
      .select("*")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false });

    if (surface === "todays-deals") {
      query = query
        .eq("status", "active")
        .eq("is_todays_deal", true)
        .limit(5);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}