import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import client from '../api/client';

type UserRole = 'student' | 'teacher';

type User = {
  id: string;
  name: string;
  role: UserRole;
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved token and user on startup
    const bootstrapAsync = async () => {
      try {
        let token = null;
        let userDataStr = null;
        
        if (Platform.OS === 'web') {
          token = localStorage.getItem('userToken');
          userDataStr = localStorage.getItem('userData');
        } else {
          token = await SecureStore.getItemAsync('userToken');
          userDataStr = await SecureStore.getItemAsync('userData');
        }
        
        if (token && userDataStr) {
          setUser(JSON.parse(userDataStr));
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const login = async (token: string, userData: User) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('userToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
    } else {
      await SecureStore.setItemAsync('userToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
    }
    setUser(userData);
  };

  const logout = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    } else {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
