import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!UUID.test(id)) return NextResponse.json({ error: "معرّف الحدث غير صالح." }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "يلزم تسجيل الدخول لإضافة تحديث." }, { status: 401 });

    const body: unknown = await request.json();
    const text = body && typeof body === "object" && "text" in body && typeof body.text === "string"
      ? body.text.trim()
      : "";
    if (!text || text.length > 5000) {
      return NextResponse.json({ error: "اكتب تحديثًا لا يتجاوز ٥٠٠٠ حرف." }, { status: 400 });
    }
    const { data: event, error: eventError } = await supabase
      .from("handover_events")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (eventError) return NextResponse.json({ error: "تعذر التحقق من الحدث." }, { status: 500 });
    if (!event) return NextResponse.json({ error: "الحدث غير موجود." }, { status: 404 });

    const { error } = await supabase.from("handover_event_updates").insert({
      event_id: id,
      author_id: user.id,
      body: text,
    });
    if (error) return NextResponse.json({ error: "تعذر حفظ التحديث." }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "تعذر حفظ التحديث بسبب مشكلة في الاتصال." }, { status: 500 });
  }
}
