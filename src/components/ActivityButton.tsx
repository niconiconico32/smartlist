import { colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit2, Play, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ActivityButtonProps {
  title: string;
  emoji: string;
  metric: string;
  color: string;
  iconColor?: string;
  action: 'add' | 'play';
  onPress?: () => void;
  onEditPress?: () => void;
  hasSubtasks?: boolean;
  completed?: boolean;
  index?: number;
}

const BORDER_COLORS = ['#FAB387', '#CBA6F7', '#A6E3A1']; // Peach, Lavender, Matcha

export function ActivityButton({ title, emoji, metric, color, iconColor, action, onPress, onEditPress, hasSubtasks = false, completed = false, index = 0 }: ActivityButtonProps) {
  const borderColor = BORDER_COLORS[index % 3];
  return (
    <Pressable
      style={({ pressed }) => [
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {completed ? (
        <LinearGradient
          colors={[color, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <View style={[styles.iconContainer, styles.iconContainerCompleted]}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <Text style={[styles.title, styles.titleCompleted]} numberOfLines={2}>{title}</Text>
            </View>

            <View style={styles.rightSection}>
              <Text style={[styles.metric, styles.metricCompleted]}>{metric}</Text>
              <View style={styles.actionButtonsContainer}>
                {hasSubtasks && onEditPress && (
                  <Pressable 
                    style={styles.actionButton}
                    onPress={onEditPress}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Edit2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </Pressable>
                )}
                <View style={styles.actionButton}>
                  {action === 'add' ? (
                    <Plus size={28} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <Play size={24} color="#FFFFFF" strokeWidth={3} fill="#FFFFFF" />
                  )}
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.container, styles.containerInactive, { borderColor: borderColor, borderWidth: 2 }]}>
          <View style={styles.content}>
            <View style={styles.leftSection}>
              <View style={[styles.iconContainer]}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{title}</Text>
            </View>

            <View style={styles.rightSection}>
              <View style={styles.actionButtonsContainer}>
                {hasSubtasks && onEditPress && (
                  <Pressable 
                    style={[styles.actionButton]}
                    onPress={onEditPress}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Edit2 size={18} color={color} strokeWidth={1.5} />
                  </Pressable>
                )}
                <View style={[styles.actionButton]}>
                  {action === 'add' ? (
                    <Plus size={28} color={color} strokeWidth={3} />
                  ) : (
                    <Play size={24} color={colors.primary} strokeWidth={3} fill={colors.primary} />
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    padding: 12,
    marginBottom: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  containerInactive: {
    backgroundColor: colors.surface,
    borderRadius: 33,
    padding: 3,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
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
    marginRight: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconContainerCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  titleCompleted: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  metric: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
  },
  metricCompleted: {
    color: '#FFFFFF',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
