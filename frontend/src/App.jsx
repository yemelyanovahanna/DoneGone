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

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage('');

    try {
      if (mode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password
          })
        });

        setMode('login');
        setMessage('Account created. Now log in.');
      } else {
        const result = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password
          })
        });

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

        <h1>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </h1>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="primary" type="submit">
          {mode === 'login' ? 'Log in' : 'Register'}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setMessage('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login'
            ? 'Create account'
            : 'Back to login'}
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

function TaskForm({
  task,
  members,
  onClose,
  onSave,
  onDelete
}) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'To Do',
    priority: task?.priority || 'Medium',
    due_date: task?.due_date
      ? String(task.due_date).slice(0, 10)
      : '',
    assignee_id: task?.assignee_id || ''
  });

  function updateField(field, value) {
    setForm(current => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <div className="overlay">
      <form
        className="modal"
        onSubmit={e => {
          e.preventDefault();

          onSave({
            ...form,
            due_date: form.due_date || null,
            assignee_id: form.assignee_id
              ? Number(form.assignee_id)
              : null
          });
        }}
      >
        <h2>
          {task ? 'Edit task' : 'New task'}
        </h2>

        <label>
          Title
          <input
            value={form.title}
            onChange={e =>
              updateField('title', e.target.value)
            }
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={form.description}
            onChange={e =>
              updateField('description', e.target.value)
            }
          />
        </label>

        <div className="row">
          <label>
            Status

            <select
              value={form.status}
              onChange={e =>
                updateField('status', e.target.value)
              }
            >
              {columns.map(column => (
                <option key={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority

            <select
              value={form.priority}
              onChange={e =>
                updateField('priority', e.target.value)
              }
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
        </div>

        <div className="row">
          <label>
            Due date

            <input
              type="date"
              value={form.due_date}
              onChange={e =>
                updateField('due_date', e.target.value)
              }
            />
          </label>

          <label>
            Assignee

            <select
              value={form.assignee_id}
              onChange={e =>
                updateField('assignee_id', e.target.value)
              }
            >
              <option value="">
                Unassigned
              </option>

              {members.map(member => (
                <option
                  value={member.id}
                  key={member.id}
                >
                  {member.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="actions">
          {task && (
            <button
              type="button"
              className="danger"
              onClick={onDelete}
            >
              Delete
            </button>
          )}

          <span />

          <button
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="primary"
            type="submit"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('donegone_token') || ''
  );

  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);

  const [stats, setStats] = useState({
    active: 0,
    done: 0,
    overdue: 0
  });

  const [newProject, setNewProject] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const [editing, setEditing] = useState(undefined);

  const [error, setError] = useState('');

  const project = projects.find(
    item => item.id === selected
  );

  const grouped = useMemo(() => {
    return Object.fromEntries(
      columns.map(column => [
        column,
        tasks.filter(
          task => task.status === column
        )
      ])
    );
  }, [tasks]);

  function login(newToken) {
    localStorage.setItem(
      'donegone_token',
      newToken
    );

    setToken(newToken);

    // При успішному вході прибираємо старі помилки.
    setError('');
  }

  function logout() {
    localStorage.removeItem(
      'donegone_token'
    );

    setToken('');
    setProjects([]);
    setSelected(null);
    setTasks([]);
    setMembers([]);

    setStats({
      active: 0,
      done: 0,
      overdue: 0
    });

    setError('');
  }

  function handleError(err) {
    // Якщо JWT більше не дійсний,
    // очищаємо його та повертаємо користувача на Login.
    if (
      err.status === 401 ||
      err.message === 'Invalid token' ||
      err.message === 'Unauthorized'
    ) {
      logout();
      return;
    }

    setError(err.message);
  }

  async function loadProjects() {
    try {
      const data = await api(
        '/projects',
        {},
        token
      );

      setProjects(data);

      // Якщо попередня помилка вже не актуальна —
      // прибираємо її з інтерфейсу.
      setError('');

      if (!selected && data[0]) {
        setSelected(data[0].id);
      }
    } catch (err) {
      handleError(err);
    }
  }

  async function loadProjectData(id) {
    if (!id) {
      setTasks([]);
      setMembers([]);

      setStats({
        active: 0,
        done: 0,
        overdue: 0
      });

      setError('');

      return;
    }

    try {
      const [
        taskData,
        memberData,
        statsData
      ] = await Promise.all([
        api(
          `/tasks/project/${id}`,
          {},
          token
        ),

        api(
          `/projects/${id}/members`,
          {},
          token
        ),

        api(
          `/tasks/project/${id}/stats`,
          {},
          token
        )
      ]);

      setTasks(taskData);
      setMembers(memberData);
      setStats(statsData);

      // Дані успішно завантажилися,
      // тому старе повідомлення про помилку видаляємо.
      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  useEffect(() => {
    if (token) {
      loadProjects();
    }
  }, [token]);

  useEffect(() => {
    if (token && selected) {
      loadProjectData(selected);
    }
  }, [token, selected]);

  async function createProject(e) {
    e.preventDefault();

    if (!newProject.trim()) {
      return;
    }

    try {
      const createdProject = await api(
        '/projects',
        {
          method: 'POST',
          body: JSON.stringify({
            name: newProject.trim(),
            description: ''
          })
        },
        token
      );

      setProjects(current => [
        createdProject,
        ...current
      ]);

      setSelected(createdProject.id);
      setNewProject('');
      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  async function editProject() {
    if (!project) {
      return;
    }

    const newName = window.prompt(
      'Project name:',
      project.name
    );

    if (
      newName === null ||
      !newName.trim()
    ) {
      return;
    }

    const newDescription = window.prompt(
      'Project description:',
      project.description || ''
    );

    if (newDescription === null) {
      return;
    }

    try {
      const updatedProject = await api(
        `/projects/${project.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: newName.trim(),
            description: newDescription.trim()
          })
        },
        token
      );

      setProjects(current =>
        current.map(item =>
          item.id === updatedProject.id
            ? updatedProject
            : item
        )
      );

      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteProject() {
    if (!project) {
      return;
    }

    const confirmed = window.confirm(
      `Delete project "${project.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api(
        `/projects/${project.id}`,
        {
          method: 'DELETE'
        },
        token
      );

      const remainingProjects =
        projects.filter(
          item => item.id !== project.id
        );

      setProjects(remainingProjects);

      setSelected(
        remainingProjects[0]?.id || null
      );

      setTasks([]);
      setMembers([]);

      setStats({
        active: 0,
        done: 0,
        overdue: 0
      });

      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  async function saveTask(data) {
    try {
      if (editing) {
        await api(
          `/tasks/${editing.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(data)
          },
          token
        );
      } else {
        await api(
          '/tasks',
          {
            method: 'POST',
            body: JSON.stringify({
              ...data,
              project_id: selected
            })
          },
          token
        );
      }

      setEditing(undefined);

      await loadProjectData(selected);

      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteTask() {
    if (!editing) {
      return;
    }

    const confirmed = window.confirm(
      `Delete task "${editing.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api(
        `/tasks/${editing.id}`,
        {
          method: 'DELETE'
        },
        token
      );

      setEditing(undefined);

      await loadProjectData(selected);

      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  async function move(task, delta) {
    const currentIndex =
      columns.indexOf(task.status);

    const nextIndex = Math.max(
      0,
      Math.min(
        columns.length - 1,
        currentIndex + delta
      )
    );

    if (nextIndex === currentIndex) {
      return;
    }

    try {
      await api(
        `/tasks/${task.id}`,
        {
          method: 'PUT',

          body: JSON.stringify({
            title: task.title,

            description:
              task.description || '',

            priority:
              task.priority || 'Medium',

            status:
              columns[nextIndex],

            due_date:
              task.due_date || null,

            assignee_id:
              task.assignee_id || null
          })
        },
        token
      );

      await loadProjectData(selected);

      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  async function invite(e) {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      return;
    }

    try {
      await api(
        `/projects/${selected}/members`,
        {
          method: 'POST',

          body: JSON.stringify({
            email: inviteEmail.trim()
          })
        },
        token
      );

      setInviteEmail('');

      await loadProjectData(selected);

      setError('');
    } catch (err) {
      handleError(err);
    }
  }

  if (!token) {
    return (
      <Auth onLogin={login} />
    );
  }

  return (
    <div className="app">
      <aside>
        <div>
          <p className="eyebrow">
            DoneGone
          </p>

          <h2>
            Projects
          </h2>
        </div>

        <div className="projects">
          {projects.map(item => (
            <button
              key={item.id}
              className={
                item.id === selected
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setSelected(item.id)
              }
            >
              <strong>
                {item.name}
              </strong>

              <small>
                {item.description ||
                  'No description'}
              </small>
            </button>
          ))}
        </div>

        <form onSubmit={createProject}>
          <input
            placeholder="New project"
            value={newProject}
            onChange={e =>
              setNewProject(
                e.target.value
              )
            }
          />

          <button
            className="primary"
            type="submit"
          >
            Add project
          </button>
        </form>

        <button
          className="logout"
          onClick={logout}
        >
          Log out
        </button>
      </aside>

      <main>
        {project ? (
          <>
            <header>
              <div>
                <p className="eyebrow">
                  Project
                </p>

                <h1>
                  {project.name}
                </h1>

                <p>
                  {project.description ||
                    'No description'}
                </p>
              </div>

              <div className="project-actions">
                <button
                  onClick={editProject}
                >
                  Edit project
                </button>

                <button
                  className="danger"
                  onClick={deleteProject}
                >
                  Delete project
                </button>

                <button
                  className="primary"
                  onClick={() =>
                    setEditing(null)
                  }
                >
                  + New task
                </button>
              </div>
            </header>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <section className="stats">
              <div>
                <span>
                  Active
                </span>

                <strong>
                  {stats.active}
                </strong>
              </div>

              <div>
                <span>
                  Done
                </span>

                <strong>
                  {stats.done}
                </strong>
              </div>

              <div>
                <span>
                  Overdue
                </span>

                <strong>
                  {stats.overdue}
                </strong>
              </div>

              <div>
                <span>
                  Members
                </span>

                <strong>
                  {members.length}
                </strong>
              </div>
            </section>

            <section className="members">
              <div>
                {members.map(
                  member => (
                    <span
                      key={member.id}
                    >
                      {member.email}
                      {' · '}
                      {member.role}
                    </span>
                  )
                )}
              </div>

              <form onSubmit={invite}>
                <input
                  type="email"
                  placeholder="Invite user by email"
                  value={inviteEmail}
                  onChange={e =>
                    setInviteEmail(
                      e.target.value
                    )
                  }
                />

                <button type="submit">
                  Invite
                </button>
              </form>
            </section>

            <section className="board">
              {columns.map(column => (
                <div
                  className="column"
                  key={column}
                >
                  <div className="column-head">
                    <h3>
                      {column}
                    </h3>

                    <span>
                      {grouped[column].length}
                    </span>
                  </div>

                  {grouped[column].map(
                    task => (
                      <article
                        className="task"
                        key={task.id}
                      >
                        <button
                          className="task-body"
                          onClick={() =>
                            setEditing(task)
                          }
                        >
                          <strong>
                            {task.title}
                          </strong>

                          <small>
                            {task.description ||
                              'No description'}
                          </small>

                          <div className="meta">
                            <span>
                              {task.priority}
                            </span>

                            {task.due_date && (
                              <span>
                                Due{' '}
                                {String(
                                  task.due_date
                                ).slice(
                                  0,
                                  10
                                )}
                              </span>
                            )}
                          </div>

                          {task.assignee_email && (
                            <em>
                              {
                                task.assignee_email
                              }
                            </em>
                          )}
                        </button>

                        <div className="move">
                          <button
                            onClick={() =>
                              move(
                                task,
                                -1
                              )
                            }
                            disabled={
                              column ===
                              columns[0]
                            }
                          >
                            ←
                          </button>

                          <button
                            onClick={() =>
                              move(
                                task,
                                1
                              )
                            }
                            disabled={
                              column ===
                              columns[
                                columns.length - 1
                              ]
                            }
                          >
                            →
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              ))}
            </section>
          </>
        ) : (
          <div className="empty">
            <h1>
              Create your first project
            </h1>

            <p>
              Enter a project name in
              the sidebar.
            </p>
          </div>
        )}
      </main>

      {editing !== undefined &&
        selected && (
          <TaskForm
            task={editing}
            members={members}
            onClose={() =>
              setEditing(undefined)
            }
            onSave={saveTask}
            onDelete={deleteTask}
          />
        )}
    </div>
  );
}