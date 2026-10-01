const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

async function hasProjectAccess(projectId, userId) {
  const result = await pool.query(
    `SELECT p.id
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id
     WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)
     LIMIT 1`,
    [projectId, userId]
  );
  return Boolean(result.rows[0]);
}

router.get('/project/:projectId', async (req, res) => {
  if (!(await hasProjectAccess(req.params.projectId, req.user.id))) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const result = await pool.query(
    `SELECT t.*, u.email AS assignee_email
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.project_id = $1
     ORDER BY t.id DESC`,
    [req.params.projectId]
  );
  res.json(result.rows);
});

router.get('/project/:projectId/stats', async (req, res) => {
  if (!(await hasProjectAccess(req.params.projectId, req.user.id))) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status <> 'Done')::int AS active,
       COUNT(*) FILTER (WHERE status = 'Done')::int AS done,
       COUNT(*) FILTER (WHERE status <> 'Done' AND due_date IS NOT NULL AND due_date < CURRENT_DATE)::int AS overdue
     FROM tasks WHERE project_id = $1`,
    [req.params.projectId]
  );
  res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const {
    project_id, title, description = '', status = 'To Do',
    priority = 'Medium', due_date = null, assignee_id = null
  } = req.body;

  if (!project_id || !title) return res.status(400).json({ error: 'project_id and title are required' });
  if (!(await hasProjectAccess(project_id, req.user.id))) return res.status(404).json({ error: 'Project not found' });

  const result = await pool.query(
    `INSERT INTO tasks(project_id, title, description, status, priority, due_date, assignee_id)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [project_id, title, description, status, priority, due_date, assignee_id]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const {
    title, description = '', status = 'To Do',
    priority = 'Medium', due_date = null, assignee_id = null
  } = req.body;

  const access = await pool.query(
    `SELECT t.id
     FROM tasks t
     JOIN projects p ON p.id=t.project_id
     LEFT JOIN project_members pm ON pm.project_id=p.id
     WHERE t.id=$1 AND (p.owner_id=$2 OR pm.user_id=$2)
     LIMIT 1`,
    [req.params.id, req.user.id]
  );
  if (!access.rows[0]) return res.status(404).json({ error: 'Task not found' });

  const result = await pool.query(
    `UPDATE tasks
     SET title=$1, description=$2, status=$3, priority=$4, due_date=$5, assignee_id=$6
     WHERE id=$7 RETURNING *`,
    [title, description, status, priority, due_date, assignee_id, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    `DELETE FROM tasks t
     USING projects p
     WHERE t.id=$1 AND p.id=t.project_id
       AND (p.owner_id=$2 OR EXISTS (
         SELECT 1 FROM project_members pm
         WHERE pm.project_id=p.id AND pm.user_id=$2
       ))
     RETURNING t.id`,
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end();
});

module.exports = router;
