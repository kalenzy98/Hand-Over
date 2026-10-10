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

type EventStatus = "open" | "closed";
type TimelineEntry = { author: string; at: string; text: string };
type HandoverEvent = {
  id: string;
  title: string;
  date: string;
  createdAt: string;
  creator: string;
  status: EventStatus;
  details: string;
  timeline: TimelineEntry[];
};
type Filter = "all" | EventStatus;
type DialogMode = "new" | "edit" | "update";

const STORAGE_KEY = "handover-demo-v1";
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
const VIDEO_POSTER =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";

function dayOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function dayOffsetAtNoon(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizeRecords(value: unknown): HandoverEvent[] {
  if (!Array.isArray(value)) return sampleEvents();

  const fallbackTime = new Date().toISOString();
  return value.map((item: unknown, index): HandoverEvent => {
    const raw = item && typeof item === "object" ? (item as Partial<HandoverEvent>) : {};
    const createdAt = isValidTimestamp(raw.createdAt) ? raw.createdAt : fallbackTime;
    const timeline: TimelineEntry[] = Array.isArray(raw.timeline)
      ? raw.timeline.map((entry: unknown) => {
          const rawEntry =
            entry && typeof entry === "object"
              ? (entry as Partial<TimelineEntry>)
              : {};
          return {
            author: typeof rawEntry.author === "string" ? rawEntry.author : "غير معروف",
            at: isValidTimestamp(rawEntry.at) ? rawEntry.at : createdAt,
            text: typeof rawEntry.text === "string" ? rawEntry.text : "",
          };
        })
      : [];

    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : `legacy-${index}`,
      title: typeof raw.title === "string" ? raw.title : "حدث سابق",
      date:
        typeof raw.date === "string" && Number.isFinite(Date.parse(`${raw.date}T12:00:00`))
          ? raw.date
          : createdAt.slice(0, 10),
      createdAt,
      creator: typeof raw.creator === "string" ? raw.creator : "غير معروف",
      status: raw.status === "closed" ? "closed" : "open",
      details: typeof raw.details === "string" ? raw.details : "",
      timeline,
    };
  });
}

