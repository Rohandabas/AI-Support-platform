import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User, Business } from '../types';
import { authApi } from '../services/api';

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; business: Business; accessToken: string; refreshToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'UPDATE_BUSINESS'; payload: Partial<Business> };

const initialState: AuthState = {
  user: null,
  business: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        business: action.payload.business,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : null };
    case 'UPDATE_BUSINESS':
      return { ...state, business: state.business ? { ...state.business, ...action.payload } : null };
    default:
      return state;
  }
};

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; businessName: string }) => Promise<void>;
  logout: () => void;
  updateBusiness: (data: Partial<Business>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (accessToken && refreshToken) {
        try {
          const response = await authApi.me();
          const { user, business } = response.data.data;
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, business, accessToken, refreshToken },
          });
        } catch {
          localStorage.clear();
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { user, business, accessToken, refreshToken } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, business, accessToken, refreshToken } });
  };

  const register = async (data: { name: string; email: string; password: string; businessName: string }) => {
    const response = await authApi.register(data);
    const { user, business, accessToken, refreshToken } = response.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, business, accessToken, refreshToken } });
  };

  const logout = () => {
    localStorage.clear();
    dispatch({ type: 'LOGOUT' });
  };

  const updateBusiness = (data: Partial<Business>) => {
    dispatch({ type: 'UPDATE_BUSINESS', payload: data });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateBusiness }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
