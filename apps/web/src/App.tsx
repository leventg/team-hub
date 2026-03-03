import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Chat } from './pages/Chat';
import { Decisions } from './pages/Decisions';
import { Tasks } from './pages/Tasks';
import { Layout } from './components/Layout';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f', color: '#e0e0e0' }}>
        Connecting...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div style={{ color: '#e0e0e0', background: '#0f0f0f', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Authentication required</div>;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:channelName" element={<Chat />} />
        <Route path="/decisions" element={<Decisions />} />
        <Route path="/tasks" element={<Tasks />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
