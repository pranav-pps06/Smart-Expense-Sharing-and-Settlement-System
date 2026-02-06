# Test Execution Write-Up: SQL and NoSQL (Logging Only)

This document outlines how the system would generate and log SQL and MongoDB operations during typical flows. It does not perform real execution; it specifies representative queries/commands and the expected log entries.

## Objectives
- Verify that backend generates correct SQL and MongoDB operations for common scenarios.
- Confirm logging includes actionable metadata (timestamp, user, group, operation, status, duration, row/doc counts).
- Ensure error cases are captured with clear messages and correlation IDs.

## Logging Format (examples)
- SQL: `[2026-01-05T10:02:31.145Z] INFO api:expense.create op=sql tx=begin cid=abc123 user=175 group=42`
- SQL: `[2026-01-05T10:02:31.230Z] INFO db:mysql op=sql cid=abc123 stmt=INSERT table=EXPENSES affected=1 duration_ms=52`
- SQL: `[2026-01-05T10:02:31.315Z] INFO db:mysql op=sql cid=abc123 stmt=INSERT table=EXPENSE_SPLITS affected=3 duration_ms=44`
- SQL: `[2026-01-05T10:02:31.322Z] INFO api:expense.create op=sql tx=commit cid=abc123`
- NoSQL: `[2026-01-05T10:02:31.340Z] INFO db:mongo collection=ActivityLog action=insert group=42 user=175 duration_ms=12`
- Error: `[2026-01-05T10:05:09.008Z] ERROR db:mysql op=sql cid=def456 code=ER_DUP_ENTRY table=GROUP_MEMBERS msg="Duplicate membership (group_id,user_id)"`

Include `cid` (correlation id) across logs for a single request.

---

## SQL Test Scenarios (MySQL)

### 1) User Signup (USERS)
- SQL:
  ```sql
  INSERT INTO users (name, email, phone, password_hash, created_at)
  VALUES ('Alice', 'alice@example.com', '9998887776', '<hash>', NOW());
  ```
- Expected Logs:
  - tx begin → INSERT users → tx commit with `affected=1` and duration.
  - On email unique conflict: error log with `code=ER_DUP_ENTRY`.

### 2) Group Creation (GROUPS_MADE)
- SQL:
  ```sql
  INSERT INTO groups_made (name, description, created_by, created_at)
  VALUES ('Trip', 'Goa trip', 175, NOW());
  ```
- Logs: INSERT groups_made affected=1; follow-up SELECT to return group row or id.

### 3) Add Member (GROUP_MEMBERS)
- SQL:
  ```sql
  INSERT INTO group_members (group_id, user_id, role, joined_at)
  VALUES (42, 156, 'member', NOW());
  ```
- Constraints: Composite PK (group_id,user_id) enforces uniqueness.
- Logs: INSERT affected=1; on duplicate → `ER_DUP_ENTRY` logged.

### 4) Create Expense + Equal Splits (EXPENSES, EXPENSE_SPLITS)
- Transactional flow:
  ```sql
  START TRANSACTION;
  INSERT INTO expenses (group_id, paid_by, amount, description, expense_date, created_at)
  VALUES (42, 175, 1500.00, 'Dinner', '2025-12-20 20:30:00', NOW());

  INSERT INTO expense_splits (expense_id, user_id, owed_amount)
  VALUES (/*new id*/ 301, 175, 500.00), (301, 156, 500.00), (301, 157, 500.00);

  COMMIT;
  ```
- Logs: tx begin → INSERT expenses affected=1 → INSERT 3 rows into splits → tx commit.
- On failure: tx rollback with error cause.

### 5) Update Expense Amount (re-split)
- SQL:
  ```sql
  UPDATE expenses SET amount = 1800.00 WHERE id = 301 AND group_id = 42;
  DELETE FROM expense_splits WHERE expense_id = 301;
  INSERT INTO expense_splits (expense_id, user_id, owed_amount)
  VALUES (301, 175, 600.00), (301, 156, 600.00), (301, 157, 600.00);
  ```
- Logs: UPDATE affected=1 → DELETE affected=3 → INSERT affected=3.

### 6) Delete Expense (cascade splits)
- SQL:
  ```sql
  START TRANSACTION;
  DELETE FROM expense_splits WHERE expense_id = 301;
  DELETE FROM expenses WHERE id = 301 AND group_id = 42;
  COMMIT;
  ```
- Logs: DELETE splits affected=3 → DELETE expenses affected=1 → commit.

### 7) Balance Computation (reporting query)
- SQL (example):
  ```sql
  SELECT u.id AS user_id,
         SUM(CASE WHEN e.paid_by = u.id THEN e.amount ELSE 0 END) AS paid_total,
         SUM(es.owed_amount) AS owed_total,
         SUM(CASE WHEN e.paid_by = u.id THEN e.amount ELSE 0 END) - SUM(es.owed_amount) AS net_balance
  FROM users u
  JOIN group_members gm ON gm.user_id = u.id AND gm.group_id = 42
  LEFT JOIN expenses e ON e.group_id = gm.group_id
  LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.user_id = u.id
  GROUP BY u.id;
  ```
