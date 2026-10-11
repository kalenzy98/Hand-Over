import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(value: unknown): value is string {
  return typeof value === "string" && DATE_ONLY.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

async function ownedEvent(id: string) {
  if (!UUID.test(id)) return { error: NextResponse.json({ error: "معرّف الحدث غير صالح." }, { status: 400 }) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 }) };
  const { data: record, error } = await supabase
    .from("handover_events")
    .select("id,created_by")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: "تعذر التحقق من الحدث." }, { status: 500 }) };
  if (!record) return { error: NextResponse.json({ error: "الحدث غير موجود." }, { status: 404 }) };
  if (record.created_by !== user.id) {
    return { error: NextResponse.json({ error: "لا تملك صلاحية تعديل هذا الحدث أو حذفه." }, { status: 403 }) };
  }
  return { supabase, user, record };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await ownedEvent(id);
    if ("error" in access) return access.error;

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "بيانات الحدث غير صالحة." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const details = typeof input.details === "string" ? input.details.trim() : "";
    if (!title || title.length > 180 || !details || details.length > 5000 || !isValidDate(input.date) ||
        (input.status !== "open" && input.status !== "closed")) {
      return NextResponse.json({ error: "أدخل عنوانًا وتاريخًا وتفاصيل وحالة صحيحة." }, { status: 400 });
    }

    const { data: updated, error } = await access.supabase.rpc("update_handover_event", {
      p_event_id: id,
      p_title: title,
      p_event_date: input.date,
      p_details: details,
      p_status: input.status,
      p_body: "تم تحديث بيانات الحدث.",
    });
    if (error || !updated) {
      return NextResponse.json({ error: "تعذر تحديث الحدث. لم تُحفظ التغييرات." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "تعذر تحديث الحدث بسبب مشكلة في الاتصال." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await ownedEvent(id);
    if ("error" in access) return access.error;
    const { data, error } = await access.supabase
      .from("handover_events")
      .delete()
      .eq("id", id)
      .eq("created_by", access.user.id)
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "تعذر حذف الحدث من قاعدة البيانات." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "لم يُحذف الحدث؛ قد لا تملك صلاحية حذفه." }, { status: 403 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "تعذر حذف الحدث بسبب مشكلة في الاتصال." }, { status: 500 });
  }
}
