/* Admin dashboard shell (Day 1): live counts. Charts arrive on Day 5. */
(function () {
  "use strict";
  const CF = window.CF;
  const esc = CF.util.escapeHtml;

  document.addEventListener("cf:ready", function (e) {
    const user = e.detail.user;
    document.getElementById("admin-greeting").textContent = "Hello, " + user.name.split(" ")[0] + ".";

    const items = CF.db.items();
    const claims = CF.db.claims();
    const users = CF.db.users();

    const counts = {
      "kpi-lost": items.filter(function (i) { return i.type === "lost" && i.status === "open"; }).length,
      "kpi-found": items.filter(function (i) { return i.type === "found" && i.status === "open"; }).length,
      "kpi-claims": claims.filter(function (c) { return c.status === "pending"; }).length,
      "kpi-returned": items.filter(function (i) { return i.status === "returned"; }).length,
      "kpi-users": users.filter(function (u) { return u.role !== "admin"; }).length,
    };
    Object.keys(counts).forEach(function (id) { document.getElementById(id).textContent = counts[id]; });

    const body = document.getElementById("recent-body");
    const recent = items
      .slice()
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })
      .slice(0, 6);
    body.innerHTML = recent
      .map(function (i) {
        const reporter = CF.db.userById(i.reporterId);
        return (
          "<tr><td>" + esc(i.ref) + '</td><td><span class="badge badge-' + i.type + '">' + (i.type === "lost" ? "Lost" : "Found") + "</span></td>" +
          "<td>" + esc(i.title) + "</td><td>" + esc(i.location) + "</td><td>" + esc(reporter ? reporter.name : "—") + "</td>" +
          '<td><span class="badge badge-' + i.status + '">' + esc(i.status.charAt(0).toUpperCase() + i.status.slice(1)) + "</span></td>" +
          "<td>" + esc(CF.util.formatDate(i.createdAt)) + "</td></tr>"
        );
      })
      .join("");

    document.getElementById("reset-demo").addEventListener("click", function () {
      if (window.confirm("Reset all demo data? Reports, claims and any accounts you registered will be erased.")) {
        CF.resetDemoData();
        CF.auth.logout();
        window.location.href = "../login.html";
      }
    });
  });
})();
