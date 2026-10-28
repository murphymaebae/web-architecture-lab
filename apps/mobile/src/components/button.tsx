import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';

export const Accent = '#2F7D4F'; // Trailhead green, same as the website

type Props = { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; variant?: 'solid' | 'outline' };

export function Button({ label, onPress, busy, disabled, variant = 'solid' }: Props) {
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        solid ? { backgroundColor: Accent } : { borderColor: Accent, borderWidth: 1.5 },
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      {busy ? <ActivityIndicator color={solid ? 'white' : Accent} /> : <Text style={[styles.label, { color: solid ? 'white' : Accent }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 999, paddingVertical: Spacing.two + 2, paddingHorizontal: Spacing.four, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
});
