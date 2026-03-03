export function Login() {
  // Login is handled by Keycloak redirect in AuthContext
  // This page is shown if auth fails
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Team Hub</h1>
        <p style={{ color: 'var(--text-muted)' }}>Redirecting to login...</p>
      </div>
    </div>
  );
}
