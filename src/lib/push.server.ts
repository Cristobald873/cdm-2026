// Helpers serveur pour envoyer des notifications Web Push.
// NE PAS importer depuis le code client.
import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:admin@pronos-cdm.app";
  if (!pub || !priv) throw new Error("VAPID keys missing");
  webpush.setVapidDetails(subj.startsWith("mailto:") || subj.startsWith("http") ? subj : `mailto:${subj}`, pub, priv);
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export async function sendPushToUsers(userIds: string[], payload: PushPayload, opts?: { kind?: string; refId?: string }) {
  if (!userIds.length) return { sent: 0, failed: 0 };
  configure();
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .in("user_id", userIds);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;
  const expired: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 }
      );
      sent++;
    } catch (err: any) {
      failed++;
      if (err?.statusCode === 404 || err?.statusCode === 410) expired.push(s.id);
    }
  }));
  if (expired.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", expired);

  if (opts?.kind && opts?.refId) {
    const rows = userIds.map((uid) => ({ user_id: uid, kind: opts.kind!, ref_id: opts.refId! }));
    await supabaseAdmin.from("notifications_sent").upsert(rows, { onConflict: "user_id,kind,ref_id", ignoreDuplicates: true });
  }
  return { sent, failed };
}

// Filtre une liste d'userIds en retirant ceux qui ont déjà reçu ce (kind, ref_id).
export async function filterNotAlreadySent(userIds: string[], kind: string, refId: string): Promise<string[]> {
  if (!userIds.length) return [];
  const { data } = await supabaseAdmin
    .from("notifications_sent")
    .select("user_id")
    .eq("kind", kind)
    .eq("ref_id", refId)
    .in("user_id", userIds);
  const sent = new Set((data ?? []).map((r) => r.user_id));
  return userIds.filter((u) => !sent.has(u));
}
