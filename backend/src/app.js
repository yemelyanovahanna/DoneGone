const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');

const app = express();
app.use(cors());
app.use(express.json());

const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    app: 'DoneGone'
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

module.exports = app;
