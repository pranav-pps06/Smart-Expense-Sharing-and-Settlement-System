-- Create database
DROP DATABASE IF EXISTS expense_tracker;
CREATE DATABASE expense_tracker;
USE expense_tracker;

-- 1) users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) groups_made (supports hierarchy via parent_id)
CREATE TABLE groups_made (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES groups_made(id) ON DELETE SET NULL
);

-- 3) group_members
CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_made(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uq_group_user (group_id, user_id)
);

-- 4) expenses (with created_at for time-travel)
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    paid_by INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups_made(id),
    FOREIGN KEY (paid_by) REFERENCES users(id)
);

-- 5) expense_splits
CREATE TABLE expense_splits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_id INT NOT NULL,
    user_id INT NOT NULL,
    owed_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6) expense_history — full audit trail for time-travel and undo/redo
CREATE TABLE expense_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_id INT NOT NULL,
    action ENUM('created','updated','deleted','restored') NOT NULL DEFAULT 'created',
    changed_by INT NOT NULL,
    old_amount DECIMAL(10,2) DEFAULT NULL,
    new_amount DECIMAL(10,2) DEFAULT NULL,
    old_description VARCHAR(255) DEFAULT NULL,
    new_description VARCHAR(255) DEFAULT NULL,
    snapshot JSON DEFAULT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);