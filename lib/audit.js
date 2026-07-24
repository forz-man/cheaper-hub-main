import { createAdminClient } from "@/lib/supabaseAdmin";

export async function logActivity({ actor_id, action, entity_type, entity_id, description, metadata }) {
  try {
    const admin = createAdminClient();
    await admin.from("activity_logs").insert({
      actor_id,
      action: String(action).slice(0, 100),
      entity_type: String(entity_type).slice(0, 50),
      entity_id: entity_id ? String(entity_id).slice(0, 255) : null,
      description: description ? String(description).slice(0, 500) : null,
      metadata: metadata || {},
    });
  } catch {
    // Best effort — audit should never break the main operation
  }
}
