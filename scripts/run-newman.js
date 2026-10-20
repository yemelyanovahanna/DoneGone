const fs = require('fs');
const path = require('path');
const newman = require('newman');
const root = path.resolve(__dirname, '..');
const reports = path.join(root, 'reports');
fs.mkdirSync(reports, { recursive: true });
const collectionPath = process.env.COLLECTION_PATH || path.join(root, 'postman/DoneGone.postman_collection.json');
newman.run({
  collection: collectionPath,
  environment: path.join(root, 'postman/local.postman_environment.json'),
  envVar: [
    { key: 'base_url', value: process.env.API_BASE_URL || 'http://127.0.0.1:8081' },
    { key: 'expected_health_status', value: process.env.EXPECT_HEALTH_STATUS || '200' }
  ],
  reporters: ['cli', 'junit'],
  reporter: { junit: { export: path.join(reports, 'newman.xml') } },
  bail: true,
  timeoutRequest: 10000,
  timeoutScript: 10000,
  color: 'off'
}, (error, summary) => {
  const failures = summary ? summary.run.failures : [];
  const result = {
    collection: 'DoneGone Stage 3 REST API',
    finishedAt: new Date().toISOString(),
    success: !error && failures.length === 0,
    requests: summary ? summary.run.stats.requests : null,
    assertions: summary ? summary.run.stats.assertions : null,
    durationMs: summary ? summary.run.timings.completed - summary.run.timings.started : null,
    failures: failures.map(f => ({ source: f.source && f.source.name, test: f.error && f.error.test, message: f.error && f.error.message })),
    runnerError: error ? error.message : null
  };
  // Do not export raw requests, tokens, environments or generated passwords.
  fs.writeFileSync(path.join(reports, 'summary.json'), JSON.stringify(result, null, 2));
  process.exitCode = result.success ? 0 : 1;
});
