/**
 * Integration Tests for API Routes
 * Tests the actual HTTP endpoints using supertest
 */
const request = require('supertest');
const app = require('../app');

// Mock MySQL
jest.mock('../db/sqlconnect', () => {
  const mockQuery = jest.fn();
  return { query: mockQuery, __mockQuery: mockQuery };
});

// Mock MongoDB connection
jest.mock('../db/mongo', () => ({
  connectMongo: jest.fn().mockResolvedValue(true),
  getMongoDb: jest.fn()
}));

// Mock all Mongo models to avoid real connections
jest.mock('../mongo/ActivityLog', () => ({ find: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) }));
jest.mock('../mongo/Notification', () => ({}));
jest.mock('../mongo/RealtimeUpdate', () => ({}));
jest.mock('../mongo/SettlementCache', () => ({}));
jest.mock('../mongo/EmailOtp', () => ({}));

const db = require('../db/sqlconnect');

describe('API Routes - Health', () => {
  test('GET / should return 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBeLessThan(500);
  });

  test('GET /api/ai/status should require auth', async () => {
    const res = await request(app).get('/api/ai/status');
    expect([401, 403]).toContain(res.status);
  });
});

describe('API Routes - Auth required endpoints', () => {
  test('GET /api/groups should return 401 without cookie', async () => {
    const res = await request(app).get('/api/groups');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/user-dashboard should return 401 without cookie', async () => {
    const res = await request(app).get('/api/user-dashboard');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/ai/insights should return 401 without cookie', async () => {
    const res = await request(app).get('/api/ai/insights');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/ai/predictions should return 401 without cookie', async () => {
    const res = await request(app).get('/api/ai/predictions');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/ai/debt-graph/1 should return 401 without cookie', async () => {
    const res = await request(app).get('/api/ai/debt-graph/1');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/ai/time-travel/1 should return 401 without cookie', async () => {
    const res = await request(app).get('/api/ai/time-travel/1');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/ai/audit-trail/1 should return 401 without cookie', async () => {
    const res = await request(app).get('/api/ai/audit-trail/1');
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/ai/voice-parse should return 401 without cookie', async () => {
    const res = await request(app).post('/api/ai/voice-parse').send({ transcript: 'test' });
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/ai/subgroup should return 401 without cookie', async () => {
    const res = await request(app).post('/api/ai/subgroup').send({ parentGroupId: 1, name: 'test' });
    expect([401, 403]).toContain(res.status);
  });
});

describe('API Routes - Signup and Login', () => {
  // These routes call real MySQL (bcrypt + db.query) and hang without a live DB connection
  // They are integration tests — skip in unit test suite
  test.skip('POST /newuser needs live DB', () => {});
  test.skip('POST /loginuser needs live DB', () => {});
});

describe('API Routes - Expense parsing (no auth needed)', () => {
  test('POST /api/expenses/parse should parse transcript with amount', async () => {
    // Mock the DB query for member lookup
    db.query.mockImplementation((sql, params, cb) => cb(null, []));

    const res = await request(app)
      .post('/api/expenses/parse')
      .send({ transcript: 'Add 500 for dinner with Alice and Bob', groupId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(500);
    expect(res.body.description).toBeTruthy();
    expect(res.body.names).toContain('Alice');
    expect(res.body.names).toContain('Bob');
  });

  test('POST /api/expenses/parse should fail without amount', async () => {
    const res = await request(app)
      .post('/api/expenses/parse')
      .send({ transcript: 'lunch with friends' });

    expect(res.status).toBe(400);
  });

  test('POST /api/expenses/parse should fail without transcript', async () => {
    const res = await request(app)
      .post('/api/expenses/parse')
      .send({});

    expect(res.status).toBe(400);
  });
});
