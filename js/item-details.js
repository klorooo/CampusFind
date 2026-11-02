/* Item details page controller (Day 2) */
(function () {
  "use strict";
  const CF = window.CF;
  const esc = CF.util.escapeHtml;
  const rootEl = document.getElementById("detail-root");

  function row(label, value) {
    if (!value) return "";
    return "<div><dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>";
  }

  function notFound() {
    rootEl.innerHTML =
      '<div class="coming"><span class="pill">Not found</span><h1 style="font-size:2rem">We couldn\'t find that report</h1>' +
      '<p class="muted">It may have been removed, or the link is incorrect.</p>' +
      '<a class="btn btn-primary" href="my-reports.html">Go to My Reports</a></div>';
  }

  function render(user) {
    const params = new URLSearchParams(window.location.search);
    const item = CF.reports.find(params.get("id") || params.get("ref"));
    if (!item) return notFound();

    document.title = item.title + " — CampusFind";
    const isOwner = user.id === item.reporterId;
    const priv = CF.reports.canSeePrivate(item, user);
    const reporter = CF.reports.reporterOf(item);
    const isLost = item.type === "lost";

    const banner =
      params.get("created") && isOwner
        ? '<div class="alert alert-success created-banner" role="status"><strong>Report submitted.</strong> Your reference number is ' +
          '<span class="ref-pill">' + esc(item.ref) + "</span>. Keep it for follow-ups.</div>"
        : "";

    const photo = CF.reports.isSafePhoto(item.photo)
      ? '<img class="detail-photo" src="' + item.photo + '" alt="Photo of ' + esc(item.title) + '">'
      : '<div class="detail-photo ph ' + item.type + '" aria-hidden="true"><span>' + (isLost ? "L" : "F") + "</span><small>No photo provided</small></div>";

    const marks =
      priv && item.identifyingMarks
        ? '<div class="private-box"><strong>Identifying marks</strong><p>' + esc(item.identifyingMarks) + '</p><small>Private — only you and administrators can see this.</small></div>'
        : "";

    let contact;
    if (priv && reporter) {
      contact = row("Contact", reporter.contact) + row("Email", reporter.email);
    } else {
      contact = '<div><dt>Contact</dt><dd class="muted">Private. Administrators will connect you once a claim is verified.</dd></div>';
    }

    // actions
    let actions = "";
    if (isOwner && item.status === "open") {
      actions += '<button class="btn btn-ghost btn-block" type="button" id="withdraw-btn">Withdraw this report</button>';
    } else if (!isOwner && item.status === "open") {
      actions += item.type === "found"
        ? '<a class="btn btn-primary btn-block" href="claim-form.html?item=' + encodeURIComponent(item.id) + '">This is mine — start a claim</a>'
        : '<a class="btn btn-found btn-block" href="report-found.html">I found this item</a>';
    }
    if (item.status === "withdrawn") actions += '<div class="alert alert-info">This report was withdrawn' + (item.withdrawnAt ? " on " + esc(CF.util.formatDate(item.withdrawnAt)) : "") + ".</div>";

    const back = isOwner ? '<a class="back-link" href="my-reports.html">← My Reports</a>' : '<a class="back-link" href="index.html">← Home</a>';

    const matchesCard = isOwner
      ? '<section class="card" style="margin-top:20px"><h3>Possible matches</h3><p class="muted" style="margin:0">Automatic match suggestions will appear here (coming Day 3).</p></section>'
      : "";

    rootEl.innerHTML =
      back + banner +
      '<div class="detail-layout">' +
      '<div><article class="card detail-main">' + photo +
      '<div class="detail-title"><div class="report-top"><span class="badge badge-' + item.type + '">' + (isLost ? "Lost" : "Found") + "</span>" +
      '<span class="badge badge-' + item.status + '">' + esc(CF.reports.STATUS_LABELS[item.status] || item.status) + "</span></div>" +
      "<h1>" + esc(item.title) + "</h1></div>" +
      '<p class="detail-desc">' + esc(item.description) + "</p>" +
      '<dl class="facts">' +
      row("Category", item.category) + row("Colour", item.color) + row("Brand", item.brand) +
      row(isLost ? "Last seen at" : "Found at", item.location) + row("Place details", item.locationDetail) +
      row(isLost ? "Date lost" : "Date found", CF.util.formatDate(item.dateOccurred)) +
      (item.type === "found" ? row("Item is now", item.storedAt) : "") +
      "</dl>" + marks + "</article>" + matchesCard + "</div>" +

      '<aside class="card detail-side"><h3>Report info</h3><dl class="facts">' +
      '<div><dt>Reference</dt><dd><span class="ref-pill">' + esc(item.ref) + "</span></dd></div>" +
      row("Reported", CF.util.formatDate(item.createdAt) + " (" + CF.util.timeAgo(item.createdAt) + ")") +
      row("Reported by", reporter ? reporter.name + " · " + (CF.ROLES[reporter.role] ? CF.ROLES[reporter.role].label : reporter.role) : "Unknown") +
      contact + "</dl>" +
      '<div class="side-actions">' + actions + "</div></aside>" +
      "</div>";

    if (params.get("created") && isOwner) CF.ui.toast("Report " + item.ref + " saved.", "success");

    const w = document.getElementById("withdraw-btn");
    if (w) {
      w.addEventListener("click", function () {
        if (!window.confirm("Withdraw this report? It will no longer be matched or claimed.")) return;
        const res = CF.reports.withdraw(item.id, user);
        if (res.ok) { CF.ui.toast("Report withdrawn.", "success"); render(user); }
        else CF.ui.toast(res.message, "error");
      });
    }
  }

  document.addEventListener("cf:ready", function (e) { render(e.detail.user); });
})();
