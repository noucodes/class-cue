import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EVENT_TYPES, PRIORITIES, type IconName } from '@/constants';
import type { EventType, Priority } from '@/types';

export const TypeIcon = memo(function TypeIcon({ type, size = 36, color }: { type: EventType; size?: number; color?: string }) {
  const meta = EVENT_TYPES[type];
  const tint = color ?? meta.color;
  return (
    <View style={[styles.typeIcon, { width: size, height: size, borderRadius: size / 3, backgroundColor: `${tint}1F` }]}>
      <MaterialCommunityIcons name={meta.icon} size={size * 0.55} color={tint} />
    </View>
  );
});

export function PriorityTag({ priority }: { priority: Priority }) {
  const meta = PRIORITIES[priority];
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={meta.icon} size={14} color={meta.color} />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {meta.label}
      </Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <Surface elevation={1} style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      {children}
    </Surface>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 0.8 }}>
        {children.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <MaterialCommunityIcons name={icon} size={48} color={theme.colors.outline} />
      <Text variant="titleMedium" style={styles.center}>
        {title}
      </Text>
      {message && (
        <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button mode="contained-tonal" icon="plus" onPress={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

export function InfoLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { gap: 10, paddingVertical: 6 }]}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyLarge" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  typeIcon: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { borderRadius: 16, padding: 16 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
  center: { textAlign: 'center' },
  screen: { padding: 16, paddingBottom: 120 },
});
