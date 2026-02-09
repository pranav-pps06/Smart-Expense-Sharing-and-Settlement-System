/**
 * Tests for Service Module Exports
 * Verifies all services export the expected functions
 */

// We need to mock DB before requiring services
jest.mock('../db/sqlconnect', () => ({
  query: jest.fn((sql, params, cb) => cb(null, []))
}));

jest.mock('../db/mongo', () => ({
  connectMongo: jest.fn().mockResolvedValue(true),
  getMongoDb: jest.fn()
}));

describe('Service Exports', () => {
  test('debtGraph exports required functions', () => {
    const svc = require('../services/debtGraph');
    expect(typeof svc.buildDebtGraph).toBe('function');
    expect(typeof svc.optimizeSettlements).toBe('function');
    expect(typeof svc.detectCircularDebts).toBe('function');
    expect(typeof svc.getDebtVisualization).toBe('function');
  });

  test('timeTravel exports required functions', () => {
    const svc = require('../services/timeTravel');
    expect(typeof svc.recordExpenseHistory).toBe('function');
    expect(typeof svc.getExpenseHistory).toBe('function');
    expect(typeof svc.getGroupAuditTrail).toBe('function');
    expect(typeof svc.getBalancesAtDate).toBe('function');
    expect(typeof svc.undoExpense).toBe('function');
    expect(typeof svc.redoExpense).toBe('function');
  });

  test('predictions exports getPredictiveInsights', () => {
    const svc = require('../services/predictions');
    expect(typeof svc.getPredictiveInsights).toBe('function');
  });

  test('voiceProcessor exports parse functions', () => {
    const svc = require('../services/voiceProcessor');
    expect(typeof svc.parseVoiceWithAI).toBe('function');
    expect(typeof svc.parseVoiceSettlement).toBe('function');
  });

  test('aiChatbot exports expected functions', () => {
    const svc = require('../services/aiChatbot');
    expect(typeof svc.chatWithAI).toBe('function');
    expect(typeof svc.getExpenseInsights).toBe('function');
  });

  // settlements and mailer require real Mongoose connection — skip in unit tests
  test.skip('settlements exports expected functions', () => {});
  test.skip('mailer exports sendMail', () => {});
});

describe('Route Module Exports', () => {
  // Routes that don't need Mongoose models
  test('core routes export express routers', () => {
    const routeFiles = ['ai', 'expenses', 'index', 'login', 'newUser', 'users'];
    routeFiles.forEach(name => {
      const router = require(`../routes/${name}`);
      expect(typeof router).toBe('function');
    });
  });

  // api.js and authOtp.js require Mongoose models — skip in unit tests
  test.skip('api and authOtp routes export express routers', () => {});
});

describe('Middleware', () => {
  test('cookieAuth is a function', () => {
    const cookieAuth = require('../middleware/cookieAuth');
    expect(typeof cookieAuth).toBe('function');
  });
});
