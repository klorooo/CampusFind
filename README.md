# CampusFind — Day 1 + Day 2 build

Lost-and-found web app for the University of Rizal System Binangonan community.
Frontend-only prototype: HTML + CSS + vanilla JS, data stored in the browser's `localStorage`.

## Run it
Open `index.html` in a browser (double-click works). For best results serve the folder:

```
python3 -m http.server 8000      # then visit http://localhost:8000
```

## Demo accounts
| Role        | Email                        | Password     |
|-------------|------------------------------|--------------|
| Admin       | admin@campusfind.test        | Admin@123    |
| Student     | student@campusfind.test      | Student@123  |
| Faculty     | faculty@campusfind.test      | Faculty@123  |
| Guard       | guard@campusfind.test        | Guard@123    |
| Maintenance | maintenance@campusfind.test  | Maint@123    |

The login page has one-click buttons that fill these in. Admins land on `admin/dashboard.html`; everyone else lands on `index.html`.
Admin dashboard → "Reset demo data" restores the seed data.

## What works on Day 1
- Design system (`css/styles.css`): colour tokens, type pairing, buttons, forms, cards, tables, badges, toasts, responsive layout
- Data layer (`js/app.js`): localStorage wrapper, seed data (5 users, 6 items, 11 categories, 11 locations), reference-number generator, helpers
- Auth (`js/auth.js`): register, log in, log out, validation, role guards, safe `?next=` redirect
- Shared layout (`js/layout.js`): navbar for visitors/users, sidebar for admins, footer, mobile menus, account dropdown
- Pages: landing, login, register, admin dashboard (live counts + latest reports)
- Every menu link resolves to a "Coming on Day N" placeholder so nothing 404s

## What works on Day 2
- **Report a lost item** (`report-lost.html`) and **report a found item** (`report-found.html`): validated forms (name, category, colour, brand, place, date, description, private identifying marks, optional photo; found reports also record where the item is now)
- Photos are resized in the browser (max 900 px JPEG, about 260 KB) before saving; JPG, PNG and WebP accepted
- Sequential reference numbers: `LST-0004`, `FND-0004`, …
- **My Reports** (`my-reports.html`): your reports as cards with Lost/Found and status badges, type tabs with counts, text search, status filter, and Withdraw
- **Item details** (`item-details.html?id=…` or `?ref=LST-0004`): full details; contact info and identifying marks are visible only to the reporter and administrators; found items show a "start a claim" link (the claim form arrives on Day 4)
- Safer storage: if the browser's storage is full, a report is rejected cleanly instead of being half-saved

Statuses in use: Open, Matched, Claimed, Returned, Withdrawn (Matched/Claimed/Returned get set by Days 3–5).

## File map
```
index.html  login.html  register.html
report-lost.html  report-found.html  my-reports.html  item-details.html
search.html  my-claims.html  claim-form.html  profile.html         (placeholders)
admin/dashboard.html                                                (working)
admin/lost-reports  found-reports  matches  claims  verify-claim
      returned-items  users  .html                                  (placeholders)
css/styles.css
js/app.js  auth.js  layout.js  home.js  login.js  register.js  admin-dashboard.js
js/reports.js  report-form.js  my-reports.js  item-details.js        (Day 2)
assets/uploads/
```

## Page contract
Every page sets three attributes on `<body>`:
`data-root` (relative path to the site root), `data-page` (menu key to highlight), `data-area` (`public` | `user` | `admin`; user/admin pages are guarded).
Load scripts in this order: `app.js`, `auth.js`, `layout.js`, then the page script.
After the layout mounts, a `cf:ready` event fires with `{ detail: { user } }` — page scripts start from that.

## Prototype notes
- Passwords are hashed with a simple non-cryptographic function. This is fine for a demo, **not** for production; a real backend should use bcrypt/argon2.
- localStorage is per-browser: data entered on one device is not visible on another.
- localStorage holds about 5 MB in total, which is roughly 15–20 reports with photos. Reports without photos use almost nothing.
- Campus location names in `app.js` (`DEFAULT_LOCATIONS`) are placeholders — replace with the real URS Binangonan buildings.
- The demo-accounts box on `login.html` should be removed before the final demo.
