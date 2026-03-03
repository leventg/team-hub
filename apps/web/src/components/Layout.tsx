import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { CSSProperties } from 'react';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
  },
  sidebar: {
    width: 220,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    padding: '16px 16px 12px',
    borderBottom: '1px solid var(--border)',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  nav: {
    flex: 1,
    padding: '8px 0',
  },
  navLink: {
    display: 'block',
    padding: '8px 16px',
    color: 'var(--text-secondary)',
    borderRadius: 0,
    fontSize: 14,
    textDecoration: 'none',
  },
  navLinkActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    borderLeft: '2px solid var(--accent)',
  },
  presence: {
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  dot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    marginRight: 6,
  },
  userInfo: {
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    fontSize: 12,
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
};

export function Layout() {
  const { user, logout } = useAuth();
  const { isConnected, onlineUsers } = useSocket();

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>Team Hub</div>

        <nav style={styles.nav}>
          {[
            { to: '/chat', label: 'Chat' },
            { to: '/decisions', label: 'Decisions' },
            { to: '/tasks', label: 'Tasks' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.presence}>
          <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Online ({onlineUsers.length})
          </div>
          {onlineUsers.map((u) => (
            <div key={u.id} style={{ padding: '2px 0' }}>
              <span style={{ ...styles.dot, background: 'var(--success)' }} />
              {u.displayName}
            </div>
          ))}
        </div>

        <div style={styles.userInfo}>
          <div style={{ color: 'var(--text-primary)', marginBottom: 4 }}>
            {user?.displayName}
            <span style={{
              fontSize: 10,
              padding: '1px 5px',
              borderRadius: 3,
              marginLeft: 6,
              background: `var(--role-${user?.role?.toLowerCase()}, var(--accent))`,
              color: '#fff',
            }}>
              {user?.role}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...styles.dot, background: isConnected ? 'var(--success)' : 'var(--danger)' }} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            <button
              onClick={logout}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
