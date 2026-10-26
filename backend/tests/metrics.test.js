jest.mock('../src/db', () => ({ query: jest.fn() }));
const request = require('supertest');
const app = require('../src/app');
it('exports request counts and response duration for successful and rejected requests', async () => {
  await request(app).get('/api/health');
  await request(app).get('/api/projects');
  const response = await request(app).get('/metrics');
  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toContain('text/plain');
  expect(response.text).toMatch(/donegone_http_requests_total\{[^}]*status_code="200"/);
  expect(response.text).toMatch(/donegone_http_requests_total\{[^}]*status_code="401"/);
  expect(response.text).toContain('donegone_http_request_duration_seconds_bucket');
  expect(response.text).toContain('donegone_process_resident_memory_bytes');
});
it('uses bounded route labels without IDs or query values and excludes its own scrapes', async () => {
  await request(app).get('/api/tasks/private-user-id?token=do-not-export');
  const text = (await request(app).get('/metrics')).text;
  expect(text).not.toContain('private-user-id');
  expect(text).not.toContain('do-not-export');
  expect(text).not.toContain('route="/metrics"');
});
