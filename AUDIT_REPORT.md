# F/Design Solutions — Cortex Audit Report (v5.0)

## 1. Summary
The legacy Apps Script project has been refactored into dedicated modules, unifying authentication, sales, quotes, and analytics. All front-end surfaces were redesigned in English with consistent glassmorphism styling, ensuring every `google.script.run` call includes dedicated success and failure handlers. Spreadsheet persistence now writes cleanly into `Client_List`, `ORÇAMENTOS`, and supporting tabs while logging audit events for every critical action.

## 2. Detected Issues & Resolutions
| ID | Issue | Impact | Resolution |
| --- | --- | --- | --- |
| SEC-01 | Session cache logic duplicated and prone to stale data | Inconsistent authentication and accidental privilege escalation | Centralised session helpers in `usuarios.gs` and persisted cache + properties with renewal support |
| UI-02 | Mixed-language UI with inconsistent actions and missing failure handlers | Confusing experience, risk of silent failures | Rebuilt HTML views in English with shared styling, added failure handlers and contextual toasts/messages |
| DATA-03 | Manual range indexes (e.g., sales sheet) risked misalignment and missing columns | Potential miswrites when sheet columns changed | Created header-aware writers/readers in `core.gs` and modules to auto-map or create missing columns |
| FUNC-04 | `google.script.run` actions missing `retornarAoMenuPrincipal` implementation | Forms could not close safely | Added `ui.gs` with modal orchestration and safe return behaviour |
| ANALYTICS-05 | Admin dashboard relied on heavy inline logic and lacked conversion KPIs | Hard to inspect metrics and error prone | Moved analytics to `dashboard.gs` with explicit reports and per-user metrics |

## 3. Optimization Opportunities
- **Automation**: Introduce scheduled triggers to snapshot dashboard metrics in `DASHBOARD_DATA` for long-term analysis.
- **Validation**: Add input masks/validation for phone/email fields and enforce numeric ranges server-side using Apps Script `FormApp` or custom checks.
- **Notifications**: Wire in Gmail/Chat notifications for converted quotes or high-value sales using the modular `writeAudit` helper as trigger points.
- **Testing**: Add clasp-driven integration tests (e.g., `npm test`) leveraging the Apps Script Execution API for regression coverage.

## 4. Function Call Mapping
| HTML View | Apps Script Functions |
| --- | --- |
| `loginSistema.html` | `loginManual`, `loginAutomatico`, `iniciarSistemaFDesign`, `encerrarSessao` |
| `homeFDesign.html` | `obterDadosDashboard`, `obterPermissoesAtuais`, `abrirFormVendas`, `abrirDashboardVendas`, `abrirFormGerenciar`, `abrirPainelAdmin`, `encerrarSessao` |
| `formVendas.html` | `registrarVenda`, `retornarAoMenuPrincipal` |
| `dashboardVendas.html` | `buscarVendas`, `registrarTentativaContato`, `registrarPagamento`, `retornarAoMenuPrincipal` |
| `orcamentosDashboard.html` | `buscarOrcamentos`, `registrarTentativaContato`, `converterOrcamentoParaVenda`, `retornarAoMenuPrincipal` |
| `formGerenciar.html` | `buscarVenda`, `atualizarVenda`, `excluirVenda`, `retornarAoMenuPrincipal` |
| `painelAdmin.html` | `obterDadosAdmin`, `encerrarSessao` |

## 5. Module Dependency Graph
```
core.gs
 ├─ usuarios.gs (sessions, permissions)
 │   └─ ui.gs (modal orchestration)
 ├─ vendas.gs (sales persistence)
 │   └─ orcamentos.gs (contact delegation for quotes)
 └─ dashboard.gs (analytics, configuration)
```
All modules rely on `core.gs` utilities (sheet access, logging, IDs). UI modules call into the functional modules; no circular dependencies remain.

## 6. Deployment Notes
1. Install dependencies and authenticate clasp:
   ```bash
   npm install
   npx clasp login
   ```
2. Push the audited code to Apps Script:
   ```bash
   npx clasp push
   ```
3. For local verification, load the UI using the Apps Script web preview or run through Google Sheets custom menu `📘 F/Design Solutions → 🔐 Abrir Sistema`.
4. Ensure Sheets contain the expected tabs (`USUARIOS`, `Client_List`, `ORÇAMENTOS`, `CONFIG`, optional `AUDITORIA`). Missing columns are created automatically during runtime.

