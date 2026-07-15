## Objective
- Enhance Survey360 (360° survey service: .NET backend + React frontend). Most recent work: make the sidebar a responsive, working open/close + collapse/expand control at all screen sizes.

## Important Details
- Project root `C:\Project`; branch `nikitaMobile`; `WebApp/` .NET API on `:5175`, `frontend/` React+Vite on `:5173` (user's dev server) — backend auto-applies EF Core migrations on startup (SQLite `WebApp/survey.db`).
- **DB must NOT be changed** — `dotnet ef database update` confirmed "already up to date".
- **Do NOT start the backend (`dotnet run`) without explicit user request.** (User runs it; port 5175 held by PID 8244.)
- `npm run build` needs `NODE_OPTIONS=--max-old-space-size=4096` (box low on RAM; bare `tsc -b` OOM-crashes). Build itself passes (exit 0).
- Git: remote is `origin` (not `original`). Remote has duplicate case-only branches `Romchik`/`romchik` (Windows can't store both) → bare `git fetch` fails; use `git fetch origin main` / `git pull origin main`.
- **CRITICAL — real app entry:** `frontend/src/main.tsx` mounts `<UserApp />` from `src/pages/UserApp.tsx`. The default export `App` in `src/App.tsx` is **ORPHANED / NOT USED**. Always edit `UserApp.tsx` (and `Sidebar.tsx`), never `App.tsx`, for the live UI.
- Auth is cookie-based (login by email). Dev admin login: `POST /api/auth/admin-login {email:"Admin"}` auto-creates `admin@survey360.local`. `/api/auth/me` returns 401 when unauthenticated → app shows `LoginPage` (no sidebar in DOM). Vite proxies `/api` to backend `:5175`.
- Headless verification is possible: system Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` + `playwright-core` (installed temporarily, then removed). Login via `/api/auth/admin-login`, then inspect DOM / click.
- Matrix semantics: **Объект (target) = column**, **Респондент (respondent) = row**.

## Work State
### Completed
- **Migration/entity reconciliation (DB untouched)**: restored 3 migrations from `ae7e495` + snapshot; deleted dead `Models/SurveyRespondentLink.cs`; synced context/service/controllers; verified model == DB via empty `_VerifyClean` migration (removed). `_FinalCheck`/`_VerifyClean` deleted.
- **Merge `main` → `nikitaMobile`**: resolved `Romchik` stale ref + case conflict; pulled `origin/main` (`b7e3820`); resolved `MainPage.tsx` conflict. Committed `3a4e2ce демо адаптив` + merge `cdefce8`. Branch 2 ahead / 0 behind.
- **Runtime LINQ fix**: `WebApp/Services/SurveyRespondentLinkService.cs:68` `GetLinksAsync` — replaced untranslatable `.OrderBy(x => new RespondentLinkDto(...).ReviewerName)` with order by `User.Name` then project after `ToListAsync`.
- **Responsive sidebar — ROOT-CAUSE FOUND & FIXED**: The bug "X button not clickable / sidebar doesn't collapse-expand" was because edits were made to the **orphaned `src/App.tsx`**; the live `UserApp.tsx` rendered `<Sidebar>` **without** `isMobile`/`mobileOpen`/`onCloseMobile`, so `isMobile` defaulted to `false` (static `w-80` desktop sidebar) and the X button (repointed to `onCloseMobile`) had an **undefined handler → dead button**.
  - Fix in `frontend/src/pages/UserApp.tsx`: import `useIsMobile`; add `mobileNavOpen` state; render floating FAB (`fixed top-3 left-3 z-50`, gamburger) shown only `isMobile && !mobileNavOpen` (opens drawer); pass `isMobile`/`mobileOpen`/`onCloseMobile` to `Sidebar`.
  - Fix in `frontend/src/components/Sidebar.tsx`: X button now **always visible** (`inline-flex`) and branches — `onClick={isMobile ? onCloseMobile : onToggleCollapsed}`; icon/aria switch between close (mobile drawer), collapse (desktop expanded), expand (desktop collapsed).
  - **Verified headlessly (system Chrome + playwright-core)**: at 400px FAB opens drawer → X "Закрыть" closes it (FAB returns); at 1280px X "Скрыть" collapses sidebar to `w-20` (icons) → click again expands to `w-80`. Zero console/page errors. `npm run build` passes.
- Cleaned up: removed debug `data-*` attributes from `Sidebar`, removed temp test scripts, uninstalled `playwright-core`, removed stray empty/artifact dirs.

### Active
- **User must restart their frontend dev server** (`npm run dev` on `:5173`, PID 9412) to clear Vite's in-memory transform cache and pick up the `UserApp.tsx`/`Sidebar.tsx` fixes. Without restart they may still see stale behavior. (Their server was running before the edits.)

### Blocked
- (none)

## Next Move
1. Ask the user to **hard-reload after restarting the frontend dev server** (Ctrl+Shift+R) and confirm: at narrow widths the FAB opens the panel and the X/overlay closes it; at wide widths the X collapses/expands the sidebar.
2. Optional cleanup later: delete orphaned `src/App.tsx` (unused default export) to avoid future confusion. Confirm with user before deleting.

## Relevant Files
- `C:\Project\frontend\src\pages\UserApp.tsx` — **the REAL app entry**; now wires `isMobile`/`mobileOpen`/`onCloseMobile`, renders the FAB. (This was the missing piece.)
- `C:\Project\frontend\src\components\Sidebar.tsx` — X button branches mobile-close vs desktop-collapse; always visible.
- `C:\Project\frontend\src\main.tsx` — mounts `UserApp`, NOT `App`.
- `C:\Project\frontend\src\App.tsx` — ORPHANED default export (my earlier dead edits live here); not mounted.
- `C:\Project\frontend\src\hooks\useMediaQuery.ts` — `useIsMobile()` (`max-width: 767px`), correct/reliable.
- `C:\Project\WebApp\Services\SurveyRespondentLinkService.cs` — `GetLinksAsync` fixed.
- `C:\Project\WebApp/survey.db` — NOT modified.
