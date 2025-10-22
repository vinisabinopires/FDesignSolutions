# Changelog

## v5.0.0 — Cortex audit

### Added
- Introduced a modular Apps Script backend split into `core.gs`, `usuarios.gs`, `vendas.gs`, `orcamentos.gs`, `dashboard.gs`, and `ui.gs` to simplify maintenance and auditing.
- Implemented a consistent error handling pipeline with `registerGlobalError`, audit logging helpers, and session-aware utilities.
- Created a responsive, English-first interface across all HTML front-ends with unified styling, improved accessibility, and contextual feedback.
- Added structured documentation in the codebase and new operational guides (`AUDIT_REPORT.md`).

### Changed
- Replaced the legacy monolithic `Código.js` with focused modules covering authentication, sales, quotes, dashboards, and UI orchestration.
- Refreshed the login, dashboard, sales, quotes, management, and admin experiences with glassmorphism-inspired layouts, success/failure handlers, and session-aware flows.
- Normalised commission calculations, ID generation, range updates, and sheet mappings to ensure correct persistence within `Client_List` and `ORÇAMENTOS`.
- Centralised session handling (login, logout, renew) and permission checks used by all panels.

### Removed
- Removed the deprecated `Código.js` legacy file and unused UI flows in favour of the streamlined architecture.
