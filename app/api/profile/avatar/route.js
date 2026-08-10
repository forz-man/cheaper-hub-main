import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

async function ensureBucket(admin) {
  const { data: bucket, error: getError } = await admin.storage.getBucket(BUCKET);
  if (bucket) return;

  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });

  // A concurrent request may create it between getBucket and createBucket.
  if (createError && !/already exists/i.test(createError.message || "")) {
    throw getError || createError;
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const file = (await request.formData()).get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "No image provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Only PNG, JPEG, WEBP or GIF images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "Image must be under 5MB" }, { status: 400 });
    }

    const admin = createAdminClient();
    await ensureBucket(admin);

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ message: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: publicUrlData.publicUrl, path });
  } catch (error) {
    console.error("POST /api/profile/avatar error:", error);
    return NextResponse.json(
      { message: error.message || "Profile image upload failed" },
      { status: 500 }
    );
  }
}