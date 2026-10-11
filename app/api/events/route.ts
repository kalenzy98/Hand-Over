import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHandoverEvents } from "@/lib/events";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: unknown): value is string {
  return typeof value === "string" && DATE_ONLY.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "يلزم تسجيل الدخول لعرض الأحداث." }, { status: 401 });
    const events = await getHandoverEvents(supabase);
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: "تعذر تحميل الأحداث. تحقق من اتصال قاعدة البيانات." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "يلزم تسجيل الدخول لإضافة حدث." }, { status: 401 });

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "بيانات الحدث غير صالحة." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const details = typeof input.details === "string" ? input.details.trim() : "";
    if (!title || title.length > 180 || !details || details.length > 5000 || !validDate(input.date)) {
      return NextResponse.json({ error: "أدخل عنوانًا وتاريخًا وتفاصيل صحيحة للحدث." }, { status: 400 });
    }

    const { data: id, error } = await supabase.rpc("create_handover_event", {
      p_title: title,
      p_event_date: input.date,
      p_details: details,
    });
    if (error || !id) {
      return NextResponse.json({ error: "تعذر حفظ الحدث في قاعدة البيانات." }, { status: 500 });
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "تعذر حفظ الحدث. تحقق من اتصال قاعدة البيانات." }, { status: 500 });
  }
}
