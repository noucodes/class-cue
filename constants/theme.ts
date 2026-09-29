import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

const primary = { light: '#4F46E5', dark: '#A5B4FC' };

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: primary.light,
    primaryContainer: '#E0E7FF',
    onPrimaryContainer: '#1E1B4B',
    secondaryContainer: '#E0E7FF',
    onSecondaryContainer: '#1E1B4B',
    background: '#F7F7FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F1F5',
    elevation: { ...MD3LightTheme.colors.elevation, level1: '#FFFFFF', level2: '#F4F4F8', level3: '#EEEEF4' },
    error: '#DC2626',
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: primary.dark,
    onPrimary: '#1E1B4B',
    primaryContainer: '#312E81',
    onPrimaryContainer: '#E0E7FF',
    secondaryContainer: '#312E81',
    onSecondaryContainer: '#E0E7FF',
    background: '#0E0E12',
    surface: '#18181D',
    surfaceVariant: '#23232A',
    elevation: { ...MD3DarkTheme.colors.elevation, level1: '#18181D', level2: '#1E1E24', level3: '#24242B' },
    error: '#F87171',
  },
};

export function navigationTheme(paper: MD3Theme): Theme {
  const base = paper.dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: paper.colors.primary,
      background: paper.colors.background,
      card: paper.colors.surface,
      text: paper.colors.onSurface,
      border: paper.colors.outlineVariant,
    },
  };
}
