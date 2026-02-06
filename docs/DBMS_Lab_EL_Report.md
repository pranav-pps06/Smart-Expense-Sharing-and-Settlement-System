RV College of Engineering®, Bengaluru – 59
Department of Computer Science and Engineering
DATABASE MANAGEMENT SYSTEMS (CD252IA)

Smart Expense Sharing and Tracking System

Report (DBMS Lab EL Format)

Team
- USN: 1RV23CS157 — Name: Nischal R E
- USN: 1RV23CS156 — Name: Niranjan R N
- USN: 1RV23CS175 — Name: Pranav P Sanjee

Guide: <Faculty Name>
Semester: 3rd/5th (update accordingly)
Academic Year: 2025–26

---

Table of Contents
- 1. Certificate
- 2. Acknowledgement
- 3. Abstract
- 4. List of Figures
- 5. List of Tables
- 6. Introduction
- 7. Objectives
- 8. Scope
- 9. Existing System
- 10. Proposed System
- 11. Requirements
- 12. Database Design
- 13. System Analysis
- 14. Implementation
- 15. Testing
- 16. Results
- 17. Conclusion and Future Work
- 18. References
- 19. Appendix

---

1. Certificate
This is to certify that the report titled “Smart Expense Sharing and Tracking System” has been carried out by the above team as part of the Database Management Systems Laboratory, Department of Computer Science and Engineering, RV College of Engineering®, Bengaluru – 59, during the academic year 2025–26 under my guidance.

Signature of Guide: _________________________   Date: __________
Signature of HOD:   _________________________   Date: __________

---

2. Acknowledgement
We would like to express our sincere gratitude to our guide, the Department of Computer Science and Engineering, and RV College of Engineering® for their continuous support and guidance throughout the execution of this project. We also thank our peers for constructive feedback during development and testing.

---

3. Abstract
This project presents a web-based system that streamlines the recording and settlement of shared expenses among groups. Users can create groups, add expenses, and automatically compute equal splits. The system offers authentication (email OTP + password), real-time updates via WebSockets, and an audit trail of activities and notifications to improve transparency and accountability. A hybrid data approach is followed with MySQL for transactional entities and MongoDB for event-oriented data such as logs and cached settlements.

---

4. List of Figures
- Figure 1: ER Diagram

5. List of Tables
- Table 1: Users
- Table 2: Groups
- Table 3: Group Members
- Table 4: Expenses
- Table 5: Expense Splits

---

6. Introduction
Shared expenses arise frequently in daily life—roommates, trips, clubs, and teams. Manual tracking (spreadsheets, chats) leads to inconsistency and poor visibility. Our system provides a structured, secure, and collaborative way to capture expenses, split amounts, and view balances. The solution comprises a React frontend, an Express backend, MySQL for core transactional data, and MongoDB for activity logs and notifications.

---

7. Objectives
- Provide a frictionless way to add expenses and split equally among participants.
- Maintain transparent activity logs and per-user notifications.
- Ensure secure authentication and protected APIs using JWT cookies and email OTP verification.
- Deliver near real-time UI updates for group members when data changes.
- Support a clean schema design that enables accurate balance computation.

---

8. Scope
- In-scope: Web application (desktop-first), equal splits, activity logs, notifications, real-time updates, basic text parsing of expense strings.
- Out-of-scope (current phase): Voice input, OCR receipt parsing, mobile app, advanced NLP for complex splitting rules.

---

9. Existing System
Users typically track shared expenses through informal means (notes, chats, spreadsheets), which are susceptible to arithmetic errors, duplication, and missing context. Existing apps mitigate this but can still require manual reconciliation and lack a clear, auditable trail of changes across multiple users.

---

