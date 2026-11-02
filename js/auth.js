/* ==========================================================================
   CampusFind — authentication & role guards (Day 1)
   Requires app.js. Exposes CF.auth.
   ========================================================================== */
(function (global) {
  "use strict";
  const CF = global.CF;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^(\+?63|0)9\d{9}$/;

  const auth = {
    /** The signed-in user, or null. Disabled accounts are treated as signed out. */
    currentUser() {
      const session = CF.storage.get(CF.KEYS.session, null);
      if (!session || !session.userId) return null;
      const user = CF.db.userById(session.userId);
      return user && user.status === "active" ? user : null;
    },

    isAdmin(user) {
      return !!user && user.role === "admin";
    },

    /** Where a user lands after signing in. `root` is the relative path back to site root. */
    homeFor(user, root) {
      return (root || "") + (auth.isAdmin(user) ? "admin/dashboard.html" : "index.html");
    },

    login(email, password) {
      const errors = {};
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail) errors.email = "Enter your email address.";
      else if (!EMAIL_RE.test(cleanEmail)) errors.email = "That doesn't look like a valid email.";
      if (!password) errors.password = "Enter your password.";
      if (Object.keys(errors).length) return { ok: false, errors };

      const user = CF.db.users().find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user || user.passwordHash !== CF.util.hash(password)) {
        return { ok: false, errors: {}, message: "Incorrect email or password." };
      }
      if (user.status !== "active") {
        return { ok: false, errors: {}, message: "This account is disabled. Please contact the administrator." };
      }
      CF.storage.set(CF.KEYS.session, { userId: user.id, at: new Date().toISOString() });
      return { ok: true, user };
    },

    logout() {
      CF.storage.remove(CF.KEYS.session);
    },

    validateRegistration(data) {
      const errors = {};
      const name = String(data.name || "").trim();
      const email = String(data.email || "").trim().toLowerCase();
      const contact = String(data.contact || "").replace(/[\s-]/g, "");
      const role = data.role;

      if (name.length < 3) errors.name = "Enter your full name (at least 3 characters).";
      if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
      else if (CF.db.users().some((u) => u.email.toLowerCase() === email)) errors.email = "That email is already registered.";

      if (!role || !CF.ROLES[role] || !CF.ROLES[role].registrable) errors.role = "Choose how you are part of the campus.";
      if (!String(data.idNumber || "").trim()) errors.idNumber = "Enter your school or employee ID number.";
      if (!PHONE_RE.test(contact)) errors.contact = "Enter a valid PH mobile number (e.g. 09171234567).";

      const pw = String(data.password || "");
      if (pw.length < 8) errors.password = "Use at least 8 characters.";
      else if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) errors.password = "Include at least one letter and one number.";
      if (data.confirm !== pw) errors.confirm = "Passwords do not match.";

      return { errors, clean: { name, email, contact, role, idNumber: String(data.idNumber || "").trim(), password: pw } };
    },

    /** Creates the account and signs the user in. */
    register(data) {
      const { errors, clean } = auth.validateRegistration(data);
      if (Object.keys(errors).length) return { ok: false, errors };

      const user = {
        id: CF.util.uid("u"),
        name: clean.name,
        email: clean.email,
        role: clean.role,
        idNumber: clean.idNumber,
        contact: clean.contact,
        passwordHash: CF.util.hash(clean.password),
        status: "active",
        createdAt: new Date().toISOString(),
      };
      const users = CF.db.users();
      users.push(user);
      CF.db.saveUsers(users);
      CF.storage.set(CF.KEYS.session, { userId: user.id, at: new Date().toISOString() });
      return { ok: true, user };
    },

    /**
     * Page guard. `allowed` is "any" (signed-in) or an array of roles.
     * Redirects to login (with ?next=) or to the user's own home. Returns the user, or null if redirecting.
     */
    requireRole(allowed, root) {
      const user = auth.currentUser();
      const here = global.location.pathname.split("/").pop() || "index.html";
      if (!user) {
        global.location.replace((root || "") + "login.html?next=" + encodeURIComponent((root ? "admin/" : "") + here));
        return null;
      }
      if (allowed !== "any" && allowed.indexOf(user.role) === -1) {
        global.location.replace(auth.homeFor(user, root));
        return null;
      }
      return user;
    },
  };

  CF.auth = auth;
})(typeof window !== "undefined" ? window : globalThis);
