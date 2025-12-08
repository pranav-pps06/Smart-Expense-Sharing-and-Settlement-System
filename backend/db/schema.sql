-- =====================================================
-- Expense Tracker Database Schema (Normalized - 3NF)
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS expense_tracker;
USE expense_tracker;

-- =====================================================
-- USERS TABLE (1NF, 2NF, 3NF compliant)
-- Primary entity - no transitive dependencies
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- GROUPS TABLE (Normalized)
-- Each group has one creator (foreign key to users)
-- =====================================================
CREATE TABLE IF NOT EXISTS groups_made (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- GROUP_MEMBERS TABLE (Junction/Bridge table - 2NF)
-- Resolves M:N relationship between users and groups
-- Eliminates repeating groups (1NF violation)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (group_id) REFERENCES groups_made(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Composite unique constraint prevents duplicate memberships
    UNIQUE KEY unique_membership (group_id, user_id),
    INDEX idx_group_id (group_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EXPENSES TABLE (Normalized)
-- Each expense belongs to one group, paid by one user
-- No partial dependencies (2NF compliant)
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    paid_by INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (group_id) REFERENCES groups_made(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_group_id (group_id),
    INDEX idx_paid_by (paid_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EXPENSE_SPLITS TABLE (Junction table - Normalized)
-- Resolves M:N between expenses and users (participants)
-- Each row = one user's share in one expense
-- Eliminates transitive dependencies (3NF)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_splits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_id INT NOT NULL,
    user_id INT NOT NULL,
    owed_amount DECIMAL(12, 2) NOT NULL,
    is_settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMP NULL,
    
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Composite unique: one split per user per expense
    UNIQUE KEY unique_split (expense_id, user_id),
    INDEX idx_expense_id (expense_id),
    INDEX idx_user_id (user_id),
    INDEX idx_is_settled (is_settled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SETTLEMENTS TABLE (Normalized - Optional for tracking)
-- Records actual money transfers between users
-- =====================================================
CREATE TABLE IF NOT EXISTS settlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    payer_id INT NOT NULL,        -- User who pays
    payee_id INT NOT NULL,        -- User who receives
    amount DECIMAL(12, 2) NOT NULL,
    settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(255) NULL,
    
    FOREIGN KEY (group_id) REFERENCES groups_made(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payee_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_group_id (group_id),
    INDEX idx_payer_id (payer_id),
    INDEX idx_payee_id (payee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- NORMALIZATION SUMMARY:
-- 
-- 1NF (First Normal Form):
--    ✓ All tables have primary keys
--    ✓ No repeating groups (M:N resolved via junction tables)
--    ✓ All columns contain atomic values
--
-- 2NF (Second Normal Form):
--    ✓ Satisfies 1NF
--    ✓ No partial dependencies (non-key attributes depend on full PK)
--    ✓ Junction tables (group_members, expense_splits) properly decomposed
--
-- 3NF (Third Normal Form):
--    ✓ Satisfies 2NF  
--    ✓ No transitive dependencies
--    ✓ All non-key attributes depend only on the primary key
--    ✓ e.g., user name stored in users table, not repeated in expenses
-- =====================================================

-- Show tables created
SHOW TABLES;
