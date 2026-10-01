import React, { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:3000/api';
const columns = ['To Do', 'In Progress', 'Review', 'Done'];

async function api(path, options = {}, token = '') {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      if (mode === 'register') {
        await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
        setMode('login');
        setMessage('Account created. Now log in.');
      } else {
        const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        onLogin(result.token);
      }
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">DoneGone</p>
        <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>

        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>

        <button className="primary">{mode === 'login' ? 'Log in' : 'Register'}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create account' : 'Back to login'}
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}

function TaskForm({ task, members, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'To Do',
    priority: task?.priority || 'Medium',
    due_date: task?.due_date ? String(task.due_date).slice(0, 10) : '',
    assignee_id: task?.assignee_id || ''
  });

  return (
    <div className="overlay">
      <form className="modal" onSubmit={e => {
        e.preventDefault();
        onSave({
          ...form,
          due_date: form.due_date || null,
          assignee_id: form.assignee_id ? Number(form.assignee_id) : null
        });
      }}>
        <h2>{task ? 'Edit task' : 'New task'}</h2>
        <label>Title<input value={form.title} onChange={e => setForm({...form, title:e.target.value})} required /></label>
        <label>Description<textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} /></label>

        <div className="row">
          <label>Status<select value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
            {columns.map(c => <option key={c}>{c}</option>)}
          </select></label>

          <label>Priority<select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select></label>
        </div>

        <div className="row">
          <label>Due date<input type="date" value={form.due_date} onChange={e => setForm({...form, due_date:e.target.value})} /></label>
          <label>Assignee<select value={form.assignee_id} onChange={e => setForm({...form, assignee_id:e.target.value})}>
            <option value="">Unassigned</option>
            {members.map(m => <option value={m.id} key={m.id}>{m.email}</option>)}
          </select></label>
        </div>

        <div className="actions">
          {task && <button type="button" className="danger" onClick={onDelete}>Delete</button>}
          <span />
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary">Save</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('donegone_token') || '');
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ active: 0, done: 0, overdue: 0 });
  const [newProject, setNewProject] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState('');

  const project = projects.find(p => p.id === selected);
  const grouped = useMemo(() => Object.fromEntries(columns.map(c => [c, tasks.filter(t => t.status === c)])), [tasks]);

  function login(t) {
    localStorage.setItem('donegone_token', t);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem('donegone_token');
    setToken('');
  }

  async function loadProjects() {
    try {
      const data = await api('/projects', {}, token);
      setProjects(data);
      if (!selected && data[0]) setSelected(data[0].id);
    } catch (e) { setError(e.message); }
  }

  async function loadProjectData(id) {
    if (!id) return;
    try {
      const [t, m, s] = await Promise.all([
        api(`/tasks/project/${id}`, {}, token),
        api(`/projects/${id}/members`, {}, token),
        api(`/tasks/project/${id}/stats`, {}, token)
      ]);
      setTasks(t); setMembers(m); setStats(s);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (token) loadProjects(); }, [token]);
  useEffect(() => { if (token && selected) loadProjectData(selected); }, [token, selected]);

  async function createProject(e) {
    e.preventDefault();
    if (!newProject.trim()) return;
    const p = await api('/projects', { method:'POST', body:JSON.stringify({ name:newProject.trim(), description:'DoneGone project' }) }, token);
    setProjects([p, ...projects]); setSelected(p.id); setNewProject('');
  }

  async function saveTask(data) {
    if (editing) {
      await api(`/tasks/${editing.id}`, { method:'PUT', body:JSON.stringify(data) }, token);
    } else {
      await api('/tasks', { method:'POST', body:JSON.stringify({ ...data, project_id:selected }) }, token);
    }
    setEditing(undefined);
    await loadProjectData(selected);
  }

  async function deleteTask() {
    await api(`/tasks/${editing.id}`, { method:'DELETE' }, token);
    setEditing(undefined);
    await loadProjectData(selected);
  }

  async function move(task, delta) {
    const i = columns.indexOf(task.status);
    const next = Math.max(0, Math.min(columns.length - 1, i + delta));
    if (next === i) return;
    await api(`/tasks/${task.id}`, {
      method:'PUT',
      body:JSON.stringify({
        title:task.title, description:task.description, priority:task.priority,
        status:columns[next], due_date:task.due_date, assignee_id:task.assignee_id
      })
    }, token);
    await loadProjectData(selected);
  }

  async function invite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    await api(`/projects/${selected}/members`, {
      method:'POST',
      body:JSON.stringify({ email:inviteEmail.trim() })
    }, token);
    setInviteEmail('');
    await loadProjectData(selected);
  }

  if (!token) return <Auth onLogin={login} />;

  return (
    <div className="app">
      <aside>
        <div><p className="eyebrow">DoneGone</p><h2>Projects</h2></div>

        <div className="projects">
          {projects.map(p => (
            <button key={p.id} className={p.id === selected ? 'active' : ''} onClick={() => setSelected(p.id)}>
              <strong>{p.name}</strong><small>{p.description}</small>
            </button>
          ))}
        </div>

        <form onSubmit={createProject}>
          <input placeholder="New project" value={newProject} onChange={e => setNewProject(e.target.value)} />
          <button className="primary">Add project</button>
        </form>

        <button className="logout" onClick={logout}>Log out</button>
      </aside>

      <main>
        {project ? <>
          <header>
            <div><p className="eyebrow">Project</p><h1>{project.name}</h1></div>
            <button className="primary" onClick={() => setEditing(null)}>+ New task</button>
          </header>

          {error && <div className="error">{error}</div>}

          <section className="stats">
            <div><span>Active</span><strong>{stats.active}</strong></div>
            <div><span>Done</span><strong>{stats.done}</strong></div>
            <div><span>Overdue</span><strong>{stats.overdue}</strong></div>
            <div><span>Members</span><strong>{members.length}</strong></div>
          </section>

          <section className="members">
            <div>{members.map(m => <span key={m.id}>{m.email} · {m.role}</span>)}</div>
            <form onSubmit={invite}>
              <input type="email" placeholder="Invite user by email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <button>Invite</button>
            </form>
          </section>

          <section className="board">
            {columns.map(c => <div className="column" key={c}>
              <div className="column-head"><h3>{c}</h3><span>{grouped[c].length}</span></div>

              {grouped[c].map(t => <article className="task" key={t.id}>
                <button className="task-body" onClick={() => setEditing(t)}>
                  <strong>{t.title}</strong>
                  <small>{t.description || 'No description'}</small>
                  <div className="meta"><span>{t.priority}</span>{t.due_date && <span>Due {String(t.due_date).slice(0,10)}</span>}</div>
                  {t.assignee_email && <em>{t.assignee_email}</em>}
                </button>
                <div className="move"><button onClick={() => move(t,-1)} disabled={c === columns[0]}>←</button><button onClick={() => move(t,1)} disabled={c === columns.at(-1)}>→</button></div>
              </article>)}
            </div>)}
          </section>
        </> : <div className="empty"><h1>Create your first project</h1></div>}
      </main>

      {editing !== undefined && selected && <TaskForm task={editing} members={members} onClose={() => setEditing(undefined)} onSave={saveTask} onDelete={deleteTask} />}
    </div>
  );
}
