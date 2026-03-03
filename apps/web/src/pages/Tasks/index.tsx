import { useEffect, useState, CSSProperties, FormEvent } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { id: string; displayName: string } | null;
  reporter: { id: string; displayName: string } | null;
  createdAt: string;
}

const COLUMNS = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;

const COLUMN_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--danger)',
  HIGH: 'var(--warning)',
  MEDIUM: 'var(--accent)',
  LOW: 'var(--text-muted)',
};

export function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM' });

  const fetchTasks = async () => {
    const res = await api.get<TaskItem[]>('/tasks');
    setTasks(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/tasks', form);
    setForm({ title: '', description: '', priority: 'MEDIUM' });
    setShowForm(false);
    fetchTasks();
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await api.patch(`/tasks/${taskId}`, { status: newStatus });
    fetchTasks();
  };

  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = tasks.filter((t) => t.status === col);
      return acc;
    },
    {} as Record<string, TaskItem[]>,
  );

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Tasks</h2>
        <button onClick={() => setShowForm(true)} style={s.btn}>+ New Task</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={s.form}>
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            style={s.input}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            style={{ ...s.input, minHeight: 60, resize: 'vertical' as const }}
          />
          <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} style={s.select}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={s.btn}>Create</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ ...s.btn, background: 'var(--bg-tertiary)' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={s.board}>
        {COLUMNS.map((col) => (
          <div key={col} style={s.column}>
            <div style={s.colHeader}>
              <span>{COLUMN_LABELS[col]}</span>
              <span style={s.colCount}>{grouped[col]?.length || 0}</span>
            </div>
            <div style={s.colBody}>
              {grouped[col]?.map((task) => (
                <div key={task.id} style={s.taskCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</span>
                    <span style={{
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 3,
                      background: PRIORITY_COLORS[task.priority],
                      color: '#fff',
                      fontWeight: 700,
                    }}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{task.assignee?.displayName || 'Unassigned'}</span>
                    <select
                      value={task.status}
                      onChange={(e) => moveTask(task.id, e.target.value)}
                      style={{ ...s.select, fontSize: 10, padding: '2px 4px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c} value={c}>{COLUMN_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 16px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 },
  title: { fontSize: 20, fontWeight: 700 },
  board: {
    display: 'flex',
    gap: 12,
    flex: 1,
    overflowX: 'auto',
    paddingBottom: 16,
  },
  column: {
    minWidth: 220,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '1px solid var(--border)',
  },
  colHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-secondary)',
  },
  colCount: {
    background: 'var(--bg-tertiary)',
    padding: '1px 6px',
    borderRadius: 10,
    fontSize: 11,
  },
  colBody: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  taskCard: {
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    borderRadius: 6,
    border: '1px solid var(--border)',
  },
  form: {
    padding: 16,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0,
  },
  input: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  },
  btn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
  },
  select: {
    padding: '6px 10px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
};
