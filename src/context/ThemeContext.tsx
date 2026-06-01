import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'system';

export interface ThemeColors {
  bg: string;
  bg2: string;
  bgc: string;
  bgch: string;
  fg: string;
  fd: string;
  fdd: string;
  b: string;
  bd: string;
  pt: string;
  p: string;
  pm: string;
  pg: string;
  pg2: string;
  lt: string;
  gt: string;
  rt: string;
  nav: string;
  tks: string;
}

const lightColors: ThemeColors = {
  bg: '#F5F1FC',
  bg2: '#EDE8F5',
  bgc: 'rgba(255,255,255,0.8)',
  bgch: 'rgba(255,255,255,0.98)',
  fg: '#0C0C0C',
  fd: 'rgba(12,12,12,0.80)',
  fdd: 'rgba(12,12,12,0.60)',
  b: 'rgba(12,12,12,0.12)',
  bd: 'rgba(12,12,12,0.07)',
  pt: '#5d3a9b',
  p: '#7c3aed',
  pm: '#5d3a9b',
  pg: 'rgba(124,58,237,0.32)',
  pg2: 'rgba(93,58,155,0.18)',
  lt: '#6e8e00',
  gt: '#059669',
  rt: '#dc2626',
  nav: 'rgba(245,241,252,0.8)',
  tks: 'rgba(100,90,90,0.16)',
};

const darkColors: ThemeColors = {
  bg: '#05050a',
  bg2: '#0b0b14',
  bgc: 'rgba(255,255,255,0.03)',
  bgch: 'rgba(124,58,237,0.07)',
  fg: '#F0EBE0',
  fd: 'rgba(240,235,224,0.75)',
  fdd: 'rgba(240,235,224,0.55)',
  b: 'rgba(240,235,224,0.09)',
  bd: 'rgba(240,235,224,0.055)',
  pt: '#7c3aed',
  p: '#7c3aed',
  pm: '#5d3a9b',
  pg: 'rgba(124,58,237,0.32)',
  pg2: 'rgba(93,58,155,0.18)',
  lt: '#bde045',
  gt: '#34d399',
  rt: '#f87171',
  nav: 'rgba(5,5,10,0.25)',
  tks: 'rgba(240,235,224,0.18)',
};

interface ThemeContextData {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@theme').then((storedTheme: string | null) => {
      if (storedTheme) {
        setThemeState(storedTheme as ThemeType);
      }
      setIsLoaded(true);
    });
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('@theme', newTheme);
  };

  const isDark = theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
