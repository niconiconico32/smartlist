import { colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const { signInWithOAuth, signInAnonymously, isLoading, isAnonymous, session } = useAuth();
  const router = useRouter();

  // If user is already anonymous, they're here to upgrade — not to start fresh
  const isUpgrading = !!session && isAnonymous;

  const handleGoogleSignIn = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signInWithOAuth('google');
  }, [signInWithOAuth]);

  const handleAppleSignIn = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signInWithOAuth('apple');
  }, [signInWithOAuth]);

  const handleSkip = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signInAnonymously();
  }, [signInAnonymously]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* ── Back button (when upgrading) ─────────────────────── */}
        {isUpgrading && (
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </Pressable>
        )}

        {/* ── Hero ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.heroSection}
        >
          <Image
            source={require('../assets/images/logomain.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Brainy</Text>
          <Text style={styles.subtitle}>
            {isUpgrading
              ? `Conecta tu cuenta para guardar\ntu progreso de forma segura`
              : `Tu compañero diario para\nvencer la parálisis por análisis`}
          </Text>
        </Animated.View>

        {/* ── Buttons ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.buttonsSection}
        >
          {/* Google */}
          <Pressable
            style={({ pressed }) => [
              styles.oauthButton,
              styles.googleButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </Pressable>

          {/* Apple — only on iOS */}
          {Platform.OS === 'ios' && (
            <Pressable
              style={({ pressed }) => [
                styles.oauthButton,
                styles.appleButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.appleIcon}></Text>
              <Text style={styles.appleButtonText}>Continuar con Apple</Text>
            </Pressable>
          )}

          {/* Divider */}
          {!isUpgrading && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Skip (anonymous) — hide when upgrading */}
          {!isUpgrading && (
            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#ECF230', '#F2E852']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.skipButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.skipButtonText}>Empezar sin cuenta</Text>
                )}
              </LinearGradient>
            </Pressable>
          )}

          <Text style={styles.disclaimer}>
            Al continuar, aceptas nuestros Términos de Servicio{'\n'}y Política de Privacidad.
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
  },

  // Hero
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },

  // Buttons
  buttonsSection: {
    gap: 12,
    paddingBottom: 8,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E2E',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    opacity: 0.6,
  },

  // Skip
  skipButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  skipButtonGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.5,
    marginTop: 4,
  },
});
