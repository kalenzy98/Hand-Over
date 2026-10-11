import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type HandoverEvent = {
  id: string;
  title: string;
  date: string;
  createdAt: string;
  creator: string;
  creatorId: string;
  status: "open" | "closed";
  details: string;
  timeline: { id: string; author: string; authorId: string; at: string; text: string }[];
};

export async function getHandoverEvents(
  supabase: SupabaseClient<Database>,
): Promise<HandoverEvent[]> {
  const { data: rows, error } = await supabase
    .from("handover_events")
    .select("id,title,event_date,details,status,created_by,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows.length) return [];

  const eventIds = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.created_by))];
  const [updatesResult, profilesResult] = await Promise.all([
    supabase
      .from("handover_event_updates")
      .select("id,event_id,author_id,body,created_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: true }),
    supabase.from("user_profiles").select("id,display_name").in("id", authorIds),
  ]);
  if (updatesResult.error) throw updatesResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const allAuthorIds = [...new Set([
    ...authorIds,
    ...updatesResult.data.map((update) => update.author_id),
  ])];
  const missingProfiles = allAuthorIds.filter((id) => !profilesResult.data.some((p) => p.id === id));
  const extraProfilesResult = missingProfiles.length
    ? await supabase.from("user_profiles").select("id,display_name").in("id", missingProfiles)
    : { data: [], error: null };
  if (extraProfilesResult.error) throw extraProfilesResult.error;

  const names = new Map(
    [...profilesResult.data, ...extraProfilesResult.data].map((profile) => [profile.id, profile.display_name]),
  );
  const updatesByEvent = new Map<string, HandoverEvent["timeline"]>();
  for (const update of updatesResult.data) {
    const entries = updatesByEvent.get(update.event_id) ?? [];
    entries.push({
      id: update.id,
      authorId: update.author_id,
      author: names.get(update.author_id) ?? "مستخدم",
      at: update.created_at,
      text: update.body,
    });
    updatesByEvent.set(update.event_id, entries);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: row.event_date,
    createdAt: row.created_at,
    creatorId: row.created_by,
    creator: names.get(row.created_by) ?? "مستخدم",
    status: row.status,
    details: row.details,
    timeline: updatesByEvent.get(row.id) ?? [],
  }));
}
