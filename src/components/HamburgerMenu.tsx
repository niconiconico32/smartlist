import { colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { usePurchases } from '@/src/contexts/PurchasesContext';
import { supabase } from '@/src/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleButton } from './GoogleButton';
import { useProStore } from '../store/proStore';
import { PaywallModal } from './PaywallModal';
import {
  Bell,
  ExternalLink,
  LogOut,
  Mail,
  Menu,
  RotateCcw,
  Shield,
  Trash2,
  Crown,
  X,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, Linking as RNLinking, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
  FadeOut,
  SlideOutDown,
} from 'react-native-reanimated';

// ─── URLs ───────────────────────────────────────────────────────────────────
const PRIVACY_POLICY_URL = 'https://suggestions-brainyapp.vercel.app'; // TODO: replace with real URL
const TERMS_URL = 'https://suggestions-brainyapp.vercel.app'; // TODO: replace with real URL
const CONTACT_EMAIL = 'smartlist.app.dev@gmail.com'; // TODO: replace with real email
const MANAGE_SUBSCRIPTIONS_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions?package=com.brainyahdh.app',
});

// ─── Row component ────────────────────────────────────────────────────────────
interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon, label, sublabel, onPress, destructive }) => (
  <Pressable
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    onPress={onPress}
  >
    <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>{icon}</View>
    <View style={styles.rowText}>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
    </View>
    <ExternalLink size={14} color={destructive ? '#EF4444' : colors.textSecondary} opacity={0.6} />
  </Pressable>
);

const Divider = () => <View style={styles.divider} />;

