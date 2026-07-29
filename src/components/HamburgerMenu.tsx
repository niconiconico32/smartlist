import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePurchases } from "@/src/contexts/PurchasesContext";
import { supabase } from "@/src/lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import {
    Bell,
    Crown,
    Gift,
    LogOut,
    Mail,
    Menu,
    RotateCcw,
    Shield,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    Linking as RNLinking,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useProStore } from "../store/proStore";
import { GoogleButton } from "./GoogleButton";
import { PaywallModal } from "./PaywallModal";
import { RedeemCodeModal } from "./RedeemCodeModal";

const CREAM = "#F5E6D3";
const CAFE = "#8B6F5E";

const hapticsLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
const hapticsMed = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
const hapticsHeavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

// ─── URLs ───────────────────────────────────────────────────────────────────
const PRIVACY_POLICY_URL = "https://brainyadhd.com/privacy.html";
const TERMS_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const CONTACT_EMAIL = "support@brainyadhd.com";
const MANAGE_SUBSCRIPTIONS_URL = Platform.select({
  ios: "https://apps.apple.com/account/subscriptions",
  default:
    "https://play.google.com/store/account/subscriptions?package=com.brainyahdh.app",
});

// ─── Row component ────────────────────────────────────────────────────────────
interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({
  icon,
  label,
  sublabel,
  onPress,
  destructive,
}) => (
  <Pressable
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    onPress={onPress}
  >
    <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
      {icon}
    </View>
    <View style={styles.rowText}>
      <Text
        style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}
      >
        {label}
      </Text>
      {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
    </View>
  </Pressable>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export function HamburgerMenu() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showRedeemCode, setShowRedeemCode] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { signOut, isAnonymous, signInWithOAuth, signInWithApple } = useAuth();
  const { isPro } = useProStore();
  const { restorePurchases } = usePurchases();

  const open = () => {
    hapticsLight();
    setVisible(true);
  };

  const close = () => setVisible(false);

  const openLink = useCallback(async (url: string) => {
    hapticsLight();
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn("Failed to open link:", e);
    }
    close();
  }, []);

  const handleNotifications = useCallback(async () => {
    hapticsLight();
    close();
    RNLinking.openSettings();
  }, []);

  const handleContact = useCallback(() => {
    hapticsLight();
    const subject = encodeURIComponent(t("menu.contact_subject"));
    const body = encodeURIComponent(t("menu.contact_body"));
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
    close();
  }, [t]);

  const handleAppleLink = useCallback(async () => {
    hapticsMed();
    close();
    await signInWithApple();
  }, [signInWithApple]);

  const handleGoogleLink = useCallback(async () => {
    hapticsMed();
    close();
    await signInWithOAuth("google", { forceDirectSignIn: true });
  }, [signInWithOAuth]);

  const handleDeleteAccount = useCallback(() => {
    hapticsHeavy();
    Alert.alert(
      t("menu.delete_confirm_title"),
      t("menu.delete_confirm_message"),
      [
        { text: t("menu.cancel"), style: "cancel" },
        {
          text: t("menu.delete"),
          style: "destructive",
          onPress: async () => {
            close();
            setIsDeleting(true);
            let accountDeleted = false;

            try {
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token;

              if (!token) throw new Error("No active session found");

              const { data, error } = await supabase.functions.invoke("delete-user", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (error) throw error;

              accountDeleted = true;
              await signOut();

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

            } catch (e: any) {
              console.error("Account deletion error:", e);

              if (accountDeleted) {
                await signOut();
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                Alert.alert(
                  t("menu.delete_error"),
                  e?.message || "Could not complete account deletion. Please try again.",
                );
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [signOut, t, close]);

  const handleRestorePurchases = useCallback(async () => {
    hapticsMed();
    close();
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert(t("menu.restored_title"), t("menu.restored_message"));
      } else {
        Alert.alert(
          t("menu.no_purchases_title"),
          t("menu.no_purchases_message"),
        );
      }
    } catch {
      Alert.alert(t("menu.delete_error"), t("menu.restore_error"));
    } finally {
      setIsRestoring(false);
    }
  }, [restorePurchases, t]);

  const handleSignOut = useCallback(async () => {
    hapticsMed();
    close();
    await signOut();
  }, [signOut]);

  return (
    <>
      {/* ─── Hamburger Button ─────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.hamburgerBtn,
          pressed && styles.hamburgerBtnPressed,
        ]}
        onPress={open}
        hitSlop={8}
      >
        <Menu size={22} color={colors.primary} strokeWidth={2.5} />
      </Pressable>

      {/* ─── Centered Modal ──────────────────────────────────────────── */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <Animated.View
            entering={FadeIn.duration(250)}
            style={styles.modal}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("menu.title")}</Text>
              <Pressable onPress={close} style={styles.closeBtn} hitSlop={8}>
                <X size={20} color={CAFE} />
              </Pressable>
            </View>

            {isAnonymous && (
              <View style={styles.promoActionContainer}>
                {Platform.OS === "ios" && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                    }
                    buttonStyle={
                      AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    }
                    cornerRadius={24}
                    style={{ width: "100%", height: 48, marginBottom: 10 }}
                    onPress={handleAppleLink}
                  />
                )}
                <GoogleButton
                  text={t("menu.continue_with_google")}
                  onPress={handleGoogleLink}
                  style={{ width: "100%", height: 48 }}
                />
              </View>
            )}

            {!isPro && (
              <Pressable
                style={styles.proUpsellButton}
                onPress={() => {
                  hapticsMed();
                  close();
                  setTimeout(() => setShowPaywall(true), 300);
                }}
              >
                <LinearGradient
                  colors={["#FCD34D", "#F59E0B", "#D97706"]}
                  style={styles.proUpsellGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Crown size={20} color="#1A1C20" strokeWidth={2.5} />
                  <Text style={styles.proUpsellText}>{t("menu.unlock_pro")}</Text>
                </LinearGradient>
              </Pressable>
            )}

            {(isAnonymous || !isPro) && <View style={{ height: 12 }} />}

            {/* Menu rows */}
            <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
              <MenuRow
                icon={<Bell size={18} color={CAFE} strokeWidth={2} />}
                label={t("menu.notifications")}
                sublabel={t("menu.notifications_sublabel")}
                onPress={handleNotifications}
              />

              <View style={styles.segmentedDivider} />

              <MenuRow
                icon={<Shield size={18} color={CAFE} strokeWidth={2} />}
                label={t("menu.manage_subscription")}
                sublabel={
                  Platform.OS === "ios"
                    ? t("menu.manage_subscription_ios")
                    : t("menu.manage_subscription_android")
                }
                onPress={() => openLink(MANAGE_SUBSCRIPTIONS_URL)}
              />

              <View style={styles.segmentedDivider} />

              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={handleRestorePurchases}
                disabled={isRestoring}
              >
                <View style={styles.rowIcon}>
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={CAFE} />
                  ) : (
                    <RotateCcw size={18} color={CAFE} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{t("menu.restore_purchases")}</Text>
                  <Text style={styles.rowSublabel}>
                    {t("menu.restore_purchases_sublabel")}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.segmentedDivider} />

              <MenuRow
                icon={<Mail size={18} color={CAFE} strokeWidth={2} />}
                label={t("menu.report_issue")}
                onPress={handleContact}
              />

              <View style={styles.segmentedDivider} />

              {Platform.OS !== "ios" && (
                <>
                  <MenuRow
                    icon={<Gift size={18} color={CAFE} strokeWidth={2} />}
                    label={t("menu.redeem_code")}
                    sublabel={t("menu.redeem_code_sublabel")}
                    onPress={() => {
                      hapticsLight();
                      close();
                      setTimeout(() => setShowRedeemCode(true), 300);
                    }}
                  />
                  <View style={styles.segmentedDivider} />
                </>
              )}

              <MenuRow
                icon={<LogOut size={18} color={CAFE} strokeWidth={2} />}
                label={t("menu.sign_out")}
                onPress={handleSignOut}
              />

              <View style={styles.segmentedDivider} />

              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                  isDeleting && { opacity: 0.5 },
                ]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                <View style={[styles.rowIcon, styles.rowIconDestructive]}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, styles.rowLabelDestructive]}>
                    {t("menu.delete_account")}
                  </Text>
                  <Text style={styles.rowSublabel}>
                    {isDeleting
                      ? t("menu.deleting")
                      : t("menu.delete_account_sublabel")}
                  </Text>
                </View>
              </Pressable>
            </ScrollView>

            {/* Footer: Privacy & Terms */}
            <View style={styles.footer}>
              <Pressable onPress={() => openLink(PRIVACY_POLICY_URL)} hitSlop={12}>
                <Text style={styles.footerLink}>
                  {t("menu.privacy_policy")}
                </Text>
              </Pressable>
              <Text style={styles.footerSep}>|</Text>
              <Pressable onPress={() => openLink(TERMS_URL)} hitSlop={12}>
                <Text style={styles.footerLink}>
                  {t("menu.terms")}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="hamburger_menu"
      />
      <RedeemCodeModal
        visible={showRedeemCode}
        onClose={() => setShowRedeemCode(false)}
      />
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
    alignItems: "center",
    justifyContent: "center",
  },
  hamburgerBtnPressed: {
    backgroundColor: `${colors.primary}30`,
    transform: [{ scale: 0.94 }],
  },

  // ── Backdrop ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Modal ──
  modal: {
    width: "85%",
    maxHeight: "90%",
    backgroundColor: CREAM,
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: CAFE,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Jersey10",
    fontSize: 28,
    color: CAFE,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Menu list ──
  menuList: {
  },

  // ── Row ──
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.65,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDestructive: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontFamily: "Jersey10",
    fontSize: 18,
    color: CAFE,
  },
  rowLabelDestructive: {
    color: "#EF4444",
  },
  rowSublabel: {
    fontFamily: "Jersey10",
    fontSize: 13,
    color: CAFE,
    opacity: 0.6,
  },

  // ── Segmented Divider ──
  segmentedDivider: {
    height: 1,
    marginVertical: 2,
    borderStyle: "dashed",
    borderTopWidth: 1,
    borderColor: CAFE,
    opacity: 0.35,
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 16,
    marginTop: 8,
  },
  footerLink: {
    fontFamily: "Jersey10",
    fontSize: 13,
    color: CAFE,
    opacity: 0.6,
  },
  footerSep: {
    fontFamily: "Jersey10",
    fontSize: 13,
    color: CAFE,
    opacity: 0.3,
  },

  // ── Promo Actions ──
  promoActionContainer: {
    marginBottom: 12,
  },
  proUpsellButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proUpsellGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  proUpsellText: {
    color: "#1A1C20",
    fontSize: 16,
    fontWeight: "800",
  },
});
