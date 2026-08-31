import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palette, type Colors } from './tokens';

export * from './tokens';

type Scheme = 'light' | 'dark';
type Pref = Scheme | 'system';

type ThemeValue = { c: Colors; scheme: Scheme; pref: Pref; setPref: (p: Pref) => void };

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() ?? 'light';
  const [pref, setPref] = useState<Pref>('system');
  const scheme: Scheme = pref === 'system' ? (system as Scheme) : pref;
  const value = useMemo(
    () => ({ c: palette[scheme] as Colors, scheme, pref, setPref }),
    [scheme, pref],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}

export function useColors(): Colors {
  return useTheme().c;
}
