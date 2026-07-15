import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

// POST /api/products/upload-image — vendor uploads a product image.
// Auth is checked with the normal session client; the actual storage write
// uses the admin client so we don't need public storage write policies.
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Only PNG, JPEG, WEBP or GIF images are allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "Image must be under 5MB" }, { status: 400 });
    }

    const admin = createAdminClient();
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().slice(0, 8);
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from("product-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      return NextResponse.json({ message: uploadErr.message }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from("product-images").getPublicUrl(path);

    return NextResponse.json({ url: publicUrlData.publicUrl, path });
  } catch (err) {
    return NextResponse.json({ message: err.message || "Upload failed" }, { status: 500 });
  }
}
