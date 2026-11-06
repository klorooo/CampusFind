# CampusFind — Day 1–4 build

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

## What works on Day 3
- **Search** (`search.html`, public): keyword search across name, description, category, place, colour, brand and reference number; filters for type, category, place and date range; "include claimed & returned"; sort by newest, oldest or best match; "Show more" paging. Filters are kept in the URL, so a search can be bookmarked or shared (`search.html?q=wallet&type=found`).
- Search understands plurals, partial words and common variants, including a few everyday Filipino terms: "cellphone" finds "iPhone", "payong" finds umbrellas, "susi" finds keys, "pitaka" finds wallets.
- **Match engine** (`js/search-match.js`): scores a lost report against a found report from 0–100 using category (35), name (18), shared details (12), place (15), date (10), colour (±) and brand (±). Suggestions start at 40 and are labelled Possible / Good / Strong. Each suggestion lists its reasons ("Same place (Canteen)", "Found 1 day after it was lost", …).
- **Possible matches panel** on the item details page (only the person who filed the report sees it), a **match pill** on My Reports cards, a "Possible matches for your reports" strip on the search page, and a match count in the banner right after submitting a report.
- Matching only uses public fields. The private identifying marks never affect the score and are never shown in search results or match panels.
- Suggestions are saved (`cf_matches`) so the admin Matches page on Day 5 can confirm or dismiss them.
- The home page has a search box, and logging in from a protected link now returns you to that exact page.
- Fixed: elements with the `hidden` attribute (for example "Show more") were still showing because of a CSS rule.

## What works on Day 4
- **Claim form** (`claim-form.html?item=FND-0001`): the claimant describes the item in their own words, answers "what's inside / what marks it as yours", gives when and where they lost it, optionally attaches up to 2 photos, and ticks a declaration. If they have an open lost report, the best-matching one is linked automatically and the date and place are pre-filled. The finder's private marks are never shown to the claimant.
- **Rules**: you can't claim your own found item, lost reports, or items already claimed; one active claim per item per person; at most 3 claims per person per item; the lost date can't be after the found date.
- **Claim details** (`claim-details.html?id=…`, claimant only): 4-step progress tracker, a panel that changes with the status, the proof submitted, an activity timeline, and Cancel. **More info needed** shows the admin's question and a reply form (text + optional photo).
- **My Claims**: All / Active / Closed tabs, a mini tracker on each card, and claims that need a reply are listed first with "Reply now".
- **Statuses**: Pending review → More info needed ⇄ Pending → Approved → Returned, or Rejected / Cancelled. Approving closes the item as "Claimed", confirms the stored match, marks the linked lost report claimed, and automatically rejects any competing claims. A finder can't withdraw a found item that has a claim under review.
- **Notifications** (`notifications.html` + bell in the header, with an unread dot on the phone menu button): claim submitted, more info requested, reply sent, approved, rejected, returned, and **new possible match** alerts sent to the owner of the other report when a report is filed. Mark one or all as read. Admins don't get notifications; they use the dashboard queue.
- **Admin quick review** (`admin/dashboard.html`): a "Claims to review" queue showing the claimant's proof next to the finder's private marks, with Approve / Ask for info / Reject / Mark as returned. This is a stopgap that Day 5's Claims & Verification screens will replace.
- Fixed: notifications created in the same millisecond could appear in the wrong order; seeded found items now have a "kept at" location.

## File map
```
index.html  login.html  register.html
report-lost.html  report-found.html  my-reports.html  item-details.html
search.html                                                          (Day 3)
my-claims.html  claim-form.html  claim-details.html  notifications.html   (Day 4)
profile.html                                                         (placeholder)
admin/dashboard.html                                                (working)
admin/lost-reports  found-reports  matches  claims  verify-claim
      returned-items  users  .html                                  (placeholders)
css/styles.css
js/app.js  auth.js  layout.js  home.js  login.js  register.js  admin-dashboard.js
js/reports.js  report-form.js  my-reports.js  item-details.js        (Day 2)
js/search-match.js  search.js                                        (Day 3)
js/claims.js  claim-form.js  claim-details.js  my-claims.js  notifications.js  (Day 4)
assets/uploads/
```

## Page contract
Every page sets three attributes on `<body>`:
`data-root` (relative path to the site root), `data-page` (menu key to highlight), `data-area` (`public` | `user` | `admin`; user/admin pages are guarded).
Load scripts in this order: `app.js`, `auth.js`, `reports.js`, `search-match.js`, `claims.js` (only the ones the page needs), `layout.js`, then the page script.
After the layout mounts, a `cf:ready` event fires with `{ detail: { user } }` — page scripts start from that.

## Prototype notes
- Claim evidence photos are compressed harder than report photos (max 800px) to save localStorage space. If storage fills up, the claim is not saved and the user sees a clear message.
- Passwords are hashed with a simple non-cryptographic function. This is fine for a demo, **not** for production; a real backend should use bcrypt/argon2.
- localStorage is per-browser: data entered on one device is not visible on another.
- localStorage holds about 5 MB in total, which is roughly 15–20 reports with photos. Reports without photos use almost nothing.
- Campus location names in `app.js` (`DEFAULT_LOCATIONS`) are placeholders — replace with the real URS Binangonan buildings. If you rename them, update the "nearby places" groups in `search-match.js` (`NEARBY_LOCATIONS`) to match.
- Match scoring weights live at the top of `score()` in `search-match.js`; change them there if the suggestions feel too strict or too loose (`THRESHOLD` is the minimum score shown).
- The demo-accounts box on `login.html` should be removed before the final demo.
