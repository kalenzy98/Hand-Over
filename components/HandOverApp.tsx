"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { HandoverEvent } from "@/lib/events";

type EventStatus = "open" | "closed";
type Filter = "all" | EventStatus;
type DialogMode = "new" | "edit" | "update";
type AppUser = { id: string; email: string; displayName: string };
type HandOverAppProps = {
  screen: "login" | "signup" | "forgot" | "reset" | "dashboard";
  authConfigured: boolean;
  initialUser?: AppUser;
  initialEvents?: HandoverEvent[];
  initialError?: string;
};

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
const VIDEO_POSTER =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function formatDate(value: string): string {
  if (!Number.isFinite(Date.parse(`${value}T12:00:00`))) return "تاريخ غير محدد";
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string): string {
  if (!isValidTimestamp(value)) return "وقت غير محدد";
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (normalized.includes("user already registered")) return "هذا البريد مسجل بالفعل. سجّل الدخول بدلًا من إنشاء حساب جديد.";
  if (normalized.includes("email not confirmed")) return "أكد بريدك الإلكتروني من الرسالة المرسلة إليك قبل تسجيل الدخول.";
  if (normalized.includes("password should be")) return "كلمة المرور لا تحقق متطلبات الأمان.";
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) return "محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.";
  return "تعذر إكمال العملية. تحقق من البيانات وحالة خدمة المصادقة ثم حاول مجددًا.";
}

