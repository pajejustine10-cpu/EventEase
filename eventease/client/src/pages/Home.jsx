import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  UserPlus,
  Users,
  X,
  Zap
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/Home.css";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=85";

const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85";

const TZ = "Asia/Manila";

const FAQ_ITEMS = [
  {
    q: "Can I browse events without an account?",
    a: "Yes. You can explore upcoming events and open any event’s details from this page. You’ll need an account when you’re ready to register."
  },
  {
    q: "How do I know if there are spots left?",
    a: "Every event shows its remaining spots and a capacity bar, so you can see at a glance whether it’s open, filling fast, or fully booked."
  },
  {
    q: "Where can I see the events I’ve registered for?",
    a: "Once you’re signed in, your dashboard keeps all of your registrations in one place so you can track your upcoming plans."
  },
  {
    q: "How do I get started?",
    a: "Create an account, pick an event you like, and register. The whole process takes only a few moments."
  }
];

/* ---------- helpers ---------- */

function getImageUrl(path) {
  if (!path || typeof path !== "string") return "";
  if (/^https?:\/\//i.test(path)) return path;

  const baseURL =
    api.defaults.baseURL || "http://localhost:5000/api";

  const origin = new URL(baseURL, window.location.origin).origin;

  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function getSlots(event) {
  return Math.max(
    0,
    Number(event.capacity || 0) - Number(event.registeredCount || 0)
  );
}

function getFillPercent(event) {
  const capacity = Number(event.capacity || 0);
  if (!capacity) return 0;
  return Math.min(
    100,
    Math.round((Number(event.registeredCount || 0) / capacity) * 100)
  );
}

function getStatus(event) {
  const slots = getSlots(event);
  const capacity = Number(event.capacity || 0);

  if (slots === 0) return { key: "full", label: "Fully booked" };
  if (capacity && slots / capacity <= 0.2) {
    return { key: "few", label: "Filling fast" };
  }
  return { key: "open", label: "Open" };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TZ
  });
}

function formatLongDate(date) {
  return new Date(date).toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: TZ
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ
  });
}

function formatMonth(date) {
  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    timeZone: TZ
  });
}

function formatDay(date) {
  return new Date(date).toLocaleDateString("en-PH", {
    day: "numeric",
    timeZone: TZ
  });
}

/* ---------- hooks ---------- */

function useCountdown(date) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!date) return undefined;

    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [date]);

  if (!date) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const diff = Math.max(0, new Date(date).getTime() - now);
  const total = Math.floor(diff / 1000);

  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60
  };
}

function useCountUp(target, active) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return undefined;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduce || target === 0) {
      setValue(target);
      return undefined;
    }

    let frame;
    const start = performance.now();
    const duration = 900;

    function tick(time) {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);

  return value;
}

/* ---------- components ---------- */

