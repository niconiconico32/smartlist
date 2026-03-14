import { PRIMARY_GRADIENT_COLORS, primaryButtonGradient, primaryButtonStyles, primaryButtonText } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// ============================================
// PLAN SELECTOR SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

interface Plan {
  id: string;
  label: string;
  price: string;
  period: string;
  trialLabel?: string;
  badge?: string;
  badgeColor?: string;
  members?: string;
}

const PLANS: Plan[] = [
  
  {
    id: 'monthly',
    label: 'Mensual',
    price: '$3.99',
    period: '/mes',
    badge: 'MÁS     POPULAR',
    badgeColor: colors.success,
    trialLabel: '14 DÍAS DE PRUEBA GRATIS',
  },
  {
    id: 'annual',
    label: 'Anual',
    price: '$39.99',
    period: '/año',
    trialLabel: '14 DÍAS DE PRUEBA GRATIS',
  },
];

const PlanSelectorSlide: React.FC<Props> = ({ onNext }) => {
  const [selectedPlan, setSelectedPlan] = useState('individual');

  const handleSelect = (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.header}>
        <Text style={s.title}>Elige tu plan</Text>
      </Animated.View>

      {/* Plans */}
      <View style={s.planList}>
        {PLANS.map((plan, idx) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <Animated.View
              key={plan.id}
              entering={FadeInDown.delay(200 + idx * 120).duration(400)}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelect(plan.id)}
                style={[s.planCard, isSelected && s.planCardSelected]}
              >
                {/* Badge */}
                {plan.badge && (
                  <View style={[s.badge, { backgroundColor: plan.badgeColor || colors.accent }]}>
                    <Text style={s.badgeText}>{plan.badge}</Text>
                  </View>
                )}

                {/* Selection indicator */}
                <View style={[s.radio, isSelected && s.radioActive]}>
                  {isSelected && <View style={s.radioInner} />}
                </View>

                {/* Content */}
                <View style={s.planContent}>
                  <Text style={[s.planLabel, isSelected && s.planLabelActive]}>{plan.label}</Text>
                  {plan.members && (
                    <Text style={s.planMembers}>{plan.members}</Text>
                  )}
                  {plan.trialLabel && (
                    <Text style={s.trialLabel}>{plan.trialLabel}</Text>
                  )}
                </View>

                {/* Price */}
                <View style={s.priceArea}>
                  <Text style={[s.price, isSelected && s.priceActive]}>{plan.price}</Text>
                  <Text style={s.period}>{plan.period}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* CTA */}
      <Animated.View entering={FadeInUp.delay(600).duration(400)} style={s.ctaArea}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[primaryButtonGradient, primaryButtonStyles]}
          >
            <Text style={primaryButtonText}>Iniciar mis 14 días de prueba</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.cancelText}>Cancela cuando quieras en la App Store</Text>
      </Animated.View>
    </View>
  );
};

export default PlanSelectorSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ── Header ──
  header: {
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  // ── Plan list ──
  planList: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.surface}80`,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: `${colors.textPrimary}20`,
    paddingVertical: 18,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'visible',
  },
  planCardSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.surface}CC`,
  },
  // ── Badge ──
  badge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -50,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.background,
    letterSpacing: 0.5,
  },
  // ── Radio ──
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: `${colors.textPrimary}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  // ── Plan content ──
  planContent: {
    flex: 1,
  },
  planLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  planLabelActive: {
    color: colors.textPrimary,
  },
  planMembers: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  trialLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 0.3,
  },
  // ── Price ──
  priceArea: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  priceActive: {
    color: colors.accent,
  },
  period: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: -2,
  },
  // ── CTA ──
  ctaArea: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  cancelText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});