function lastActivity(record: HandoverEvent): string {
  return record.timeline.length
    ? record.timeline[record.timeline.length - 1].at
    : record.createdAt;
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 7.5h9a3 3 0 0 1 3 3v.5m0 0-3-3m3 3-3 3M19 16.5h-9a3 3 0 0 1-3-3V13m0 0 3 3m-3-3 3-3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a1 1 0 0 1 1 1v9H5v-9a1 1 0 0 1 1-1Zm6 4v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HandOverApp({
  screen,
  authConfigured,
  initialUser,
  initialEvents = [],
  initialError = "",
}: HandOverAppProps) {
  const router = useRouter();
  const [activeVideo, setActiveVideo] = useState<"a" | "b">("a");
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const isDashboard = screen === "dashboard";
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [records, setRecords] = useState<HandoverEvent[]>(initialEvents);
  const [notice, setNotice] = useState(initialError);
  const [pendingRecordId, setPendingRecordId] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("new");
  const [dialogRecordId, setDialogRecordId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const currentUser = initialUser?.displayName ?? "مستخدم";

  const visibleRecords = useMemo(
    () =>
      records
        .filter((record) => activeFilter === "all" || record.status === activeFilter)
        .slice()
        .sort(
          (a, b) =>
            new Date(lastActivity(b)).getTime() - new Date(lastActivity(a)).getTime(),
        ),
    [activeFilter, records],
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let started = false;
    let bootTimer: ReturnType<typeof setTimeout>;
    let cleanTimer: ReturnType<typeof setTimeout>;
    const clean = () => root.classList.remove("anim", "go");
    const start = () => {
      if (started) return;
      started = true;
      clearTimeout(bootTimer);
      root.classList.add("go");
      cleanTimer = setTimeout(clean, 1200);
    };

    root.classList.add("anim");
    bootTimer = setTimeout(start, 900);
    if (document.fonts?.ready) document.fonts.ready.then(start, start);
    else start();

    return () => {
      clearTimeout(bootTimer);
      clearTimeout(cleanTimer);
      clean();
    };
  }, []);

  useEffect(() => {
    const first = videoA.current;
    const second = videoB.current;
    if (!first || !second) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      first.removeAttribute("autoplay");
      first.pause();
      second.pause();
      try {
        first.currentTime = 0;
      } catch {
        // Metadata may not have loaded yet.
      }
      return;
    }

    const fade = 0.9;
    let current = first;
    let next = second;
    let swapping = false;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const play = (video: HTMLVideoElement) => {
      const result = video.play();
      if (result && typeof result.catch === "function") result.catch(() => undefined);
    };
    const tick = () => {
      if (swapping || !current.duration || current.duration - current.currentTime > fade) return;
      swapping = true;
      const outgoing = current;
      try {
        next.currentTime = 0;
      } catch {
        // The video can still be loading.
      }
      play(next);
      setActiveVideo(next === first ? "a" : "b");
      current = next;
      next = outgoing;
      fadeTimer = setTimeout(() => {
        outgoing.pause();
        try {
          outgoing.currentTime = 0;
        } catch {
          // Keep the next clip playing if seeking is not available.
        }
        swapping = false;
      }, fade * 1000 + 100);
    };

    play(first);
    first.addEventListener("timeupdate", tick);
    second.addEventListener("timeupdate", tick);
    return () => {
      first.removeEventListener("timeupdate", tick);
      second.removeEventListener("timeupdate", tick);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginMessage("");
    setSuccessMessage("");
    if (!authConfigured) {
      setLoginMessage("لم تُربط خدمة المصادقة بعد. أضف إعدادات Supabase أولًا.");
      return;
    }
    if (screen !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLoginMessage("تحقق من كتابة بريد إلكتروني صحيح.");
      return;
    }
    if (screen === "signup" && !displayName.trim()) {
      setLoginMessage("أدخل اسمك ليظهر في سجل إنشاء الأحداث وتحديثاتها.");
      return;
    }
    if (screen !== "forgot" && password.length < 8) {
      setLoginMessage("أدخل كلمة مرور لا تقل عن 8 أحرف.");
      return;
    }
    setLoginLoading(true);
    try {
      const supabase = createSupabaseClient();
      if (screen === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) setLoginMessage(authErrorMessage(error.message));
        else setSuccessMessage("إذا كان الحساب مسجلًا، ستصلك رسالة لإعادة تعيين كلمة المرور.");
      } else if (screen === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setLoginMessage(authErrorMessage(error.message));
        else {
          setSuccessMessage("تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول.");
          setPassword("");
        }
      } else if (screen === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setLoginMessage(authErrorMessage(error.message));
        } else if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setSuccessMessage("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجّل الدخول.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setLoginMessage(authErrorMessage(error.message));
        } else {
          router.replace("/dashboard");
          router.refresh();
        }
      }
    } catch {
      setLoginMessage("تعذر الاتصال بخدمة المصادقة. تحقق من الإعدادات والاتصال.");
    } finally {
      setLoginLoading(false);
    }
  }

  function openDialog(mode: DialogMode, record?: HandoverEvent) {
    setDialogMode(mode);
    setDialogRecordId(record?.id ?? "");
    setEventTitle(record?.title ?? "");
    setEventDate(
      record?.date ??
        new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 10),
    );
    setEventDetails(mode === "edit" && record ? record.details : "");
    dialogRef.current?.showModal();
  }

  async function readApiError(response: Response, fallback: string): Promise<string> {
    try {
      const result: unknown = await response.json();
      if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
        return result.error;
      }
    } catch {
      // The route may return a non-JSON gateway error.
    }
    return fallback;
  }

  async function refreshEvents() {
    const response = await fetch("/api/events", { cache: "no-store" });
    if (!response.ok) throw new Error(await readApiError(response, "تعذر تحديث قائمة الأحداث."));
    const result = (await response.json()) as { events: HandoverEvent[] };
    setRecords(result.events);
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = eventDetails.trim();
    const title = eventTitle.trim();
    if (!details || (dialogMode !== "update" && (!title || !eventDate))) return;
    setPendingRecordId(dialogRecordId || "new");
    setNotice("");
    try {
      let response: Response;
      if (dialogMode === "new") {
        response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, date: eventDate, details }),
        });
      } else if (dialogMode === "edit") {
        const existing = records.find((record) => record.id === dialogRecordId);
        if (!existing) throw new Error("الحدث غير موجود في القائمة الحالية.");
        response = await fetch(`/api/events/${encodeURIComponent(dialogRecordId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, date: eventDate, details, status: existing.status }),
        });
      } else {
        response = await fetch(`/api/events/${encodeURIComponent(dialogRecordId)}/updates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: details }),
        });
      }
      if (!response.ok) throw new Error(await readApiError(response, "تعذر حفظ التغييرات."));
      await refreshEvents();
      dialogRef.current?.close();
      setNotice("تم حفظ التغييرات بنجاح.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ التغييرات.");
    } finally {
      setPendingRecordId("");
    }
  }

  async function toggleStatus(record: HandoverEvent) {
    const status: EventStatus = record.status === "open" ? "closed" : "open";
    setPendingRecordId(record.id);
    setNotice("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(record.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: record.title, date: record.date, details: record.details, status }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "تعذر تغيير حالة الحدث."));
      await refreshEvents();
      setNotice("تم تحديث حالة الحدث.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الحالة.");
    } finally {
      setPendingRecordId("");
    }
  }

  async function deleteEvent(record: HandoverEvent) {
    if (!window.confirm(`هل أنت متأكد من حذف الحدث «${record.title}»؟ لا يمكن التراجع عن الحذف.`)) return;
    setPendingRecordId(record.id);
    setNotice("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response, "تعذر حذف الحدث."));
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setNotice("تم حذف الحدث بنجاح.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "حدث خطأ أثناء حذف الحدث.");
    } finally {
      setPendingRecordId("");
    }
  }

  async function handleLogout() {
    setLoginMessage("");
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setNotice("تعذر تسجيل الخروج. حاول مجددًا.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setNotice("تعذر تسجيل الخروج بسبب مشكلة في الاتصال.");
    }
  }

  function handleCardPointer(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--x", `${(event.clientX - rect.left).toFixed(1)}px`);
    event.currentTarget.style.setProperty("--y", `${(event.clientY - rect.top).toFixed(1)}px`);
  }

  const dialogIsUpdate = dialogMode === "update";
  const dialogHeading =
    dialogMode === "new"
      ? "إضافة حدث"
      : dialogMode === "edit"
        ? "تعديل الحدث"
        : "إضافة تحديث للخط الزمني";

  return (
    <main className="hero">
      <div
        className="bg"
        role="img"
        aria-label="كرة أرضية خضراء مرسومة بنقاط مضيئة تدور بهدوء في الفضاء"
      >
        <video
          ref={videoA}
          className={`bg-video${activeVideo === "a" ? " is-active" : ""}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          poster={VIDEO_POSTER}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <video
          ref={videoB}
          className={`bg-video${activeVideo === "b" ? " is-active" : ""}`}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          poster={VIDEO_POSTER}
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      </div>
      <div className="shade" aria-hidden="true" />

      <header className="topbar" hidden={isDashboard}>
        <div className="agency-lockup">
          <img src="/agency-logo.png" alt="أمانة حفر الباطن" />
          <span>مركز الطوارئ والأزمات</span>
        </div>
        <a className="brand" href="#" aria-label="Hand Over — الصفحة الرئيسية">
          <BrandMark />
          Hand Over
        </a>
        <div className="top-note">
          <span className="status-dot" aria-hidden="true" />
          مساحة فريق العمل
        </div>
      </header>

      <section className="center" aria-labelledby="login-title" hidden={isDashboard}>
        <div className="login-card">
          <div className="card-mark" aria-hidden="true">
            <LockIcon />
          </div>
          <p className="kicker">
            {screen === "signup" ? "انضم إلى فريق العمل" : screen === "login" ? "مرحبًا بعودتك" : "استعادة الوصول"}
          </p>
          <h1 id="login-title">
            {screen === "signup" ? "إنشاء حساب" : screen === "forgot" ? "نسيت كلمة المرور؟" : screen === "reset" ? "تعيين كلمة مرور جديدة" : "تسجيل الدخول"}
          </h1>
          <p className="intro">
            {screen === "signup"
              ? "أنشئ حسابك للبدء في متابعة الأحداث وتسليم المناوبة."
              : screen === "forgot"
                ? "أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا لإعادة التعيين."
                : screen === "reset"
                  ? "اختر كلمة مرور جديدة لحسابك."
                  : "أدخل بيانات حساب العمل لمتابعة تسليم المناوبة مع فريقك."}
          </p>
          <form id="login-form" noValidate onSubmit={handleLogin}>
            {screen === "signup" && (
              <div className="field">
                <label htmlFor="display-name">الاسم الظاهر</label>
                <input
                  id="display-name"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  placeholder="الاسم الكامل"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setLoginMessage("");
                    setSuccessMessage("");
                  }}
                />
              </div>
            )}
            {screen !== "reset" && (
              <div className="field">
                <label htmlFor="email">البريد الإلكتروني</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@company.com"
                  required
                  aria-describedby="form-message"
                  value={email}
                  aria-invalid={loginMessage.includes("بريد إلكتروني") || undefined}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setLoginMessage("");
                  setSuccessMessage("");
                  }}
                />
              </div>
            )}
            {screen !== "forgot" && (
              <div className="field">
                <label htmlFor="password">{screen === "reset" ? "كلمة المرور الجديدة" : "كلمة المرور"}</label>
                <div className="password-box">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={screen === "login" ? "current-password" : "new-password"}
                    placeholder={screen === "login" ? "أدخل كلمة المرور" : "٨ أحرف على الأقل"}
                    required
                    minLength={8}
                    aria-describedby="form-message"
                    value={password}
                    aria-invalid={loginMessage.includes("8 أحرف") || undefined}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setLoginMessage("");
                      setSuccessMessage("");
                    }}
                  />
                  <button
                    className="toggle-pass"
                    type="button"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((showing) => !showing)}
                  >
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>
              </div>
            )}
            {screen === "login" && (
              <div className="meta">
                <label className="remember">
                  <input type="checkbox" name="remember" /> تذكرني
                </label>
                <a className="help-link" href="/forgot-password">
                  هل نسيت كلمة المرور؟
                </a>
              </div>
            )}
            <button className="submit" type="submit" aria-busy={loginLoading} disabled={loginLoading}>
              <span className="spinner" aria-hidden="true" />
              <span className="button-label">
                {loginLoading
                  ? "جارٍ التحقق…"
                  : screen === "signup"
                    ? "إنشاء الحساب"
                    : screen === "forgot"
                      ? "إرسال رابط الاستعادة"
                      : screen === "reset"
                        ? "تحديث كلمة المرور"
                        : "دخول إلى مساحة العمل"}
              </span>
            </button>
            <p className={`message${loginMessage ? " error" : ""}`} id="form-message" role="status" aria-live="polite">
              {loginMessage}
            </p>
            {successMessage && <p className="message success" role="status">{successMessage}</p>}
          </form>
          <p className="auth-switch">
            {screen === "signup" ? "لديك حساب بالفعل؟ " : screen === "login" ? "ليس لديك حساب؟ " : "تذكرت كلمة المرور؟ "}
            <a href={screen === "signup" ? "/" : screen === "login" ? "/signup" : "/"}>
              {screen === "login" ? "إنشاء حساب" : "سجّل الدخول"}
            </a>
          </p>
          <div className="secure">
            <LockIcon />
            {authConfigured ? "اتصال آمن بخدمة المصادقة" : "أضف إعدادات Supabase لتفعيل المصادقة"}
          </div>
        </div>
      </section>

      <footer className="bottom-note" hidden={isDashboard}>
        <span>Hand Over</span> · تسليم واضح، ومناوبة تبدأ بثقة
      </footer>

      <section className="dashboard" hidden={!isDashboard} aria-label="لوحة الأحداث">
        <header className="dash-top">
          <div className="dash-brand">
            <span className="dash-brand-mark" aria-hidden="true">
              <BrandMark />
            </span>
            Hand Over
          </div>
          <div className="dash-user">
            <span>{currentUser}{initialUser?.email ? ` · ${initialUser.email}` : ""}</span>
            <button className="logout" type="button" onClick={handleLogout}>
              تسجيل الخروج
            </button>
          </div>
        </header>

        <div className="dash-main">
          {notice && (
            <p className={`app-notice${/(تعذر|لا تملك|لم يُحذف|حدث خطأ|مشكلة)/.test(notice) ? " error" : ""}`} role="status" aria-live="polite">
              {notice}
            </p>
          )}
          <div className="dash-heading">
            <div>
              <p className="dash-eyebrow">تسليم المناوبة</p>
              <h1>الأحداث</h1>
              <p>تابع آخر المستجدات وأضف تحديثًا إلى الخط الزمني للحدث.</p>
            </div>
            <button type="button" className="new-event" onClick={() => openDialog("new")}>
              ＋ إضافة حدث
            </button>
          </div>
          <div className="event-tools">
            <span className="event-count" id="event-count">
              {new Intl.NumberFormat("ar").format(visibleRecords.length)}{" "}
              {visibleRecords.length === 1 ? "حدث" : "أحداث"}
            </span>
            <div className="event-filter" role="group" aria-label="تصفية الأحداث">
              {(
                [
                  ["all", "الكل"],
                  ["open", "مفتوح"],
                  ["closed", "مغلق"],
                ] as const
              ).map(([filter, label]) => (
                <button
                  className={`filter-btn${activeFilter === filter ? " active" : ""}`}
                  data-filter={filter}
                  type="button"
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="events-grid" id="events-grid" aria-live="polite">
            {visibleRecords.length ? (
              visibleRecords.map((record) => (
                <article
                  className="event-card"
                  data-glow
                  data-id={record.id}
                  key={record.id}
                  style={{ "--glow-hue": 145 } as CSSProperties}
                  onPointerMove={handleCardPointer}
                >
                  <div className="event-top">
                    <div>
                      <h2 className="event-title">{record.title}</h2>
                      <div className="event-date">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="3.5" y="5" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M7.5 3v4M16.5 3v4M4 9.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        {formatDate(record.date)}
                      </div>
                    </div>
                    <span className={`status ${record.status}`}>
                      {record.status === "open" ? "مفتوح" : "مغلق"}
                    </span>
                  </div>
                  <p className="event-details">{record.details}</p>
                  <div className="event-meta">
                    <span>
                      أنشأه <strong>{record.creator}</strong>
                    </span>
                    <span>آخر تحديث {formatTime(lastActivity(record))}</span>
                  </div>
                  <h3 className="timeline-title">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    الخط الزمني · {new Intl.NumberFormat("ar").format(record.timeline.length)} تحديثات
                  </h3>
                  <div className="timeline">
                    {record.timeline
                      .slice()
                      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
                      .map((entry, index) => (
                        <div className="timeline-item" key={entry.id || `${record.id}-${entry.at}-${index}`}>
                          <div className="timeline-head">
                            <strong>{entry.author}</strong>
                            <time>{formatTime(entry.at)}</time>
                          </div>
                          <p>{entry.text}</p>
                        </div>
                      ))}
                  </div>
                  <div className="card-actions">
                    <button className="small-action" data-action="update" type="button" disabled={pendingRecordId === record.id} onClick={() => openDialog("update", record)}>
                      ＋ إضافة تحديث
                    </button>
                    {record.creatorId === initialUser?.id && (
                      <>
                        <button className="small-action" data-action="edit" type="button" disabled={pendingRecordId === record.id} onClick={() => openDialog("edit", record)}>
                          تعديل الحدث
                        </button>
                        <button className="small-action" data-action="status" type="button" disabled={pendingRecordId === record.id} onClick={() => void toggleStatus(record)}>
                          {record.status === "open" ? "إغلاق الحدث" : "إعادة فتحه"}
                        </button>
                        <button className="small-action danger" data-action="delete" type="button" disabled={pendingRecordId === record.id} onClick={() => void deleteEvent(record)}>
                          {pendingRecordId === record.id ? "جارٍ الحذف…" : "حذف الحدث"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <strong>لا توجد أحداث هنا</strong>
                جرّب تغيير التصفية أو أضف حدثًا جديدًا.
              </div>
            )}
          </div>
        </div>
      </section>

      <dialog className="event-dialog" ref={dialogRef}>
        <form className="dialog-inner" onSubmit={saveEvent}>
          <div className="dialog-head">
            <h2>{dialogHeading}</h2>
            <button
              type="button"
              className="dialog-close"
              aria-label="إغلاق"
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          {dialogMode !== "update" && (
            <>
              <div className="dialog-field event-field">
                <label htmlFor="event-title-input">عنوان الحدث</label>
                <input
                  id="event-title-input"
                  maxLength={100}
                  placeholder="مثال: حريق في المستودع"
                  required
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                />
              </div>
              <div className="dialog-field date-field">
                <label htmlFor="event-date-input">تاريخ الحدث</label>
                <input
                  id="event-date-input"
                  type="date"
                  required
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </div>
            </>
          )}
          <div className="dialog-field">
            <label htmlFor="event-details-input">
              {dialogIsUpdate ? "تفاصيل التحديث" : "تفاصيل الحدث"}
            </label>
            <textarea
              id="event-details-input"
              maxLength={1500}
              placeholder={dialogIsUpdate ? "ما الذي استجد في هذا الحدث؟" : "اكتب تفاصيل الحدث..."}
              required
              value={eventDetails}
              onChange={(event) => setEventDetails(event.target.value)}
            />
          </div>
          <div className="dialog-actions">
            <button className="primary-action" type="submit" disabled={Boolean(pendingRecordId)}>
              {pendingRecordId ? "جارٍ الحفظ…" : dialogIsUpdate ? "إضافة التحديث" : "حفظ الحدث"}
            </button>
            <button className="secondary-action" type="button" onClick={() => dialogRef.current?.close()}>
              إلغاء
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