- Logs: SELECT rows=3 duration_ms, optional `EXPLAIN` logged to confirm index usage.

### 8) Index Verification
- Commands:
  ```sql
  EXPLAIN SELECT * FROM expenses WHERE group_id = 42 ORDER BY expense_date DESC LIMIT 20;
  ```
- Logs: `key=idx_expenses_group_date`, `rows`, `filtered`, `duration_ms`.

### 9) Reporting with Filters + Pagination
- SQL:
  ```sql
  SELECT * FROM expenses
  WHERE group_id = 42 AND expense_date BETWEEN '2025-12-01' AND '2025-12-31'
  ORDER BY expense_date DESC
  LIMIT 20 OFFSET 0;
  ```
- Logs: SELECT rows=20 duration_ms; include `page=1` metadata.

---

## MongoDB Test Scenarios

### A) ActivityLog insert
- Doc:
  ```json
  { "group_id": 42, "user_id": 175, "action_type": "EXPENSE_ADDED", "expense_id": 301,
    "meta": { "amount": 1500.0, "participants": [175,156,157] }, "timestamp": "2025-12-20T20:30:05Z" }
  ```
- Logs: `collection=ActivityLog action=insert group=42 user=175 duration_ms`.

### B) Notification lifecycle
- Insert unread:
  ```json
  { "user_id": 156, "type": "GROUP_INVITE", "message": "Added to Trip group",
    "group_id": 42, "is_read": false, "created_at": "2025-12-20T20:31:00Z" }
  ```
- Mark as read (update):
  ```json
  { "$set": { "is_read": true } }
  ```
- Logs: `find user_id=156 is_read=false → update matched=1 modified=1`.

### C) RealtimeUpdate event
- Insert:
  ```json
  { "group_id": 42, "event": "EXPENSE_ADDED", "data": { "expense_id": 301 },
    "timestamp": "2025-12-20T20:30:06Z" }
  ```
- Logs: `collection=RealtimeUpdate action=insert group=42 event=EXPENSE_ADDED`.

### D) SettlementCache refresh
- Upsert cache:
  ```json
  { "group_id": 42, "settlements": [ { "from": 156, "to": 175, "amount": 600.0 } ],
    "generated_at": "2025-12-20T21:00:00Z" }
  ```
- Logs: `collection=SettlementCache action=upsert group=42 settlements=1`.

### E) EmailOtp TTL
- Insert:
  ```json
  { "email": "alice@example.com", "code": "482913", "purpose": "signup",
    "createdAt": "2025-12-20T20:00:00Z", "expiresAt": "2025-12-20T20:05:00Z" }
  ```
- TTL behavior: Document auto-removed after expiresAt.
- Logs: `insert EmailOtp → ttl_expire observed` (via monitoring job/log).

---

## Error & Edge Case Tests
- SQL FK violation: Insert `expense_splits` with unknown `expense_id` → expect `ER_NO_REFERENCED_ROW` logged; tx rollback.
- Duplicate membership: Insert duplicate `(group_id,user_id)` in `GROUP_MEMBERS` → `ER_DUP_ENTRY` logged.
- Amount validation: Negative or zero amount rejected at backend; log `400 Bad Request` with validation errors.
- Mongo index performance: Query `Notification` by `(user_id,is_read,created_at)` → log `docs` and `duration_ms`.

---

## Sample Aggregated Request Log (Successful expense add)
```
[...31.145Z] INFO api:expense.create op=sql tx=begin cid=abc123 user=175 group=42
[...31.230Z] INFO db:mysql op=sql stmt=INSERT table=EXPENSES affected=1 duration_ms=52 cid=abc123
[...31.315Z] INFO db:mysql op=sql stmt=INSERT table=EXPENSE_SPLITS affected=3 duration_ms=44 cid=abc123
[...31.322Z] INFO api:expense.create op=sql tx=commit cid=abc123
[...31.340Z] INFO db:mongo collection=ActivityLog action=insert group=42 user=175 duration_ms=12 cid=abc123
[...31.352Z] INFO db:mongo collection=RealtimeUpdate action=insert event=EXPENSE_ADDED group=42 duration_ms=8 cid=abc123
[...31.420Z] INFO db:mongo collection=SettlementCache action=upsert group=42 settlements=1 duration_ms=20 cid=abc123
```

## Notes
- Use correlation IDs across SQL and Mongo logs per request.
- Include `duration_ms`, `affected` (rows/docs), and key identifiers.
- Prefer INFO for successful ops; WARN/ERROR for validation or integrity failures.
- Periodically test EXPLAIN plans and index coverage; log key/rows/filtered.