function sampleEvents(): HandoverEvent[] {
  return [
    {
      id: "evt-fire",
      title: "حريق في المستودع الشرقي",
      date: dayOffset(-1).slice(0, 10),
      createdAt: dayOffset(-1),
      creator: "خالد",
      status: "closed",
      details: "ورد بلاغ عن تصاعد دخان من المستودع الشرقي. تم إخلاء المنطقة وإبلاغ فريق السلامة.",
      timeline: [
        {
          author: "خالد",
          at: dayOffset(-1),
          text: "ورد البلاغ عند بداية المناوبة. تم إخلاء المستودع وإبعاد العاملين عن الموقع.",
        },
        {
          author: "ناصر",
          at: dayOffsetAtNoon(-1),
          text: "وصل فريق السلامة، وتمت السيطرة على الحريق. لا توجد إصابات، والموقع آمن.",
        },
      ],
    },
    {
      id: "evt-wall",
      title: "انهيار جزئي في سور المبنى B",
      date: dayOffset(0).slice(0, 10),
      createdAt: dayOffset(-0.12),
      creator: "خالد",
      status: "open",
      details: "انهار جزء من السور الخارجي قرب بوابة الخدمة. المنطقة محاطة بشريط تحذيري لحين المعاينة.",
      timeline: [
        {
          author: "خالد",
          at: dayOffset(-0.12),
          text: "أُبلغ عن سقوط جزء من السور. أُغلقت بوابة الخدمة مؤقتًا وأُبعد المارّة عن المنطقة.",
        },
        {
          author: "ناصر",
          at: dayOffset(-0.06),
          text: "وصل فريق الصيانة وبدأ المعاينة. يُرجى إبقاء البوابة مغلقة حتى اكتمال الفحص.",
        },
      ],
    },
    {
      id: "evt-power",
      title: "انقطاع التيار عن غرفة التحكم",
      date: dayOffset(-2).slice(0, 10),
      createdAt: dayOffset(-2),
      creator: "ناصر",
      status: "closed",
      details: "انقطع التيار الاحتياطي في غرفة التحكم لفترة قصيرة، مع استمرار الأنظمة الأساسية في العمل.",
      timeline: [
        {
          author: "ناصر",
          at: dayOffset(-2),
          text: "تم رصد الانقطاع وتحويل التغذية إلى المصدر الاحتياطي.",
        },
        {
          author: "سارة",
          at: dayOffset(-1.8),
          text: "أُعيد التيار وفُحصت الأنظمة. جميعها تعمل بصورة طبيعية.",
        },
      ],
    },
  ];
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

export default function HandOverApp() {
  const [activeVideo, setActiveVideo] = useState<"a" | "b">("a");
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const [isDashboard, setIsDashboard] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState("خالد");
  const [records, setRecords] = useState<HandoverEvent[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("new");
  const [dialogRecordId, setDialogRecordId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDetails, setEventDetails] = useState("");

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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : null;
      setRecords(normalizeRecords(parsed));
    } catch {
      setRecords(sampleEvents());
    }
    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // The demo remains usable if browser storage is unavailable.
    }
  }, [records, storageLoaded]);

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

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginMessage("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLoginMessage("تحقق من كتابة بريد إلكتروني صحيح.");
      return;
    }
    if (password.length < 8) {
      setLoginMessage("أدخل كلمة مرور لا تقل عن 8 أحرف.");
      return;
    }
    setLoginLoading(true);
    window.setTimeout(() => {
      setLoginLoading(false);
      setIsDashboard(true);
    }, 500);
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

  function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const details = eventDetails.trim();
    const title = eventTitle.trim();
    if (!details) return;

    if (dialogMode === "new") {
      const id =
        window.crypto?.randomUUID?.() ??
        `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setRecords((current) => [
        ...current,
        {
          id,
          title,
          date: eventDate,
          createdAt: now,
          creator: currentUser,
          status: "open",
          details,
          timeline: [{ author: currentUser, at: now, text: details }],
        },
      ]);
    } else {
      setRecords((current) =>
        current.map((record) => {
          if (record.id !== dialogRecordId) return record;
          if (dialogMode === "edit") {
            return {
              ...record,
              title,
              date: eventDate,
              details,
              timeline: [
                ...record.timeline,
                { author: currentUser, at: now, text: "تم تعديل عنوان الحدث وتفاصيله." },
              ],
            };
          }
          return {
            ...record,
            timeline: [...record.timeline, { author: currentUser, at: now, text: details }],
          };
        }),
      );
    }
    dialogRef.current?.close();
  }

  function toggleStatus(id: string) {
    const now = new Date().toISOString();
    setRecords((current) =>
      current.map((record) => {
        if (record.id !== id) return record;
        const status: EventStatus = record.status === "open" ? "closed" : "open";
        return {
          ...record,
          status,
          timeline: [
            ...record.timeline,
            {
              author: currentUser,
              at: now,
              text: status === "closed" ? "تم إغلاق الحدث." : "تمت إعادة فتح الحدث.",
            },
          ],
        };
      }),
    );
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
          <p className="kicker">مرحبًا بعودتك</p>
          <h1 id="login-title">تسجيل الدخول</h1>
          <p className="intro">أدخل بيانات حساب العمل لمتابعة تسليم المناوبة مع فريقك.</p>
          <form id="login-form" noValidate onSubmit={handleLogin}>
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
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="password">كلمة المرور</label>
              <div className="password-box">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="أدخل كلمة المرور"
                  required
                  minLength={8}
                  aria-describedby="form-message"
                  value={password}
                  aria-invalid={loginMessage.includes("8 أحرف") || undefined}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setLoginMessage("");
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
            <div className="meta">
              <label className="remember">
                <input type="checkbox" name="remember" /> تذكرني
              </label>
              <a
                className="help-link"
                href="mailto:it-support@example.com?subject=استعادة%20الوصول"
              >
                هل نسيت كلمة المرور؟
              </a>
            </div>
            <button className="submit" type="submit" aria-busy={loginLoading} disabled={loginLoading}>
              <span className="spinner" aria-hidden="true" />
              <span className="button-label">دخول إلى مساحة العمل</span>
            </button>
            <p className={`message${loginMessage ? " error" : ""}`} id="form-message" role="status" aria-live="polite">
              {loginMessage}
            </p>
          </form>
          <div className="secure">
            <LockIcon />
            نسخة معاينة — التحقق من الحساب سيُضاف لاحقًا
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
            <span>المستخدم الحالي</span>
            <select
              id="user-select"
              aria-label="المستخدم الحالي"
              value={currentUser}
              onChange={(event) => setCurrentUser(event.target.value)}
            >
              <option>خالد</option>
              <option>ناصر</option>
              <option>سارة</option>
            </select>
            <button className="logout" type="button" onClick={() => setIsDashboard(false)}>
              تسجيل الخروج
            </button>
          </div>
        </header>

        <div className="dash-main">
          <div className="demo-banner">
            معاينة تفاعلية: تُحفظ التغييرات في هذا المتصفح فقط. تسجيل الدخول والمزامنة بين المستخدمين وقاعدة البيانات ستُضاف في مراحل لاحقة.
          </div>
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
            {!storageLoaded ? null : visibleRecords.length ? (
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
                        <div className="timeline-item" key={`${record.id}-${entry.at}-${index}`}>
                          <div className="timeline-head">
                            <strong>{entry.author}</strong>
                            <time>{formatTime(entry.at)}</time>
                          </div>
                          <p>{entry.text}</p>
                        </div>
                      ))}
                  </div>
                  <div className="card-actions">
                    <button className="small-action" data-action="update" type="button" onClick={() => openDialog("update", record)}>
                      ＋ إضافة تحديث
                    </button>
                    <button className="small-action" data-action="edit" type="button" onClick={() => openDialog("edit", record)}>
                      تعديل الحدث
                    </button>
                    <button className="small-action" data-action="status" type="button" onClick={() => toggleStatus(record.id)}>
                      {record.status === "open" ? "إغلاق الحدث" : "إعادة فتحه"}
                    </button>
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
            <button className="primary-action" type="submit">
              {dialogIsUpdate ? "إضافة التحديث" : "حفظ الحدث"}
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
