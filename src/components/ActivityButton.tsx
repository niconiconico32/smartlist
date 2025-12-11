import { Play, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ActivityButtonProps {
  title: string;
  emoji: string;
  metric: string;
  color: string;
  action: 'add' | 'play';
  onPress?: () => void;
  completed?: boolean;
}

export function ActivityButton({ title, emoji, metric, color, action, onPress, completed = false }: ActivityButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        completed ? { backgroundColor: color, borderColor: color } : { borderColor: color },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: completed ? 'rgba(255, 255, 255, 0.3)' : `${color}20` }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <Text style={[styles.title, completed && styles.titleCompleted]}>{title}</Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={[styles.metric, { color: completed ? '#FFFFFF' : color }]}>{metric}</Text>
          <View style={styles.actionButton}>
            {action === 'add' ? (
              <Plus size={28} color={completed ? '#FFFFFF' : color} strokeWidth={3} />
            ) : (
              <Play size={24} color={completed ? '#FFFFFF' : color} strokeWidth={3} fill={completed ? '#FFFFFF' : color} />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  titleCompleted: {
    color: '#FFFFFF',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metric: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