10. Proposed System
- Group management: Create groups and add members by verified email.
- Expense entry and equal split: Add an expense, select participants, compute equal shares deterministically.
- Activity and notifications: Persist who did what and inform relevant users.
- Real-time collaboration: Use Socket.IO to broadcast new groups and expenses.
- Authentication and sessions: OTP-based signup and cookie-based JWT login.
- Hybrid storage: MySQL for canonical entities; MongoDB for activity/notifications and cached settlements.

---

11. Requirements
- Hardware: Development laptop/desktop; recommended 8 GB+ RAM, multi-core CPU.
- Software:
  - Frontend: React, Vite, TailwindCSS.
  - Backend: Node.js (Express), Socket.IO.
  - Database: MySQL (transactional), MongoDB (logs and caches).
  - Utilities: dotenv, bcryptjs, jsonwebtoken, cookie-parser, validator.

---

12. Database Design
12.1 ER Diagram

![Figure 1: ER Diagram](WhatsApp%20Image%202025-12-22%20at%2010.07.15.jpeg)

12.2 Relational Schema
- Users: users(id, name, email, password_hash)
- Groups: groups_made(id, name, created_by)
- Group Members: group_members(group_id, user_id)
- Expenses: expenses(id, group_id, paid_by, amount, description)
- Expense Splits: expense_splits(expense_id, user_id, owed_amount)

Design Notes:
- Foreign keys: group_members.group_id → groups_made.id; group_members.user_id → users.id; expenses.group_id → groups_made.id; expense_splits.expense_id → expenses.id; expense_splits.user_id → users.id.
- Amounts are numeric(10,2) with consistent rounding rules to avoid accumulated drift.
- Net balances are computed from expenses and splits; optionally cached in MongoDB to speed up queries.

---

13. System Analysis


---

14. Implementation
14.1 Backend Modules (Express)
- Authentication: Signup (email OTP), login, JWT cookie sessions, protected routes.
- Group & Member APIs: Create group, add members, list groups, list members.
- Expense APIs: Create expense, list expenses, compute equal split server-side.
- Activity/Notification: Event handlers writing to MongoDB collections and emitting WebSocket updates.

14.2 Frontend (React)
- Authentication pages: Signup, Login with OTP verification flow.
- Dashboard: Groups list, create group, view members and recent activity.
- Group chat panel: Add expenses, view splits, observe live updates.

14.3 Security
- Password hashing with bcrypt.
- JWT in httpOnly cookies; CSRF mitigations on state-changing endpoints.
- Input validation and rate-limiting (optional) on auth endpoints.

---

15. Testing
- Unit tests (where applicable) for utility functions and parsers.
- API testing via Postman/REST Client for authentication, groups, and expenses.
- Integration smoke tests ensuring activity/notification flows do not regress.

---

16. Results
- Users can create groups, add expenses, and view computed equal splits.
- Real-time updates notify participants immediately of new expenses.
- Activity logs and notifications improve transparency and traceability.

---

17. Conclusion and Future Work
The system demonstrates a practical approach to multi-user expense sharing with an auditable history and near real-time collaboration. Future work includes OCR-based receipt parsing, mobile clients, and advanced NLP for natural language expense extraction and non-equal splits.

---

18. References
- MySQL 8.0 Reference Manual
- MongoDB Documentation
- JWT Best Practices (Auth0/OWASP)
- Socket.IO Documentation
- React and Vite Documentation

---

19. Appendix
19.1 Sample SQL DDL (MySQL)
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE groups_made (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  created_by BIGINT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE group_members (
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups_made(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE expenses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  paid_by BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(300),
  FOREIGN KEY (group_id) REFERENCES groups_made(id),
  FOREIGN KEY (paid_by) REFERENCES users(id)
);

CREATE TABLE expense_splits (
  expense_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  owed_amount DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (expense_id, user_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

19.2 Key API Endpoints (Illustrative)
- POST /api/auth/signup-otp
- POST /api/auth/login
- GET  /api/groups
- POST /api/groups
- POST /api/groups/:id/members
- GET  /api/groups/:id/expenses
- POST /api/groups/:id/expenses

End of Report
