/* Landing page controller: live stats, recent items, personalised hero */
(function () {
  "use strict";
  const CF = window.CF;
  const esc = CF.util.escapeHtml;

  function render(user) {
    const items = CF.db.items();
    const openLost = items.filter(function (i) { return i.type === "lost" && i.status === "open"; }).length;
    const openFound = items.filter(function (i) { return i.type === "found" && i.status === "open"; }).length;
    const returned = items.filter(function (i) { return i.status === "returned"; }).length;

    document.getElementById("stat-lost").textContent = openLost;
    document.getElementById("stat-found").textContent = openFound;
    document.getElementById("stat-returned").textContent = returned;

    // hero call-to-action depends on sign-in state
    const cta = document.getElementById("hero-cta");
    if (user) {
      document.getElementById("hero-eyebrow").textContent = "Welcome back, " + user.name.split(" ")[0];
      cta.innerHTML =
        '<a class="btn btn-lost btn-lg" href="report-lost.html">I lost something</a>' +
        '<a class="btn btn-found btn-lg" href="report-found.html">I found something</a>' +
        '<a class="btn btn-ghost btn-lg" href="search.html">Search items</a>';
    } else {
      cta.innerHTML =
        '<a class="btn btn-primary btn-lg" href="register.html">Get started</a>' +
        '<a class="btn btn-ghost btn-lg" href="login.html">Log in</a>';
    }

    if (new URLSearchParams(window.location.search).get("welcome")) {
      CF.ui.toast("Welcome to CampusFind! Your account is ready.", "success");
    }

    // recent items
    const list = document.getElementById("recent-items");
    const recent = items
      .slice()
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })
      .slice(0, 5);
    if (!recent.length) {
      list.innerHTML = '<div class="empty">No items have been reported yet.</div>';
      return;
    }
    list.innerHTML = recent
      .map(function (i) {
        return (
          '<div class="item-row">' +
          '<div class="item-ico ' + i.type + '" aria-hidden="true">' + (i.type === "lost" ? "L" : "F") + "</div>" +
          "<div><h4>" + esc(i.title) + '</h4><div class="meta">' + esc(i.category) + " · " + esc(i.location) + " · " + esc(CF.util.timeAgo(i.createdAt)) + "</div></div>" +
          '<div class="badge-col"><span class="badge badge-' + i.type + '">' + (i.type === "lost" ? "Lost" : "Found") + "</span></div>" +
          "</div>"
        );
      })
      .join("");
  }

  document.addEventListener("cf:ready", function (e) { render(e.detail.user); });
})();
