const client = require('prom-client');
const registry = new client.Registry();
registry.setDefaultLabels({ app: 'donegone' });
client.collectDefaultMetrics({ register: registry, prefix: 'donegone_' });
const labels = ['method', 'route', 'status_code'];
const requests = new client.Counter({ name: 'donegone_http_requests_total', help: 'Completed application HTTP requests', labelNames: labels, registers: [registry] });
const duration = new client.Histogram({ name: 'donegone_http_request_duration_seconds', help: 'Application HTTP response duration in seconds', labelNames: labels, buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5], registers: [registry] });
function middleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const started = process.hrtime.bigint();
  res.once('finish', () => {
    // Express route templates avoid user IDs, tokens and query strings in labels.
    const route = req.route ? `${req.baseUrl || ''}${req.route.path}` : 'unmatched';
    const values = { method: req.method, route: String(route), status_code: String(res.statusCode) };
    requests.inc(values);
    duration.observe(values, Number(process.hrtime.bigint() - started) / 1e9);
  });
  next();
}
async function endpoint(req, res, next) {
  try { res.set('Content-Type', registry.contentType); res.end(await registry.metrics()); }
  catch (error) { next(error); }
}
module.exports = { registry, middleware, endpoint };
