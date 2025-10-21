🧭 architecture_revision_spec.md
F/Design Solutions — Administrative Analytics Dashboard (v2.0)
📍 Context

The current F/Design Solutions Administrative Dashboard has a strong structural base, but its logic and data flows remain isolated.
While the data exists, it lacks analytical relationships — there’s no horizontal connection between users, budgets, and sales.

The goal is to evolve this dashboard into an internal intelligence system:
a real-time analytical environment capable of evaluating productivity, profitability, and operational performance.

Each module — Users, Budgets, Sales — must become interconnected, sharing data to create measurable insight and business awareness.

🎯 Revision Objective

Transform the current static dashboard into a data-driven analytical platform for internal performance monitoring.
The upgrade must:

Interlink Users, Budgets, and Sales in both logic and data.

Introduce dynamic, context-aware metrics.

Redesign the interface to support fast visual analysis and interactive drill-downs.

Fix all structural issues (date formatting, wrong sheet references, inconsistent context).

Lay the foundation for future external integrations (e.g., Google Data Studio, Power BI).

🧩 Analytical Structure Overview
🔹 1. USERS — Productivity & Operational Performance

Each user (employee) should evolve from a static record into an active analytical entity — representing both behavioral and economic efficiency.

a) Core Data

ID, Name, Role, Status, Contract Type.

Commission % (either default or dynamic per sale).

b) Direct Metrics (from ORÇAMENTOS and Client_List)
Category	Metric	Source
Communication	Messages sent	ORÇAMENTOS!MSG_ENVIADAS
Communication	Calls made	ORÇAMENTOS!LIGACOES_FEITAS
Effectiveness	Positive responses	ORÇAMENTOS!RESP_POS
Effectiveness	Negative responses	ORÇAMENTOS!RESP_NEG
Conversion	Total budgets created	ORÇAMENTOS
Conversion	Total converted (Closed)	ORÇAMENTOS!STATUS="Fechado"
Conversion	Conversion rate (%)	Calculated
Financial	Average sale value	Client_List
Financial	Profitability per hour	Derived calculation
Financial	Total revenue generated	Sales total
Financial	Total commission	Calculated by sales
c) Derived Metrics (cross-computed)

Operational Engagement Index (OEI)

(Messages + Calls) / Total Budgets


Conversion Efficiency (CE)

(Closed Deals / Total Budgets) * 100


Hourly Profitability (HP)

(Total Sales Value - Commissions) / Total Hours Worked


Positive Response Rate (PRR)

(Positive Responses / (Positive + Negative)) * 100


Net Economic Performance (NEP)

Total Revenue – Direct Costs (commissions + idle time)


These metrics must be auto-calculated and visible per user and aggregated globally.

d) Visual Structure

Main table with summary row and expandable detail (“accordion”).

On click, open a detail card with:

Colored indicators (green → yellow → burgundy).

Optional mini-chart (bar or radial).

Action buttons:

✏️ Edit

❌ Remove

⛔ Deactivate

Top-level button: ➕ Add New Employee

🔹 2. BUDGETS — Pipeline & Conversion Analytics

The ORÇAMENTOS sheet is the system’s analytical backbone.
Each entry represents a live customer interaction tied to a salesperson.

a) Row Data
Field	Description
Date	Creation date
Type	Old / New / Walk-in
Company	Linked company name
Client	Customer name
Salesperson	Responsible user
Product	Brief description
Value	Estimated price
Commission	Calculated
Status	Open / Closed / Lost
b) Expanded View (Accordion)

When clicked, expand to display:

Full creation date

Days since creation (with auto-color logic:

Green ≤ 7 days

Yellow ≤ 15 days

Burgundy > 15 days)

Source type: Old / New / Walk-in

Assigned salesperson (or “Unassigned” if online lead)

Client details: name, email, phone

Product description

Estimated value and commission

Last contact date

Communication history:

Messages sent

Calls made

Positive / negative responses

Lost reason (if applicable)

Internal notes / observations

c) Analytical Logic

Status coloring & recency awareness

Visually flag inactive or outdated budgets.

User correlation

Every budget contributes to the Users productivity panel.

Pipeline control (future)

Allow for visual funnel stages (Open → Negotiation → Closed / Lost).

🔹 3. SALES — Transaction History & Profitability Analysis
a) Row Data
Field	Description
Date	Sale date
Type	Old / New / Walk-in
Company	Client company
Client	Customer name
Salesperson	Responsible user
Product	Item or service sold
Value	Total sale amount
Commission	Paid commission
b) Expanded View

Time elapsed between initial budget and final sale.

Value per hour (net profit ÷ total time).

Number of contact attempts before conversion.

Positive response ratio.

Comparison with team averages.

c) Auto-Insights

The system should generate:

Average conversion time.

Average profitability per salesperson.

Correlation between contact frequency and sale success.

Alerts for under- or over-performing users.

🔍 Inter-Module Relationships
Source	Target	Relationship Type
ORÇAMENTOS	USERS	Productivity (messages, calls, conversion)
CLIENT_LIST	USERS	Revenue, profitability, commission
USERS	SALES	Conversion rate, average closing time
ORÇAMENTOS + SALES	REPORTS	Global KPIs (sales totals, commissions, avg performance)

Any update in ORÇAMENTOS or CLIENT_LIST must automatically reflect in Users and Sales, creating a feedback loop.

🎨 Visual Guidelines

Clean, modern, and light UI.

Each expandable row opens a clearly defined card box with a subtle shadow.

Visual indicators:

Green (good), Yellow (warning), Burgundy (critical).

Minimal icons and clear typography.

Fonts: Inter, Roboto, or similar.

Layout responsive to Google Sheets sidebar app size.

Color palette:

Deep Blue: #2b5797

Gold: #fbbc04

Light Gray: #f7f8fa

⚙️ Technical Directives

Backend (Apps Script) must use in-memory batch calculations to minimize loops.

Frontend (HTML/JS) should render through google.script.run.obterDadosAdmin().

Accordion behavior: each <tr> expands a .details-row with smooth transition.

Date formatting: use Utilities.formatDate.

Currency format: $ with two decimals.

Keep strict separation between raw data and derived analytics.

🧠 Agent Responsibilities (Blackbox)

Analyze the entire current codebase (backend + frontend).

Identify logical inconsistencies or redundancies.

Architect and implement cross-data relationships as defined above.

Build derived metrics and KPIs for users and operations.

Refactor HTML to include the new expandable structure and clean visual layout.

Optimize backend computation — fewer redundant reads/writes.

Ensure total integrity between:

Código.gs

painelAdmin.html

style.css

📈 Expected Outcomes

After execution:

All dates display correctly formatted.

Budgets are fetched from the correct sheet (ORÇAMENTOS).

Each user has complete productivity and profitability analytics.

The Budgets and Sales modules display expandable, detailed records.

The interface is modern, consistent, and visually balanced.

Backend and frontend remain fully synchronized.

The system becomes ready for higher-level BI integration.

🧾 Final Instruction to the Agent

“Analyze the current project holistically and process the necessary technical decisions to implement the interconnected analytical ecosystem described in this document.
Refactor and unify backend and frontend code to achieve full analytical linkage, with metrics and visuals emerging organically from the described dependencies — without scope limitation or surface-level simplification.”