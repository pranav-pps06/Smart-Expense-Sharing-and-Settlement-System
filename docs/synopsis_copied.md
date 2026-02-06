RV College of Engineering®, Bengaluru – 59
Department of Computer Science and Engineering
DATABASE MANAGEMENT SYSTEMS (CD252IA)
Synopsis
TITLE:       <PROJECT TITLE HERE>

TEAM
USN:
Name
<USN_1>
<Name_1>
<USN_2>
<Name_2>
<USN_3>
<Name_3>

<PROJECT TITLE HERE>

1. Introduction
Provide a concise overview of the problem your project solves, its target users, and why it matters. Mention the core functionality at a high level (e.g., what users can do) without deep technical detail.

2. Existing System
Briefly describe current/manual approaches users follow for this problem and their limitations (errors, time, visibility, collaboration, auditability, scalability, etc.). Highlight why a structured DBMS-backed solution helps.

3. Proposed System
Summarize your solution as clear bullet points tailored to your project. For example:
- Core features: What users can perform in the system (create/read/update/delete domain entities).
- Data workflows: How records flow through the system.
- Access and authentication: Login/signup, authorization model (roles/permissions), if applicable.
- Notifications/reports: Any alerts, dashboards, or analytics.
- Constraints/Non-goals: Scope boundaries for this version.

4. Relational Database Structure
Describe the main entities and relationships in terms of tables and foreign keys derived from your ER diagram. Example structure (replace with your own tables):
- <TABLE_A>: (id, ...)
- <TABLE_B>: (id, <table_a_id>, ...)
- <TABLE_C>: (id, ...)
Notes:
- Specify key constraints (PRIMARY KEY, UNIQUE), foreign keys, and important indexes.
- Mention any deterministic rules for amounts/aggregations if relevant.

5. RDBMS and NoSQL Integration (if applicable)
If your project uses only a relational database, note that here and skip. If you also use a document/event store, specify what data goes where and why. Example split:
- RDBMS (e.g., MySQL/PostgreSQL): Canonical transactional entities.
- NoSQL (e.g., MongoDB): Logs, notifications, cached aggregates, or unstructured documents.
Include how you keep these in sync (events, handlers, scheduled jobs) if relevant.

6. Societal Concern
Explain how your system benefits users or society (transparency, safety, accessibility, efficiency, cost-saving, trust, etc.). Keep this specific to your domain.

7. System Analysis

(Intentionally left blank as requested.)

8. ER Diagram
Embed or reference the ER diagram stored in this workspace. If your file name differs, update the link.

![ER Diagram](WhatsApp%20Image%202025-12-22%20at%2010.07.15.jpeg)
