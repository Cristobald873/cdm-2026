import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUsers, filterNotAlreadySent } from "./push.server";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(500).optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" }
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Déclenché par l'admin quand il enregistre un score réel.
export const notifyMatchEnded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (!profile?.is_admin) throw new Error("Forbidden");

    const { data: match } = await supabaseAdmin
      .from("matches")
      .select("id,home_team,away_team,real_home_score,real_away_score")
      .eq("id", data.matchId)
      .maybeSingle();
    if (!match || match.real_home_score === null || match.real_away_score === null) return { sent: 0 };

    // classement général de tous les joueurs
    const { data: allPreds } = await supabaseAdmin.from("predictions").select("user_id,points_earned");
    const { data: allPre } = await supabaseAdmin.from("pre_tournament_predictions").select("user_id,points_earned");
    const totals = new Map<string, number>();
    (allPreds ?? []).forEach((p) => totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points_earned ?? 0)));
    (allPre ?? []).forEach((p) => totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points_earned ?? 0)));
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const rankOf = new Map(ranked.map(([uid], i) => [uid, i + 1]));

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    const userIds = (profiles ?? []).map((p) => p.id);
    const targets = await filterNotAlreadySent(userIds, "match_result", match.id);

    // envoi groupé avec position personnalisée par user → on boucle par user
    let total = 0;
    await Promise.all(targets.map(async (uid) => {
      const rank = rankOf.get(uid) ?? ranked.length + 1;
      const r = await sendPushToUsers([uid], {
        title: `⚽ ${match.home_team} ${match.real_home_score} - ${match.real_away_score} ${match.away_team}`,
        body: `Tu es #${rank} au classement général`,
        url: "/classements",
        tag: `result-${match.id}`,
      }, { kind: "match_result", refId: match.id });
      total += r.sent;
    }));
    return { sent: total };
  });

// Déclenché par l'admin quand teams_confirmed passe à true sur un match éliminatoire.
export const notifyElimOpen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ matchId: z.string().max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (!profile?.is_admin) throw new Error("Forbidden");

    const { data: match } = await supabaseAdmin
      .from("matches")
      .select("id,home_team,away_team,stage,teams_confirmed")
      .eq("id", data.matchId)
      .maybeSingle();
    if (!match || !match.teams_confirmed || match.stage === "GROUP") return { sent: 0 };

    const stageLabel: Record<string, string> = {
      R32: "1/16 de finale",
      R16: "1/8 de finale",
      QF: "1/4 de finale",
      SF: "1/2 finale",
      F: "finale",
      "3RD": "match pour la 3e place",
    };
    const label = stageLabel[match.stage] || match.stage;

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    const userIds = (profiles ?? []).map((p) => p.id);
    const targets = await filterNotAlreadySent(userIds, "elim_open", match.id);

    const r = await sendPushToUsers(targets, {
      title: `🏆 ${match.home_team} - ${match.away_team} en ${label}`,
      body: "Les pronos sont ouverts, fais le tien !",
      url: "/pronostics/eliminatoires",
      tag: `elim-${match.id}`,
    }, { kind: "elim_open", refId: match.id });
    return { sent: r.sent };
  });