// ─── Main Component ───────────────────────────────────────────────────────────
export function HamburgerMenu() {
  const [visible, setVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { signOut, isAnonymous, signInWithOAuth } = useAuth();
  const { isPro } = useProStore();
  const { restorePurchases } = usePurchases();
  const router = useRouter();

  const open = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(true);
  };

  const close = () => setVisible(false);

  const openLink = useCallback((url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
    close();
  }, []);

  const handleNotifications = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    close();
    // On Android, opening app settings lets the user toggle notification permission
    RNLinking.openSettings();
  }, []);

  const handleContact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subject = encodeURIComponent('Soporte Brainy');
    const body = encodeURIComponent('Hola equipo Brainy,\n\n');
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
    close();
  }, []);

  const handleGoogleLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close();
    await signInWithOAuth('google');
  }, [signInWithOAuth]);

  const handleDeleteAccount = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente. Se eliminarán todos tus datos (tareas, rutinas, logros y suscripción). ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call the delete-user Edge Function (uses service_role key server-side)
              const { error } = await supabase.functions.invoke('delete-user');
              if (error) throw error;
              await signOut();
              close();
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.message || 'No se pudo eliminar la cuenta. Contactá a soporte.',
              );
            }
          },
        },
      ],
    );
  }, [signOut]);

  const handleRestorePurchases = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('¡Listo!', 'Tu suscripción Pro ha sido restaurada correctamente.');
      } else {
        Alert.alert(
          'Sin compras previas',
          'No se encontraron suscripciones asociadas a tu cuenta.',
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudieron restaurar las compras. Intenta de nuevo.');
    } finally {
      setIsRestoring(false);
    }
  }, [restorePurchases]);

  const handleSignOut = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close();
    await signOut();
  }, [signOut]);

  return (
    <>
      {/* ─── Hamburger Button ─────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.hamburgerBtn, pressed && styles.hamburgerBtnPressed]}
        onPress={open}
        hitSlop={8}
      >
        <Menu size={22} color={colors.primary} strokeWidth={2.5} />
      </Pressable>

      {/* ─── Bottom Sheet Modal ───────────────────────────────────────── */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        {/* Backdrop */}
        <Animated.View
          exiting={FadeOut.duration(200)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          exiting={SlideOutDown.duration(250)}
          style={styles.sheet}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Menú</Text>
            <Pressable onPress={close} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ── Promo Actions ── */}
          {isAnonymous && (
            <View style={styles.promoActionContainer}>
              <GoogleButton
                text="Continuar con Google"
                onPress={handleGoogleLink}
                style={{ width: '100%', height: 48 }}
              />
            </View>
          )}

          {!isPro && (
             <Pressable
                style={styles.proUpsellButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  close();
                  setTimeout(() => setShowPaywall(true), 300); // let sheet close first
                }}
             >
                <LinearGradient
                  colors={['#FCD34D', '#F59E0B', '#D97706']}
                  style={styles.proUpsellGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Crown size={20} color="#1A1C20" strokeWidth={2.5} />
                  <Text style={styles.proUpsellText}>Desbloquea Pro</Text>
                </LinearGradient>
             </Pressable>
          )}

          {(isAnonymous || !isPro) && <View style={{ height: 16 }} />}

          {/* ── Rows ── */}
          <MenuRow
            icon={<Bell size={18} color={colors.primary} strokeWidth={2} />}
            label="Notificaciones"
            sublabel="Gestionar permisos de notificación"
            onPress={handleNotifications}
          />

          <Divider />

          <MenuRow
            icon={<Shield size={18} color="#38BDF8" strokeWidth={2} />}
            label="Gestionar suscripción"
            sublabel={Platform.OS === 'ios' ? 'Cancelar o modificar en App Store' : 'Cancelar o modificar en Google Play'}
            onPress={() => openLink(MANAGE_SUBSCRIPTIONS_URL)}
          />

          <Divider />

          {/* Restore Purchases — mandatory for Apple App Review */}
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleRestorePurchases}
            disabled={isRestoring}
          >
            <View style={styles.rowIcon}>
              {isRestoring ? (
                <ActivityIndicator size="small" color="#A78BFA" />
              ) : (
                <RotateCcw size={18} color="#A78BFA" strokeWidth={2} />
              )}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Restaurar compras</Text>
              <Text style={styles.rowSublabel}>Recupera tu suscripción en este dispositivo</Text>
            </View>
          </Pressable>

          <Divider />

          <MenuRow
            icon={<ExternalLink size={18} color={colors.textSecondary} strokeWidth={2} />}
            label="Política de privacidad"
            onPress={() => openLink(PRIVACY_POLICY_URL)}
          />

          <MenuRow
            icon={<ExternalLink size={18} color={colors.textSecondary} strokeWidth={2} />}
            label="Términos de uso"
            onPress={() => openLink(TERMS_URL)}
          />

          <Divider />

          <MenuRow
            icon={<Mail size={18} color={colors.textSecondary} strokeWidth={2} />}
            label="Reportar problema"
            onPress={handleContact}
          />

          <Divider />

          <MenuRow
            icon={<LogOut size={18} color={colors.textSecondary} strokeWidth={2} />}
            label="Cerrar sesión"
            onPress={handleSignOut}
          />

          <Divider />

          <MenuRow
            icon={<Trash2 size={18} color="#EF4444" strokeWidth={2} />}
            label="Eliminar cuenta"
            sublabel="Esta acción es permanente e irreversible"
            onPress={handleDeleteAccount}
            destructive
          />

          {/* Safe area bottom padding */}
          <View style={styles.bottomSafeArea} />
        </Animated.View>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Trigger button ──
  hamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerBtnPressed: {
    backgroundColor: `${colors.primary}30`,
    transform: [{ scale: 0.94 }],
  },

  // ── Backdrop ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  // ── Sheet ──
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#16182A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  rowPressed: {
    opacity: 0.65,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDestructive: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowLabelDestructive: {
    color: '#EF4444',
  },
  rowSublabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: -4,
  },

  // ── Bottom safe area ──
  bottomSafeArea: {
    height: 32,
  },

  // ── Promo Actions ──
  promoActionContainer: {
    marginBottom: 12,
  },
  proUpsellButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proUpsellGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proUpsellText: {
    color: '#1A1C20',
    fontSize: 16,
    fontWeight: '800',
  },
});
