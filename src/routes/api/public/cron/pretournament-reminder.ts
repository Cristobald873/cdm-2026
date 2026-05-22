// Cron endpoint: rappel J-1 des pronos pré-tournoi aux joueurs incomplets.
// Appelé par pg_cron une fois par jour. La logique vérifie elle-même la date cible.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUsers, filterNotAlreadySent } from "@/lib/push.server";

const LOCK_ISO = "2026-06-11T19:00:00Z";
const REMINDER_DATE = "2026-06-10"; // J-1, ref_id pour éviter doublons

export const Route = createFileRoute("/api/public/cron/pretournament-reminder")({
  server: {
    handlers: {
      POST: async () => {
        const today = new Date().toISOString().slice(0, 10);
        if (today !== REMINDER_DATE) {
          return Response.json({ ok: true, skipped: true, today });
        }
        if (Date.now() >= new Date(LOCK_ISO).getTime()) {
          return Response.json({ ok: true, skipped: true, reason: "locked" });
        }

        const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
        const allUserIds = (profiles ?? []).map((p) => p.id);

        const { data: preRows } = await supabaseAdmin
          .from("pre_tournament_predictions")
          .select("user_id,group_letter,qualified_1,qualified_2,tournament_winner,top_scorer");

        // un joueur est "complet" s'il a 12 groupes avec qualified_1/2 + tournament_winner + top_scorer
        const byUser = new Map<string, any[]>();
        (preRows ?? []).forEach((r) => {
          if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
          byUser.get(r.user_id)!.push(r);
        });

        const incomplete = allUserIds.filter((uid) => {
          const rows = byUser.get(uid) ?? [];
          if (rows.length < 12) return true;
          const allGroupsOk = rows.every((r) => r.qualified_1 && r.qualified_2);
          const hasWinner = rows.some((r) => r.tournament_winner);
          const hasScorer = rows.some((r) => r.top_scorer);
          return !(allGroupsOk && hasWinner && hasScorer);
        });

        const targets = await filterNotAlreadySent(incomplete, "pretournament_d1", REMINDER_DATE);
        const r = await sendPushToUsers(targets, {
          title: "🔒 Dernière chance !",
          body: "Les pronos de qualification ferment demain à 21h00. Complète tes pronostics.",
          url: "/pronostics/pre-tournoi",
          tag: "pretournament-d1",
        }, { kind: "pretournament_d1", refId: REMINDER_DATE });

        return Response.json({ ok: true, targets: targets.length, sent: r.sent });
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
