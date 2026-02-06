RV College of Engineering®, Bengaluru – 59
Department of Computer Science and Engineering
DATABASE MANAGEMENT SYSTEMS (CD252IA)
Synopsis
TITLE:       Smart Expense Sharing and Tracking System
TEAM
USN:
Name
1RV23CS157
Nischal R E
1RV23CS156
Niranjan R N
1RV23CS175
Pranav P Sanjee

Smart Expense Sharing and Tracking System

1. Introduction
The Smart Expense Sharing and Management System is a web-based application that simplifies tracking and splitting shared expenses in groups. Users can create groups, add expenses, automatically divide amounts equally among participants, and view a transparent activity history. The system provides user authentication via email OTP and JWT, real-time updates using Socket.IO, and an intuitive dashboard for managing groups, expenses, and recent activities.

2. Existing System
Shared expenses are commonly tracked using manual methods such as spreadsheets, notes, or chat messages. These approaches are prone to errors, duplication, and poor visibility. While existing apps help, users still spend time entering details and coordinating, and auditability across multiple transactions can be challenging without a structured, consistent system.

3. Proposed System
The proposed system provides:
- Group management: Create groups and add members by email lookup.
- Expense entry: Add expenses with equal split among selected members; view detailed splits per expense.
- Basic natural-language text parsing: A prototype endpoint that extracts amount, description, and participant hints from typed text (e.g., “Paid 500 for dinner with user-12 and me”).
- Real-time updates: Socket.IO broadcasts for new groups and expenses to relevant users.
- Activity and notifications: Persisted activity logs and user notifications for key events.
- Authentication and security: Email OTP-based signup, password login, and cookie-based JWT sessions.
- Hybrid storage: MySQL for core transactional data; MongoDB for activity logs, notifications, and cached settlements.

Note: Voice speech-to-text, OCR-based receipt extraction, mobile client, and advanced NLP splitting rules are not implemented at this stage.

4. Relational Database Structure
The relational database (MySQL) stores structured data for users, groups, expenses, and splits:
- Users: `users (id, name, email, password_hash)`
- Groups: `groups_made (id, name, created_by)`
- Group Members: `group_members (group_id, user_id)`
- Expenses: `expenses (id, group_id, paid_by, amount, description)`
- Expense Splits: `expense_splits (expense_id, user_id, owed_amount)`

Balances between members are computed on demand from expenses and splits and cached (see NoSQL), rather than maintained in a separate Balance table.

5. RDBMS and NoSQL Integration
The project integrates:
- RDBMS (MySQL): Core transactional entities (users, groups, expenses, splits) with ACID properties.
- NoSQL (MongoDB): Unstructured and event-oriented data including:
  - Activity logs (who did what, when, and context)
  - Notifications (per-user messages about new groups or expenses)
  - Realtime snapshots and cached settlements (computed payables/receivables per group)

Synchronization is achieved via an internal event bus. When domain events occur (e.g., group created, expense added), handlers persist activity/notifications to MongoDB, emit realtime events via Socket.IO, and recompute cached settlements.

6. Societal Concern
Poorly tracked shared expenses often cause misunderstandings and strain relationships. This system promotes transparency and accountability with clear group membership, itemized splits, recent activity visibility, and consistent data handling. It leverages modern web technologies to reduce friction and foster trust among participants.

Recent technological elements in this project include:
- RESTful APIs: For clean separation between frontend and backend and reliable data exchange
- WebSockets (Socket.IO): For real-time updates to group members
- Hybrid SQL + NoSQL: Transactional integrity with flexible, event-focused storage
- JWT + OTP: Practical, secure user authentication and session management
