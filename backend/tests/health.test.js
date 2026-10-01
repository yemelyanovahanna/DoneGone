const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns DoneGone health status', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok', app: 'DoneGone' });
  });
});
