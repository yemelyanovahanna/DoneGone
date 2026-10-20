jest.mock('../src/db', () => ({ query: jest.fn() }));
const request = require('supertest');
const pool = require('../src/db');
const app = require('../src/app');
afterEach(() => jest.resetAllMocks());
it('becomes ready when the database schema is available', async () => {
  pool.query.mockResolvedValue({ rows: [] });
  expect((await request(app).get('/ready')).statusCode).toBe(200);
});
it('returns 503 when the database is unavailable', async () => {
  pool.query.mockRejectedValue(new Error('connection refused'));
  const response = await request(app).get('/ready');
  expect(response.statusCode).toBe(503);
  expect(response.body).toEqual({ status: 'not-ready', app: 'DoneGone' });
});

it('returns 503 for a failed asynchronous login query', async () => {
  pool.query.mockRejectedValue(new Error('database restarting'));
  expect((await request(app).post('/api/auth/login').send({email:'demo@example.test',password:'test'})).statusCode).toBe(503);
});
