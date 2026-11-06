/* Admin dashboard (Day 1 shell + Day 4 quick claim review). Charts and full screens arrive on Day 5. */
(function () {
  "use strict";
  const CF = window.CF;
  const esc = CF.util.escapeHtml;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const KIND = { submitted: "Claim submitted", info_requested: "Asked for more information", reply: "Claimant replied", approved: "Approved", rejected: "Rejected", auto_rejected: "Closed automatically", cancelled: "Cancelled by claimant", returned: "Marked as returned" };

  document.addEventListener("cf:ready", function (e) {
    const admin = e.detail.user;
    document.getElementById("admin-greeting").textContent = "Hello, " + admin.name.split(" ")[0] + ".";
    const queue = document.getElementById("claims-queue");

    const row = (label, value) => (value ? "<div><dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>" : "");
    const photos = (list) =>
      list && list.length ? '<ul class="evidence-list static">' + list.filter((p) => CF.reports.isSafePhoto(p)).map((p, i) => '<li><img src="' + p + '" alt="Evidence ' + (i + 1) + '"></li>').join("") + "</ul>" : "";

    /* ---------- figures + latest reports ---------- */
    function renderFigures() {
      const items = CF.db.items();
      const claims = CF.db.claims();
      const counts = {
        "kpi-lost": items.filter((i) => i.type === "lost" && i.status === "open").length,
        "kpi-found": items.filter((i) => i.type === "found" && i.status === "open").length,
        "kpi-claims": claims.filter((c) => c.status === "pending").length,
        "kpi-returned": items.filter((i) => i.status === "returned").length,
        "kpi-users": CF.db.users().filter((u) => u.role !== "admin").length,
      };
      Object.keys(counts).forEach((id) => { document.getElementById(id).textContent = counts[id]; });

      const recent = items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
      document.getElementById("recent-body").innerHTML = recent
        .map(function (i) {
          const reporter = CF.db.userById(i.reporterId);
          return (
            "<tr><td>" + esc(i.ref) + '</td><td><span class="badge badge-' + i.type + '">' + (i.type === "lost" ? "Lost" : "Found") + "</span></td>" +
            "<td>" + esc(i.title) + "</td><td>" + esc(i.location) + "</td><td>" + esc(reporter ? reporter.name : "—") + "</td>" +
            '<td><span class="badge badge-' + i.status + '">' + esc(cap(i.status)) + "</span></td>" +
            "<td>" + esc(CF.util.formatDate(i.createdAt)) + "</td></tr>"
          );
        })
        .join("");
    }

    /* ---------- claims queue ---------- */
    function actions(c) {
      if (c.status === "pending") {
        return '<button class="btn btn-found btn-sm" data-act="approve" data-id="' + esc(c.id) + '">Approve</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="request_info" data-id="' + esc(c.id) + '">Ask for info</button>' +
          '<button class="btn btn-ghost btn-sm btn-danger-ghost" data-act="reject" data-id="' + esc(c.id) + '">Reject</button>';
      }
      if (c.status === "needs_info") {
        return '<span class="muted small">Waiting for the claimant</span>' +
          '<button class="btn btn-found btn-sm" data-act="approve" data-id="' + esc(c.id) + '">Approve</button>' +
          '<button class="btn btn-ghost btn-sm btn-danger-ghost" data-act="reject" data-id="' + esc(c.id) + '">Reject</button>';
      }
      return '<button class="btn btn-primary btn-sm" data-act="return" data-id="' + esc(c.id) + '">Mark as returned</button>';
    }

    function queueCard(c) {
      const item = CF.reports.find(c.itemId);
      const who = CF.db.userById(c.claimantId);
      const finder = item ? CF.db.userById(item.reporterId) : null;
      const linked = c.lostReportId ? CF.reports.find(c.lostReportId) : null;
      return (
        '<article class="card queue-card"><div class="queue-head"><div>' +
        "<strong>" + esc(c.ref) + '</strong> <span class="badge badge-' + esc(c.status) + '">' + esc(CF.claims.STATUS_LABELS[c.status]) + "</span>" +
        '<p class="meta">' + esc(who ? who.name + " (" + (CF.ROLES[who.role] ? CF.ROLES[who.role].label : who.role) + ")" : "Unknown") + " claims " +
        esc(item ? item.ref + " · " + item.title : "a removed item") + " · submitted " + esc(CF.util.timeAgo(c.createdAt)) + "</p></div>" +
        '<div class="queue-actions">' + actions(c) + "</div></div>" +
        "<details><summary>Review proof</summary>" +
        '<div class="proof-grid"><div><h4>Claimant says</h4><dl class="facts compact">' +
        row("Description", c.description) + row("Contents / marks", c.proofDetails) + row("Lost on", CF.util.formatDate(c.lostDate)) + row("Lost at", c.lostLocation) +
        row("Linked report", linked ? linked.ref + " · " + linked.title : "") + "</dl>" + photos(c.evidence) + "</div>" +
        "<div><h4>Finder's record</h4><dl class=\"facts compact\">" +
        (item ? row("Public description", item.description) + row("Private marks", item.identifyingMarks || "(none given)") + row("Found at", item.location + " · " + CF.util.formatDate(item.dateOccurred)) + row("Kept at", item.storedAt) + row("Found by", finder ? finder.name : "") : "") +
        "</dl>" + (item && CF.reports.isSafePhoto(item.photo) ? '<ul class="evidence-list static"><li><img src="' + item.photo + '" alt="Finder\'s photo"></li></ul>' : "") + "</div></div>" +
        "<h4>Activity</h4><ul class=\"mini-log\">" +
        c.timeline.map((t) => "<li><strong>" + esc(KIND[t.kind] || t.kind) + "</strong> · " + esc(CF.util.timeAgo(t.at)) + (t.text && t.kind !== "submitted" ? " — " + esc(t.text) : "") + "</li>").join("") +
        "</ul></details></article>"
      );
    }

    function renderQueue() {
      const q = CF.claims.reviewQueue();
      queue.innerHTML = q.length ? q.map(queueCard).join("") : '<div class="empty">No claims need attention right now.</div>';
    }

    function renderAll() { renderFigures(); renderQueue(); }

    queue.addEventListener("click", function (ev) {
      const b = ev.target.closest("[data-act]");
      if (!b) return;
      const id = b.dataset.id, act = b.dataset.act;
      let res;
      if (act === "approve") {
        const note = window.prompt("Pickup instructions for the claimant (optional):", "Please bring your school ID to the Administration office.");
        if (note === null) return;
        res = CF.claims.review(id, "approve", admin, note);
      } else if (act === "request_info") {
        const note = window.prompt("What do you need the claimant to tell you?");
        if (note === null) return;
        res = CF.claims.review(id, "request_info", admin, note);
      } else if (act === "reject") {
        const note = window.prompt("Reason for rejecting (the claimant will see this):");
        if (note === null) return;
        res = CF.claims.review(id, "reject", admin, note);
      } else if (act === "return") {
        if (!window.confirm("Mark this item as handed back to its owner?")) return;
        res = CF.claims.markReturned(id, admin);
      } else return;
      CF.ui.toast(res.ok ? "Done. The claimant has been notified." : res.message, res.ok ? "success" : "error");
      renderAll();
    });

    document.getElementById("reset-demo").addEventListener("click", function () {
      if (window.confirm("Reset all demo data? Reports, claims and any accounts you registered will be erased.")) {
        CF.resetDemoData();
        CF.auth.logout();
        window.location.href = "../login.html";
      }
    });

    renderAll();
  });
})();
