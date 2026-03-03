import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import { api } from '../services/api';

interface User {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  userType: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  keycloak: Keycloak | null;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  keycloak: null,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'logout'>>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    keycloak: null,
  });

  useEffect(() => {
    const kc = new Keycloak({
      url: 'http://localhost:8080',
      realm: 'team-hub',
      clientId: 'team-hub-web',
    });

    kc.init({ onLoad: 'login-required', checkLoginIframe: false })
      .then(async (authenticated) => {
        if (authenticated && kc.token) {
          api.setToken(kc.token);

          // Fetch user profile from our API
          try {
            const res = await api.get<User>('/users/me');
            setState({
              isAuthenticated: true,
              isLoading: false,
              user: res.data,
              token: kc.token,
              keycloak: kc,
            });
          } catch {
            // User might not exist in our DB yet — show basic info
            setState({
              isAuthenticated: true,
              isLoading: false,
              user: {
                id: kc.subject || '',
                displayName: kc.tokenParsed?.preferred_username || 'User',
                email: kc.tokenParsed?.email || null,
                role: 'JUNIOR',
                userType: 'HUMAN',
              },
              token: kc.token,
              keycloak: kc,
            });
          }

          // Token refresh
          setInterval(() => {
            kc.updateToken(30).then((refreshed) => {
              if (refreshed && kc.token) {
                api.setToken(kc.token);
              }
            });
          }, 60000);
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      })
      .catch(() => {
        setState((s) => ({ ...s, isLoading: false }));
      });
  }, []);

  const logout = () => {
    api.clearToken();
    state.keycloak?.logout();
  };

  return (
    <AuthContext.Provider value={{ ...state, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