function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduce || !("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`ee-reveal ${visible ? "ee-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function StatItem({ icon: Icon, value, label, loading }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setSeen(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
        observer.disconnect();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shown = useCountUp(value, seen && !loading);

  return (
    <div ref={ref}>
      <Icon size={22} />
      <span>
        <strong>{loading ? "—" : shown}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

function EventCard({ event, onPreview }) {
  const slots = getSlots(event);
  const image = getImageUrl(event.image);
  const status = getStatus(event);
  const fill = getFillPercent(event);

  return (
    <article className="ee-event-card">
      <button
        type="button"
        className="ee-event-image-button"
        onClick={() => onPreview(event)}
        aria-label={`View details for ${event.title}`}
      >
        {image ? (
          <img
            src={image}
            alt={`${event.title} event`}
            loading="lazy"
          />
        ) : (
          <div className="ee-event-image-fallback">
            <CalendarDays size={37} />
          </div>
        )}

        <span className="ee-image-shade" aria-hidden="true" />

        <span className="ee-date-badge" aria-hidden="true">
          <b>{formatDay(event.date)}</b>
          <small>{formatMonth(event.date)}</small>
        </span>

        <span className={`ee-status ee-status-${status.key}`}>
          {status.label}
        </span>

        <span className="ee-event-image-view" aria-hidden="true">
          <ArrowUpRight size={19} />
        </span>
      </button>

      <div className="ee-event-content">
        <div className="ee-event-date">
          <Clock3 size={14} />
          {formatDate(event.date)} · {formatTime(event.date)}
        </div>

        <h3>{event.title}</h3>

        <p className="ee-event-description">{event.description}</p>

        <div className="ee-event-information">
          <span>
            <MapPin size={15} />
            {event.location}
          </span>

          <span>
            <Ticket size={15} />
            {slots === 0
              ? "No spots left"
              : `${slots} ${slots === 1 ? "spot" : "spots"} available`}
          </span>

          <div
            className="ee-capacity"
            role="img"
            aria-label={`${fill}% of spots taken`}
          >
            <i
              className={`ee-capacity-${status.key}`}
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          className="ee-event-link"
          onClick={() => onPreview(event)}
        >
          View details
          <ArrowRight size={17} />
        </button>
      </div>
    </article>
  );
}

function EventSkeleton() {
  return (
    <div className="ee-event-grid" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div className="ee-event-card ee-skeleton-card" key={i}>
          <div className="ee-skeleton ee-skeleton-image" />
          <div className="ee-event-content">
            <div className="ee-skeleton ee-skeleton-line short" />
            <div className="ee-skeleton ee-skeleton-line title" />
            <div className="ee-skeleton ee-skeleton-line" />
            <div className="ee-skeleton ee-skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Spotlight({ event, onOpen }) {
  const { days, hours, minutes, seconds } = useCountdown(event.date);
  const image = getImageUrl(event.image) || HERO_IMAGE;
  const slots = getSlots(event);
  const status = getStatus(event);

  const units = [
    ["Days", days],
    ["Hours", hours],
    ["Mins", minutes],
    ["Secs", seconds]
  ];

  return (
    <section className="ee-spotlight" aria-label="Next upcoming event">
      <div className="ee-container">
        <Reveal className="ee-spotlight-card">
          <div className="ee-spotlight-media">
            <img src={image} alt={`${event.title} event`} loading="lazy" />
            <span className="ee-spotlight-tag">
              <Zap size={14} />
              Happening next
            </span>
          </div>

          <div className="ee-spotlight-body">
            <span className={`ee-status ee-status-inline ee-status-${status.key}`}>
              {status.label}
            </span>

            <h2>{event.title}</h2>

            <p>{event.description}</p>

            <ul className="ee-spotlight-meta">
              <li>
                <CalendarDays size={17} />
                {formatLongDate(event.date)}
              </li>
              <li>
                <Clock3 size={17} />
                {formatTime(event.date)}
              </li>
              <li>
                <MapPin size={17} />
                {event.location}
              </li>
              <li>
                <Users size={17} />
                {slots > 0 ? `${slots} spots left` : "Fully booked"}
              </li>
            </ul>

            <div className="ee-countdown" role="timer" aria-label="Time until event starts">
              {units.map(([label, value]) => (
                <div key={label}>
                  <b>{String(value).padStart(2, "0")}</b>
                  <small>{label}</small>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="ee-spotlight-button"
              onClick={() => onOpen(event)}
            >
              View event details
              <ArrowUpRight size={18} />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FaqItem({ item, open, onToggle, index }) {
  const id = `ee-faq-${index}`;

  return (
    <div className={`ee-faq-item ${open ? "open" : ""}`}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          onClick={onToggle}
        >
          {item.q}
          <span className="ee-faq-icon">
            <Plus size={18} />
          </span>
        </button>
      </h3>

      <div
        className="ee-faq-panel"
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
      >
        <div>
          <p>{item.a}</p>
        </div>
      </div>
    </div>
  );
}

function EventModal({ event, user, onClose, onContinue }) {
  const closeButtonRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!event) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const controls = Array.from(
          modalRef.current?.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || []
        );

        if (!controls.length) return;

        const first = controls[0];
        const last = controls[controls.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [event, onClose]);

  if (!event) return null;

  const image = getImageUrl(event.image);
  const slots = getSlots(event);
  const status = getStatus(event);
  const fill = getFillPercent(event);

  let actionLabel = "Browse other events";
  if (slots > 0) {
    actionLabel = user ? "Go to events" : "Sign up to register";
  }

  return (
    <div
      className="ee-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="ee-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ee-modal-title"
        aria-describedby="ee-modal-description"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="ee-modal-close"
          onClick={onClose}
          aria-label="Close event preview"
        >
          <X size={20} />
        </button>

        <div className="ee-modal-image">
          {image ? (
            <img src={image} alt={`${event.title} event`} />
          ) : (
            <div className="ee-modal-placeholder">
              <CalendarDays size={50} />
            </div>
          )}
        </div>

        <div className="ee-modal-body">
          <span className={`ee-status ee-status-inline ee-status-${status.key}`}>
            {status.label}
          </span>

          <h2 id="ee-modal-title">{event.title}</h2>

          <p className="ee-modal-description" id="ee-modal-description">
            {event.description}
          </p>

          <div className="ee-modal-facts">
            <div>
              <CalendarDays size={19} />
              <span>
                <small>Date</small>
                <strong>{formatLongDate(event.date)}</strong>
              </span>
            </div>

            <div>
              <Clock3 size={19} />
              <span>
                <small>Time</small>
                <strong>{formatTime(event.date)}</strong>
              </span>
            </div>

            <div>
              <MapPin size={19} />
              <span>
                <small>Location</small>
                <strong>{event.location}</strong>
              </span>
            </div>

            <div>
              <Users size={19} />
              <span>
                <small>Availability</small>
                <strong>
                  {slots > 0
                    ? `${slots} of ${Number(event.capacity || 0)} spots remaining`
                    : "Fully booked"}
                </strong>
                <span className="ee-capacity ee-capacity-modal" aria-hidden="true">
                  <i
                    className={`ee-capacity-${status.key}`}
                    style={{ width: `${fill}%` }}
                  />
                </span>
              </span>
            </div>
          </div>

          <div className="ee-modal-actions">
            <button
              type="button"
              className="ee-button ee-button-outline"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="button"
              className="ee-button ee-button-dark"
              onClick={() => onContinue(event)}
            >
              {actionLabel}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("soonest");
  const [availability, setAvailability] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDate, setActiveDate] = useState("any");
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const progressRef = useRef(null);

  const browsePath = user ? "/events" : "/register";

  const closeModal = useCallback(() => setSelectedEvent(null), []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Unable to load events:", err);
      setError("Events are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    let ticking = false;

    function update() {
      const y = window.scrollY;
      const max =
        document.documentElement.scrollHeight - window.innerHeight;

      setScrolled(y > 10);
      setShowTop(y > 700);

      if (progressRef.current) {
        const ratio = max > 0 ? Math.min(1, y / max) : 0;
        progressRef.current.style.transform = `scaleX(${ratio})`;
      }

      ticking = false;
    }

    function handleScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => new Date(event.date).getTime() > now);
  }, [events]);

  const stats = useMemo(() => {
    const spots = upcomingEvents.reduce(
      (sum, event) => sum + getSlots(event),
      0
    );

    const locations = new Set(
      upcomingEvents.map((event) => event.location).filter(Boolean)
    ).size;

    return { count: upcomingEvents.length, spots, locations };
  }, [upcomingEvents]);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = new Date();

    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const weekEnd = new Date(dayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return upcomingEvents
      .filter((event) => {
        const searchable = [event.title, event.description, event.location]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (term && !searchable.includes(term)) return false;

        const slots = getSlots(event);

        if (availability === "available" && slots === 0) return false;
        if (availability === "full" && slots > 0) return false;

        const eventDate = new Date(event.date);

        if (activeDate === "week" && !(eventDate < weekEnd)) return false;
        if (activeDate === "month" && !(eventDate < monthEnd)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sort === "latest") return new Date(b.date) - new Date(a.date);
        if (sort === "title") return a.title.localeCompare(b.title);
        return new Date(a.date) - new Date(b.date);
      });
  }, [upcomingEvents, query, sort, availability, activeDate]);

  const isFiltering =
    Boolean(query.trim()) || availability !== "all" || activeDate !== "any";

  const displayedEvents =
    showAll || isFiltering ? filteredEvents : filteredEvents.slice(0, 3);

  const featuredEvent = useMemo(
    () =>
      [...upcomingEvents].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      )[0],
    [upcomingEvents]
  );

  function scrollToEvents() {
    document.getElementById("events")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function handleSearch(e) {
    e.preventDefault();
    setShowAll(true);
    scrollToEvents();
  }

  function handleContinue() {
    setSelectedEvent(null);
    navigate(browsePath);
  }

  function resetFilters() {
    setQuery("");
    setSort("soonest");
    setAvailability("all");
    setActiveDate("any");
    setShowAll(false);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="ee-home" id="top">
      <a href="#events" className="ee-skip-link">
        Skip to events
      </a>

      <div className="ee-progress" aria-hidden="true">
        <div ref={progressRef} />
      </div>

      {/* HEADER */}
      <header
        className={`ee-header ${scrolled ? "ee-header-scrolled" : ""}`}
      >
        <div className="ee-container ee-navbar">
          <Link
            to="/"
            className="ee-logo"
            onClick={() => setMenuOpen(false)}
          >
            <span className="ee-logo-symbol">
              <CalendarDays size={20} />
            </span>
            Event<span>Ease</span>
          </Link>

          <nav
            className={`ee-nav ${menuOpen ? "ee-nav-open" : ""}`}
            id="ee-main-nav"
            aria-label="Main navigation"
          >
            <a href="#top" onClick={() => setMenuOpen(false)}>
              Home
            </a>
            <a href="#events" onClick={() => setMenuOpen(false)}>
              Explore events
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#why-eventease" onClick={() => setMenuOpen(false)}>
              Why EventEase
            </a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>
              FAQ
            </a>

            <div className="ee-mobile-auth">
              {user ? (
                <Link to="/dashboard">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login">Sign in</Link>
                  <Link to="/register">Create account</Link>
                </>
              )}
            </div>
          </nav>

          <div className="ee-header-actions">
            {!user && (
              <Link to="/login" className="ee-header-login">
                Sign in
              </Link>
            )}

            <Link
              to={user ? "/dashboard" : "/register"}
              className="ee-header-cta"
            >
              {user ? "Dashboard" : "Get started"}
              <ArrowUpRight size={17} />
            </Link>
          </div>

          <button
            type="button"
            className="ee-mobile-menu"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="ee-main-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="ee-hero">
          <div className="ee-blob ee-blob-a" aria-hidden="true" />
          <div className="ee-blob ee-blob-b" aria-hidden="true" />
          <div className="ee-hero-grid-bg" aria-hidden="true" />

          <div className="ee-container ee-hero-grid">
            <div className="ee-hero-copy">
              <span className="ee-pill ee-rise" style={{ "--d": "0ms" }}>
                <span className="ee-eyebrow-dot" />
                Your next experience starts here
              </span>

              <h1 className="ee-rise" style={{ "--d": "90ms" }}>
                Discover what’s happening <em>next.</em>
              </h1>

              <p className="ee-rise" style={{ "--d": "180ms" }}>
                Great experiences bring people together. Find upcoming
                events, save your spot, and make every moment count — all
                in one place.
              </p>

              <form
                className="ee-hero-search ee-rise"
                style={{ "--d": "270ms" }}
                onSubmit={handleSearch}
                role="search"
              >
                <Search size={20} />

                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events or locations"
                  aria-label="Search events"
                />

                <button type="submit">
                  Find events
                  <ArrowRight size={17} />
                </button>
              </form>

              <div
                className="ee-hero-links ee-rise"
                style={{ "--d": "360ms" }}
              >
                <span>
                  <Check size={16} />
                  Easy registration
                </span>
                <span>
                  <Check size={16} />
                  Live availability
                </span>
                <span>
                  <Check size={16} />
                  One simple platform
                </span>
              </div>
            </div>

            <div className="ee-hero-media ee-rise" style={{ "--d": "200ms" }}>
              <div className="ee-hero-frame">
                <img
                  src={HERO_IMAGE}
                  alt="People enjoying a live event"
                  fetchPriority="high"
                />

                <div className="ee-hero-image-overlay" />

                <div className="ee-hero-image-content">
                  <div className="ee-photo-caption">MADE FOR GREAT MOMENTS</div>
                  <strong>Be there for the moments that matter.</strong>
                </div>
              </div>

              {featuredEvent && (
                <button
                  type="button"
                  className="ee-floating-feature"
                  onClick={() => setSelectedEvent(featuredEvent)}
                >
                  <span className="ee-floating-icon">
                    <CalendarDays size={20} />
                  </span>

                  <span>
                    <small>NEXT UPCOMING EVENT</small>
                    <strong>{featuredEvent.title}</strong>
                    <em>{formatDate(featuredEvent.date)}</em>
                  </span>

                  <ArrowUpRight size={19} />
                </button>
              )}

              {!loading && !error && stats.spots > 0 && (
                <div className="ee-floating-chip" aria-hidden="true">
                  <span className="ee-live-dot" />
                  <strong>{stats.spots}</strong> spots open right now
                </div>
              )}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="ee-stats" aria-label="Platform at a glance">
          <div className="ee-container ee-stats-grid">
            <StatItem
              icon={Compass}
              value={stats.count}
              label="Upcoming events"
              loading={loading}
            />
            <StatItem
              icon={Ticket}
              value={stats.spots}
              label="Spots open to book"
              loading={loading}
            />
            <StatItem
              icon={MapPin}
              value={stats.locations}
              label="Locations"
              loading={loading}
            />
          </div>
        </section>

        {/* SPOTLIGHT */}
        {!loading && !error && featuredEvent && (
          <Spotlight event={featuredEvent} onOpen={setSelectedEvent} />
        )}

        {/* EVENTS */}
        <section className="ee-events-section" id="events">
          <div className="ee-container">
            <Reveal className="ee-section-heading">
              <div>
                <span className="ee-eyebrow">THE EVENT COLLECTION</span>

                <h2>
                  Find your next <em>experience.</em>
                </h2>

                <p>Explore the latest upcoming events, all in one place.</p>
              </div>

              <Link to={browsePath} className="ee-text-link">
                Browse all events
                <ArrowUpRight size={18} />
              </Link>
            </Reveal>

            <div className="ee-filter-panel">
              <div className="ee-filter-tabs" role="group" aria-label="Date filter">
                {[
                  ["any", "All dates"],
                  ["week", "Next 7 days"],
                  ["month", "This month"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={activeDate === value ? "active" : ""}
                    aria-pressed={activeDate === value}
                    onClick={() => setActiveDate(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="ee-filter-controls">
                <label className="ee-select-wrap">
                  <SlidersHorizontal size={16} />
                  <span className="ee-sr-only">Availability</span>

                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                  >
                    <option value="all">All availability</option>
                    <option value="available">Available spots</option>
                    <option value="full">Fully booked</option>
                  </select>
                </label>

                <label className="ee-select-wrap">
                  <span className="ee-sr-only">Sort events</span>

                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="soonest">Soonest first</option>
                    <option value="latest">Latest first</option>
                    <option value="title">Title A–Z</option>
                  </select>

                  <ChevronDown size={15} />
                </label>
              </div>
            </div>

            {isFiltering && !loading && !error && (
              <div className="ee-query-summary" aria-live="polite">
                <span>
                  {filteredEvents.length}{" "}
                  {filteredEvents.length === 1 ? "event" : "events"} found
                  {query.trim() && (
                    <>
                      {" "}
                      for <strong>“{query.trim()}”</strong>
                    </>
                  )}
                </span>

                <button type="button" onClick={resetFilters}>
                  Clear all
                  <X size={14} />
                </button>
              </div>
            )}

            {loading ? (
              <EventSkeleton />
            ) : error ? (
              <div className="ee-empty-state" role="alert">
                <h3>{error}</h3>
                <p>Please check your connection and try again.</p>
                <button
                  type="button"
                  className="ee-button ee-button-dark"
                  onClick={loadEvents}
                >
                  Try again
                </button>
              </div>
            ) : displayedEvents.length ? (
              <>
                <div className="ee-event-grid">
                  {displayedEvents.map((event, index) => (
                    <Reveal key={event._id} delay={(index % 3) * 90}>
                      <EventCard event={event} onPreview={setSelectedEvent} />
                    </Reveal>
                  ))}
                </div>

                {filteredEvents.length > 3 && !isFiltering && (
                  <div className="ee-show-more">
                    <button
                      type="button"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? "Show fewer events" : "View more events"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="ee-empty-state">
                <Search size={34} />
                <h3>
                  {isFiltering
                    ? "No matching events found"
                    : "No upcoming events yet"}
                </h3>
                <p>
                  {isFiltering
                    ? "Try a different search or update your filters."
                    : "Check back soon — new events are added regularly."}
                </p>

                {isFiltering && (
                  <button
                    type="button"
                    className="ee-button ee-button-dark"
                    onClick={resetFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="ee-how" id="how-it-works">
          <div className="ee-container">
            <Reveal className="ee-why-heading ee-center">
              <span className="ee-eyebrow">HOW IT WORKS</span>
              <h2>Three steps to your next event.</h2>
            </Reveal>

            <ol className="ee-steps">
              {[
                {
                  icon: Search,
                  n: "01",
                  title: "Explore",
                  text: "Browse upcoming events and filter by date or availability."
                },
                {
                  icon: UserPlus,
                  n: "02",
                  title: "Create an account",
                  text: "Sign up in moments so your registrations stay in one place."
                },
                {
                  icon: Ticket,
                  n: "03",
                  title: "Register",
                  text: "Secure your spot and track it from your dashboard."
                }
              ].map(({ icon: Icon, n, title, text }, i) => (
                <Reveal as="li" key={n} delay={i * 110}>
                  <span className="ee-step-icon">
                    <Icon size={24} />
                  </span>
                  <b>{n}</b>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* WHY EVENTEASE */}
        <section className="ee-why" id="why-eventease">
          <div className="ee-container">
            <Reveal className="ee-why-heading">
              <span className="ee-eyebrow">SIMPLE BY DESIGN</span>

              <h2>
                Everything you need. <br />
                Nothing you don’t.
              </h2>

              <p>
                From discovering an event to managing a registration,
                EventEase keeps the process straightforward.
              </p>
            </Reveal>

            <div className="ee-features-grid">
              {[
                {
                  icon: Search,
                  title: "Find the right event",
                  text: "Search by event name or location and discover upcoming experiences in seconds."
                },
                {
                  icon: ShieldCheck,
                  title: "Simple registration",
                  text: "Register online and check available slots without complicated manual forms."
                },
                {
                  icon: CheckCircle2,
                  title: "Keep track with ease",
                  text: "View your registrations and manage your upcoming plans through your account."
                }
              ].map(({ icon: Icon, title, text }, i) => (
                <Reveal
                  as="article"
                  className="ee-feature-card"
                  key={title}
                  delay={i * 110}
                >
                  <span>
                    <Icon size={23} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="ee-about" id="about">
          <div className="ee-container ee-about-grid">
            <Reveal className="ee-about-image">
              <img
                src={ABOUT_IMAGE}
                alt="People enjoying an experience together"
                loading="lazy"
              />

              <div className="ee-about-image-label">
                <Sparkles size={17} />
                Experiences worth sharing
              </div>
            </Reveal>

            <Reveal className="ee-about-copy" delay={120}>
              <span className="ee-eyebrow">ABOUT EVENTEASE</span>

              <h2>
                Better events start with <em>better access.</em>
              </h2>

              <p>
                EventEase is a web-based event management platform that
                makes it easier to connect people with upcoming
                experiences.
              </p>

              <p>
                Whether you’re attending a seminar, joining a community
                gathering, or organizing an event, everything you need
                stays in one place.
              </p>

              <Link to={browsePath} className="ee-text-link">
                Start exploring
                <ArrowUpRight size={18} />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="ee-faq" id="faq">
          <div className="ee-container ee-faq-grid">
            <Reveal className="ee-faq-intro">
              <span className="ee-eyebrow">FAQ</span>
              <h2>Questions? We’ve got answers.</h2>
              <p>
                Everything you need to know before you register for your
                first event.
              </p>
            </Reveal>

            <Reveal className="ee-faq-list" delay={100}>
              {FAQ_ITEMS.map((item, index) => (
                <FaqItem
                  key={item.q}
                  item={item}
                  index={index}
                  open={openFaq === index}
                  onToggle={() =>
                    setOpenFaq(openFaq === index ? -1 : index)
                  }
                />
              ))}
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="ee-final-section">
          <div className="ee-container">
            <Reveal className="ee-final-card">
              <div>
                <span className="ee-eyebrow">READY FOR SOMETHING NEW?</span>

                <h2>
                  Your next great <br />
                  experience awaits.
                </h2>

                <p>
                  Discover upcoming events, register with ease, and make
                  every moment count.
                </p>
              </div>

              <Link to={browsePath} className="ee-final-button">
                {user ? "Explore events" : "Get started for free"}
                <ArrowUpRight size={18} />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="ee-footer">
        <div className="ee-container">
          <div className="ee-footer-top">
            <div>
              <Link to="/" className="ee-logo">
                <span className="ee-logo-symbol">
                  <CalendarDays size={19} />
                </span>
                Event<span>Ease</span>
              </Link>

              <p>Discover more. Experience more.</p>
            </div>

            <nav aria-label="Footer navigation">
              <a href="#top">Home</a>
              <a href="#events">Events</a>
              <a href="#how-it-works">How it works</a>
              <a href="#why-eventease">Features</a>
              <a href="#about">About</a>
              <a href="#faq">FAQ</a>
            </nav>
          </div>

          <div className="ee-footer-bottom">
            <span>
              © {new Date().getFullYear()} EventEase. All rights reserved.
            </span>
            <span>Made for memorable experiences.</span>
          </div>
        </div>
      </footer>

      <button
        type="button"
        className={`ee-to-top ${showTop ? "show" : ""}`}
        onClick={scrollToTop}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUp size={20} />
      </button>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          user={user}
          onClose={closeModal}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}




