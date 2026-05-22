// Cron endpoint: rappel 1h avant chaque match aux joueurs qui n'ont pas pronostiqué.
// Appelé par pg_cron toutes les 5 minutes.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUsers, filterNotAlreadySent } from "@/lib/push.server";

export const Route = createFileRoute("/api/public/cron/match-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date();
        const inMin = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
        const inMax = new Date(now.getTime() + 75 * 60 * 1000).toISOString();

        const { data: matches } = await supabaseAdmin
          .from("matches")
          .select("id,home_team,away_team,kickoff_at,teams_confirmed")
          .gte("kickoff_at", inMin)
          .lte("kickoff_at", inMax)
          .eq("teams_confirmed", true);

        if (!matches?.length) return Response.json({ ok: true, matches: 0 });

        const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
        const allUserIds = (profiles ?? []).map((p) => p.id);
        let totalSent = 0;

        for (const m of matches) {
          const { data: preds } = await supabaseAdmin
            .from("predictions")
            .select("user_id")
            .eq("match_id", m.id);
          const done = new Set((preds ?? []).map((p) => p.user_id));
          const missing = allUserIds.filter((u) => !done.has(u));
          const targets = await filterNotAlreadySent(missing, "match_1h", m.id);
          if (!targets.length) continue;
          const r = await sendPushToUsers(targets, {
            title: "⏰ Plus qu'1h pour pronostiquer",
            body: `${m.home_team} - ${m.away_team}`,
            url: "/pronostics/groupes",
            tag: `1h-${m.id}`,
          }, { kind: "match_1h", refId: m.id });
          totalSent += r.sent;
        }
        return Response.json({ ok: true, matches: matches.length, sent: totalSent });
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
