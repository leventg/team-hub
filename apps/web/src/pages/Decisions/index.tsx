import { useEffect, useState, CSSProperties, FormEvent } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Decision {
  id: string;
  title: string;
  description: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  proposer: { id: string; displayName: string } | null;
  votes: Array<{
    id: string;
    value: 'APPROVE' | 'REJECT' | 'ABSTAIN';
    comment: string | null;
    voter: { id: string; displayName: string } | null;
  }>;
  createdAt: string;
  resolvedAt: string | null;
}

export function Decisions() {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selected, setSelected] = useState<Decision | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [filter, setFilter] = useState<string>('');

  const fetchDecisions = async () => {
    const qs = filter ? `?status=${filter}` : '';
    const res = await api.get<Decision[]>(`/decisions${qs}`);
    setDecisions(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => { fetchDecisions(); }, [filter]);

  const handlePropose = async (e: FormEvent) => {
    e.preventDefault();
    // Use 'decisions' channel — find it from channels
    const chRes = await api.get<any[]>('/channels');
    const channels = Array.isArray(chRes.data) ? chRes.data : [];
    const decCh = channels.find((c: any) => c.name === 'decisions') || channels[0];
    if (!decCh) return;

    await api.post('/decisions', { ...form, channelId: decCh.id });
    setForm({ title: '', description: '' });
    setShowForm(false);
    fetchDecisions();
  };

  const handleVote = async (decisionId: string, value: string) => {
    await api.post(`/decisions/${decisionId}/vote`, { decisionId, value });
    fetchDecisions();
    if (selected?.id === decisionId) {
      const res = await api.get<Decision>(`/decisions/${decisionId}`);
      setSelected(res.data);
    }
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      PROPOSED: 'var(--warning)',
      APPROVED: 'var(--success)',
      REJECTED: 'var(--danger)',
      WITHDRAWN: 'var(--text-muted)',
    };
    return map[s] || 'var(--text-secondary)';
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Decisions</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={s.select}>
            <option value="">All</option>
            <option value="PROPOSED">Proposed</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button onClick={() => setShowForm(true)} style={s.btn}>+ Propose</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handlePropose} style={s.form}>
          <input
            placeholder="Decision title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            style={s.input}
            required
          />
          <textarea
            placeholder="Describe the decision..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            style={{ ...s.input, minHeight: 80, resize: 'vertical' as const }}
            required
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={s.btn}>Submit</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ ...s.btn, background: 'var(--bg-tertiary)' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={s.list}>
        {decisions.map((d) => {
          const approves = d.votes?.filter((v) => v.value === 'APPROVE').length || 0;
          const rejects = d.votes?.filter((v) => v.value === 'REJECT').length || 0;
          const myVote = d.votes?.find((v) => v.voter?.id === user?.id);

          return (
            <div key={d.id} style={s.card} onClick={() => setSelected(d)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{d.title}</span>
                <span style={{ fontSize: 11, color: statusColor(d.status), fontWeight: 600 }}>{d.status}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                by {d.proposer?.displayName || 'Unknown'} — {new Date(d.createdAt).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <span style={{ color: 'var(--success)' }}>+{approves}</span>
                <span style={{ color: 'var(--danger)' }}>-{rejects}</span>
                {d.status === 'PROPOSED' && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {(['APPROVE', 'REJECT', 'ABSTAIN'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={(e) => { e.stopPropagation(); handleVote(d.id, v); }}
                        style={{
                          ...s.voteBtn,
                          ...(myVote?.value === v ? { background: statusColor(v === 'APPROVE' ? 'APPROVED' : v === 'REJECT' ? 'REJECTED' : 'WITHDRAWN'), color: '#fff' } : {}),
                        }}
                      >
                        {v === 'APPROVE' ? 'Approve' : v === 'REJECT' ? 'Reject' : 'Abstain'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {decisions.length === 0 && <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>No decisions yet</div>}
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  container: { padding: 24, maxWidth: 800, height: '100%', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    padding: '12px 16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
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
  voteBtn: {
    padding: '3px 8px',
    border: '1px solid var(--border)',
    borderRadius: 4,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    fontSize: 11,
  },
};
