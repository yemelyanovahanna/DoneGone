const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');

const app = express();
const metrics = require('./metrics');
app.use(metrics.middleware);
app.get('/metrics', metrics.endpoint);
app.use(cors());
app.use(express.json());

const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    app: 'DoneGone'
  });
};

app.get('/health', healthHandler);
app.get(['/ready', '/api/ready'], async (req, res) => {
  try {
    await require('./db').query('SELECT 1 FROM users LIMIT 1');
    res.json({ status: 'ready', app: 'DoneGone' });
  } catch (_) {
    res.status(503).json({ status: 'not-ready', app: 'DoneGone' });
  }
});
app.get('/api/health', healthHandler);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(503).json({ error: 'Service temporarily unavailable' });
});

module.exports = app;
