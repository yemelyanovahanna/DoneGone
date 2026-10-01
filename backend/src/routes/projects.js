const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

async function canAccessProject(projectId, userId) {
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

router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT p.*
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id
     WHERE p.owner_id = $1 OR pm.user_id = $1
     ORDER BY p.id DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { name, description = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const result = await pool.query(
    'INSERT INTO projects(name, description, owner_id) VALUES($1, $2, $3) RETURNING *',
    [name, description, req.user.id]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, description = '' } = req.body;
  const result = await pool.query(
    'UPDATE projects SET name=$1, description=$2 WHERE id=$3 AND owner_id=$4 RETURNING *',
    [name, description, req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(403).json({ error: 'Only the owner can edit this project' });
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(403).json({ error: 'Only the owner can delete this project' });
  res.status(204).end();
});

router.get('/:id/members', async (req, res) => {
  if (!(await canAccessProject(req.params.id, req.user.id))) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const result = await pool.query(
    `SELECT u.id, u.email, 'owner' AS role
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     WHERE p.id = $1
     UNION
     SELECT u.id, u.email, pm.role
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY role DESC, email`,
    [req.params.id]
  );
  res.json(result.rows);
});

router.post('/:id/members', async (req, res) => {
  const { email } = req.body;
  const owner = await pool.query(
    'SELECT id FROM projects WHERE id=$1 AND owner_id=$2',
    [req.params.id, req.user.id]
  );
  if (!owner.rows[0]) return res.status(403).json({ error: 'Only the owner can invite members' });

  const user = await pool.query('SELECT id, email FROM users WHERE email=$1', [email]);
  if (!user.rows[0]) return res.status(404).json({ error: 'User with this email was not found' });

  await pool.query(
    `INSERT INTO project_members(project_id, user_id)
     VALUES($1, $2)
     ON CONFLICT (project_id, user_id) DO NOTHING`,
    [req.params.id, user.rows[0].id]
  );

  res.status(201).json(user.rows[0]);
});

module.exports = router;
