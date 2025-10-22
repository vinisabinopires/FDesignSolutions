# F/Design Solutions — Sales & Quotes Workspace

This repository contains the Apps Script implementation of the F/Design Solutions internal workspace. It provides authentication, sales registration, quotes tracking, and managerial dashboards integrated with Google Sheets.

## Project structure
```
FDesignSolutions/
├── appsscript.json          # Apps Script manifest (V8 runtime)
├── core.gs                  # Shared constants, helpers, audit logger
├── usuarios.gs              # Authentication, sessions, permissions
├── vendas.gs                # Sales persistence and actions
├── orcamentos.gs            # Quotes persistence and conversion logic
├── dashboard.gs             # Analytical aggregations and config reader
├── ui.gs                    # HtmlService modal loaders & navigation helpers
├── loginSistema.html        # Sign-in modal
├── homeFDesign.html         # Seller landing dashboard
├── formVendas.html          # Register sale form
├── dashboardVendas.html     # Sales management console
├── orcamentosDashboard.html # Quotes pipeline
├── formGerenciar.html       # Admin sale editor
├── painelAdmin.html         # Admin control center
├── CHANGELOG.md             # Release notes
└── AUDIT_REPORT.md          # Detailed audit summary
```

## Requirements
- Google Workspace account with access to Google Sheets
- Node.js ≥ 16 (for clasp tooling)
- `@google/clasp` installed (`npm install -g @google/clasp`)

## Setup & deployment
1. **Authenticate clasp**
   ```bash
   npm install
   npx clasp login
   ```
2. **Link to your Apps Script project**
   - Update `.clasp.json` with your `scriptId` (create one with `npx clasp create --type sheets` if needed).
3. **Push the code**
   ```bash
   npx clasp push
   ```
4. **Prepare the spreadsheet**
   Create/confirm the following tabs in the bound Google Sheet:
   - `USUARIOS`
   - `Client_List`
   - `ORÇAMENTOS`
   - `CONFIG`
   - Optional: `AUDITORIA`
   Columns are detected automatically; missing commission/status columns will be generated at runtime.
5. **Launch the workspace**
   - Open the bound sheet and use the custom menu `📘 F/Design Solutions → 🔐 Abrir Sistema`.

## Runtime overview
- **Sessions**: Stored in cache + user properties with 1-hour TTL. `usuarios.gs` exposes `loginManual`, `loginAutomatico`, `encerrarSessao`, and permission helpers.
- **Sales** (`vendas.gs`): Handles registration, search, updates, payments, and contact logging. IDs are generated (`VEN-YYYYMMDDHHMMSS`), commissions computed from sale type.
- **Quotes** (`orcamentos.gs`): Mirrors sales helpers, including conversion into sales and shared contact logging.
- **Analytics** (`dashboard.gs`): Aggregates totals, conversion rate, and per-user metrics for dashboards.
- **UI** (`ui.gs` + HTML): All dialogs use HtmlService, rely exclusively on `google.script.run`, and provide success/failure handlers for every critical action.

## Testing tips
- Use the Apps Script editor execution log to monitor `writeAudit` entries and `registerGlobalError` output.
- Confirm data persistence by registering a sale/quote and verifying the corresponding row in `Client_List`/`ORÇAMENTOS` contains ID, timestamp, seller, commission and log entries.
- Run `npx clasp pull` before further edits to keep the local repository synchronised.

For a detailed audit trail and improvement roadmap see [`AUDIT_REPORT.md`](AUDIT_REPORT.md).
