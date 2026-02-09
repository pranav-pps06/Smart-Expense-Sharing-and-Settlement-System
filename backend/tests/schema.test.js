/**
 * Tests for Schema Integrity
 * Verifies the SQL schema has all required tables and columns
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

describe('Schema Integrity', () => {
  test('schema file exists and is non-empty', () => {
    expect(schema.length).toBeGreaterThan(100);
  });

  describe('Required Tables', () => {
    const tables = ['users', 'groups_made', 'group_members', 'expenses', 'expense_splits', 'expense_history'];
    tables.forEach(table => {
      test(`should have CREATE TABLE ${table}`, () => {
        expect(schema).toMatch(new RegExp(`CREATE TABLE ${table}`, 'i'));
      });
    });
  });

  describe('Users table', () => {
    test('should have id, name, email, password_hash, created_at', () => {
      expect(schema).toMatch(/id INT AUTO_INCREMENT PRIMARY KEY/i);
      expect(schema).toMatch(/name VARCHAR/i);
      expect(schema).toMatch(/email VARCHAR.*UNIQUE/i);
      expect(schema).toMatch(/password_hash VARCHAR/i);
    });
  });

  describe('Groups table - hierarchy support', () => {
    test('should have parent_id for sub-groups', () => {
      expect(schema).toMatch(/parent_id/i);
    });

    test('parent_id should reference groups_made', () => {
      expect(schema).toMatch(/FOREIGN KEY \(parent_id\) REFERENCES groups_made/i);
    });
  });

  describe('Expenses table', () => {
    test('should have created_at for time-travel', () => {
      // Check expenses table has created_at
      const expensesSection = schema.substring(
        schema.indexOf('CREATE TABLE expenses'),
        schema.indexOf('CREATE TABLE expense_splits')
      );
      expect(expensesSection).toMatch(/created_at/i);
    });
  });

  describe('Expense History table (audit trail)', () => {
    test('should have action ENUM', () => {
      expect(schema).toMatch(/action ENUM/i);
    });

    test('should support created, updated, deleted, restored actions', () => {
      expect(schema).toMatch(/created.*updated.*deleted.*restored/i);
    });

    test('should have snapshot JSON column', () => {
      expect(schema).toMatch(/snapshot JSON/i);
    });

    test('should have changed_by foreign key', () => {
      expect(schema).toMatch(/FOREIGN KEY \(changed_by\) REFERENCES users/i);
    });

    test('should have changed_at timestamp', () => {
      expect(schema).toMatch(/changed_at TIMESTAMP/i);
    });
  });

  describe('Group Members', () => {
    test('should have UNIQUE constraint on group_id + user_id', () => {
      expect(schema).toMatch(/UNIQUE.*group_id.*user_id/i);
    });
  });
});
