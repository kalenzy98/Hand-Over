import { redirect } from "next/navigation";
import HandOverApp from "@/components/HandOverApp";
import { getHandoverEvents } from "@/lib/events";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  let initialEvents: Awaited<ReturnType<typeof getHandoverEvents>> = [];
  let initialError = "";
  try {
    initialEvents = await getHandoverEvents(supabase);
  } catch {
    initialError = "تعذر تحميل الأحداث من قاعدة البيانات. تحقق من تشغيل ترحيل Supabase والاتصال.";
  }
  return (
    <HandOverApp
      screen="dashboard"
      authConfigured
      initialUser={{
        id: user.id,
        email: user.email ?? "",
        displayName: typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : user.email?.split("@")[0] ?? "مستخدم",
      }}
      initialEvents={initialEvents}
      initialError={initialError}
    />
  );
}
