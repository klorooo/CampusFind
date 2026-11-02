/* ==========================================================================
   CampusFind — core data layer (Day 1)
   Frontend-only prototype: all data lives in localStorage under "cf_*" keys.
   Loaded first on every page; exposes the global `CF`.
   ========================================================================== */
(function (global) {
  "use strict";

  const SEED_VERSION = "1";
  const KEYS = {
    seedVersion: "cf_seed_version",
    users: "cf_users",
    items: "cf_items",
    claims: "cf_claims",
    matches: "cf_matches",
    notifications: "cf_notifications",
    categories: "cf_categories",
    locations: "cf_locations",
    counters: "cf_counters",
    session: "cf_session",
  };

  /* ---------- safe storage (falls back to memory if localStorage is blocked) ---------- */
  const memoryStore = {};
  const storage = {
    get(key, fallback) {
      try {
        const raw = global.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return key in memoryStore ? memoryStore[key] : fallback;
      }
    },
    /** Returns true when persisted to localStorage, false when it fell back to memory (e.g. quota exceeded). */
    set(key, value) {
      try {
        global.localStorage.setItem(key, JSON.stringify(value));
        delete memoryStore[key];
        return true;
      } catch (e) {
        memoryStore[key] = value;
        return false;
      }
    },
    remove(key) {
      try { global.localStorage.removeItem(key); } catch (e) { /* ignore */ }
      delete memoryStore[key];
    },
  };

  /* ---------- small utilities ---------- */
  const util = {
    uid(prefix) {
      return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },
    /** Sequential reference numbers: LST-0001, FND-0001, CLM-0001 */
    nextRef(prefix) {
      const counters = storage.get(KEYS.counters, {});
      counters[prefix] = (counters[prefix] || 0) + 1;
      storage.set(KEYS.counters, counters);
      return prefix + "-" + String(counters[prefix]).padStart(4, "0");
    },
    escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
    /** Parses "YYYY-MM-DD" as a local date (new Date() would treat it as UTC and can shift the day). */
    parseDate(value) {
      if (!value) return new Date(NaN);
      return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00") : new Date(value);
    },
    /** Today as "YYYY-MM-DD" in local time. */
    todayStr() {
      const d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    },
    formatDate(iso) {
      if (!iso) return "—";
      const d = util.parseDate(iso);
      if (isNaN(d)) return "—";
      return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    },
    timeAgo(iso) {
      const d = new Date(iso);
      if (isNaN(d)) return "";
      const s = Math.floor((Date.now() - d.getTime()) / 1000);
      if (s < 60) return "just now";
      if (s < 3600) return Math.floor(s / 60) + " min ago";
      if (s < 86400) return Math.floor(s / 3600) + " hr ago";
      if (s < 86400 * 30) return Math.floor(s / 86400) + " day" + (Math.floor(s / 86400) === 1 ? "" : "s") + " ago";
      return util.formatDate(iso);
    },
    daysAgoISO(n) {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString();
    },
    initials(name) {
      const parts = String(name || "?").trim().split(/\s+/);
      return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
    },
    /** Prototype-only string hash (cyrb53). NOT secure — a real backend must use bcrypt/argon2. */
    hash(str) {
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    },
  };

  /* ---------- reference data ---------- */
  const ROLES = {
    student: { label: "Student", hint: "Currently enrolled", registrable: true },
    faculty: { label: "Faculty", hint: "Professors & instructors", registrable: true },
    guard: { label: "Guard", hint: "Security personnel", registrable: true },
    maintenance: { label: "Maintenance", hint: "Maintenance staff", registrable: true },
    admin: { label: "Administrator", hint: "Verifies claims", registrable: false },
  };

  // NOTE: placeholder campus areas — replace with the actual URS Binangonan building names.
  const DEFAULT_CATEGORIES = [
    "Phones & Gadgets", "Wallets & Cards", "IDs & Documents", "Bags", "Keys",
    "Clothing", "Books & School Supplies", "Eyewear", "Bottles & Umbrellas",
    "Jewelry & Accessories", "Others",
  ];
  const DEFAULT_LOCATIONS = [
    "Main Gate", "Library", "Canteen", "Gymnasium", "Administration Building",
    "Classrooms", "Computer Laboratory", "Restrooms", "Parking Area", "Quadrangle / Covered Court", "Others",
  ];

  /* ---------- seed data ---------- */
  function buildSeedUsers() {
    const now = new Date().toISOString();
    const mk = (id, name, email, role, idNumber, contact, password) => ({
      id, name, email, role, idNumber, contact,
      passwordHash: util.hash(password), status: "active", createdAt: now,
    });
    return [
      mk("u_admin", "Campus Admin", "admin@campusfind.test", "admin", "ADM-0001", "09170000001", "Admin@123"),
      mk("u_student", "Juan Dela Cruz", "student@campusfind.test", "student", "2023-00123", "09170000002", "Student@123"),
      mk("u_faculty", "Prof. Maria Santos", "faculty@campusfind.test", "faculty", "FAC-0456", "09170000003", "Faculty@123"),
      mk("u_guard", "Mang Roberto Reyes", "guard@campusfind.test", "guard", "SEC-0078", "09170000004", "Guard@123"),
      mk("u_maint", "Ate Luz Garcia", "maintenance@campusfind.test", "maintenance", "MNT-0021", "09170000005", "Maint@123"),
    ];
  }

  function buildSeedItems() {
    const mk = (type, title, category, location, color, brand, description, daysAgo, reporterId) => ({
      id: util.uid("item"),
      ref: util.nextRef(type === "lost" ? "LST" : "FND"),
      type, title, category, location, color, brand, description,
      dateOccurred: util.daysAgoISO(daysAgo),
      photo: null,
      status: "open",
      reporterId,
      createdAt: util.daysAgoISO(daysAgo),
    });
    return [
      mk("lost", "Black wallet with school ID", "Wallets & Cards", "Canteen", "Black", "",
        "Bi-fold leather wallet. Contains student ID and a few small bills.", 2, "u_student"),
      mk("found", "Black bi-fold wallet", "Wallets & Cards", "Canteen", "Black", "",
        "Found on a table near the counter. Turned in to the guard house.", 1, "u_guard"),
      mk("lost", "Blue umbrella", "Bottles & Umbrellas", "Library", "Blue", "",
        "Foldable umbrella with a wooden handle.", 4, "u_faculty"),
      mk("found", "Set of keys with red keychain", "Keys", "Main Gate", "Silver", "",
        "Three keys on a red ring, found near the gate.", 3, "u_maint"),
      mk("lost", "Scientific calculator", "Books & School Supplies", "Computer Laboratory", "Gray", "Casio",
        "Casio fx-series calculator with name sticker on the back.", 5, "u_student"),
      mk("found", "Gray hoodie", "Clothing", "Gymnasium", "Gray", "",
        "Medium-size hoodie left on the bleachers.", 1, "u_maint"),
    ];
  }

  function seedIfNeeded(force) {
    if (!force && storage.get(KEYS.seedVersion, null) === SEED_VERSION) return;
    Object.values(KEYS).forEach((k) => storage.remove(k));
    storage.set(KEYS.categories, DEFAULT_CATEGORIES);
    storage.set(KEYS.locations, DEFAULT_LOCATIONS);
    storage.set(KEYS.users, buildSeedUsers());
    storage.set(KEYS.items, buildSeedItems());
    storage.set(KEYS.claims, []);
    storage.set(KEYS.matches, []);
    storage.set(KEYS.notifications, []);
    storage.set(KEYS.seedVersion, SEED_VERSION);
  }

  /* ---------- collections ---------- */
  const db = {
    users: () => storage.get(KEYS.users, []),
    saveUsers: (v) => storage.set(KEYS.users, v),
    items: () => storage.get(KEYS.items, []),
    saveItems: (v) => storage.set(KEYS.items, v),
    claims: () => storage.get(KEYS.claims, []),
    saveClaims: (v) => storage.set(KEYS.claims, v),
    matches: () => storage.get(KEYS.matches, []),
    saveMatches: (v) => storage.set(KEYS.matches, v),
    notifications: () => storage.get(KEYS.notifications, []),
    saveNotifications: (v) => storage.set(KEYS.notifications, v),
    categories: () => storage.get(KEYS.categories, DEFAULT_CATEGORIES),
    locations: () => storage.get(KEYS.locations, DEFAULT_LOCATIONS),
    userById: (id) => db.users().find((u) => u.id === id) || null,
  };

  /* ---------- toasts ---------- */
  const ui = {
    toast(message, kind) {
      if (typeof document === "undefined") return;
      let stack = document.querySelector(".toast-stack");
      if (!stack) {
        stack = document.createElement("div");
        stack.className = "toast-stack";
        stack.setAttribute("role", "status");
        stack.setAttribute("aria-live", "polite");
        document.body.appendChild(stack);
      }
      const t = document.createElement("div");
      t.className = "toast " + (kind || "");
      t.textContent = message;
      stack.appendChild(t);
      setTimeout(() => t.remove(), 4200);
    },
  };

  seedIfNeeded(false);

  global.CF = {
    KEYS, ROLES, storage, util, db, ui,
    resetDemoData() { seedIfNeeded(true); },
  };
})(typeof window !== "undefined" ? window : globalThis);
