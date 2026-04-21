import { colors } from "@/constants/theme";
import { Achievement, AchievementCard } from "@/src/components/AchievementCard";
import { AppText as Text } from "@/src/components/AppText";
import { CoinsCounter } from "@/src/components/CoinsCounter";
import { DailyStreakScreen } from "@/src/components/DailyStreakScreen";
import { PaywallModal } from "@/src/components/PaywallModal";
import { ProTrialOfferModal } from "@/src/components/ProTrialOfferModal";
import { ReviewRequestModal } from "@/src/components/ReviewRequestModal";
import { posthog } from "@/src/config/posthog";
import {
    ACHIEVEMENT_DEFINITIONS,
    useAchievementsStore,
} from "@/src/store/achievementsStore";
import { useAppStreakStore } from "@/src/store/appStreakStore";
import { useProStore } from "@/src/store/proStore";
import {
    renderRoutinesWidget,
    WIDGET_BG_ID_KEY,
    WIDGET_BG_MODE_KEY,
    WIDGET_OUTFIT_ID_KEY,
} from "@/src/widgets/widgetTaskHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import {
    Calendar,
    ChevronLeft,
    Crown,
    Flame,
    Lock,
    Store,
    Trophy,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_PADDING = 24;
const GRID_GAP = 12;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2) / NUM_COLUMNS - GRID_GAP;

// Prices
const BG_PRICE = 500;
const OUTFIT_PRICE = 650;

// Shop items from assets
const SHOP_ITEMS = [
  // Backgrounds (PNG - originales)
  {
    id: "bg_spring",
    name: "Primavera",
    price: BG_PRICE,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/spring.png"),
  },
  {
    id: "bg_beach",
    name: "Playa",
    price: BG_PRICE,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/beach.png"),
  },
  {
    id: "bg_autumn",
    name: "Otoño",
    price: BG_PRICE,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/autumm.png"),
  },
  {
    id: "bg_winter",
    name: "Invierno",
    price: BG_PRICE,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/winter.png"),
  },
  {
    id: "bg_woods",
    name: "Bosque",
    price: BG_PRICE,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/woods.png"),
  },
  // Backgrounds (WEBP - nuevos)
  {
    id: "bg_w1",
    name: "Fondo 1",
    price: 1250,
    isPro: true,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/1.webp"),
  },
  {
    id: "bg_w2",
    name: "Fondo 2",
    price: 1250,
    isPro: true,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/2.webp"),
  },
  {
    id: "bg_w3",
    name: "Fondo 3",
    price: 1250,
    isPro: true,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/3.webp"),
  },
  {
    id: "bg_w4",
    name: "Fondo 4",
    price: 1250,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/4.webp"),
  },
  {
    id: "bg_w5",
    name: "Fondo 5",
    price: 1250,
    isPro: true,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/5.webp"),
  },
  {
    id: "bg_w6",
    name: "Fondo 6",
    price: 1250,
    isPro: true,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/6.webp"),
  },
  {
    id: "bg_w7",
    name: "Fondo 7",
    price: 1250,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/7.webp"),
  },
  {
    id: "bg_w8",
    name: "Fondo 8",
    price: 1250,
    isPro: true,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/8.webp"),
  },
  {
    id: "bg_w9",
    name: "Fondo 9",
    price: 1650,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/9.webp"),
  },
  {
    id: "bg_w10",
    name: "Fondo 10",
    price: 1650,
    isPro: true,
    type: "background" as const,
    image: require("@/assets/images/pixelbgs/10.webp"),
  },
  // Outfits (PNG - originales)
  {
    id: "outfit_1_1",
    name: "Outfit 1",
    price: OUTFIT_PRICE,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/1_1.png"),
  },
  {
    id: "outfit_1_2",
    name: "Outfit 2",
    price: OUTFIT_PRICE,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/1_2.png"),
  },
  {
    id: "outfit_1_3",
    name: "Outfit 3",
    price: OUTFIT_PRICE,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/1_3.png"),
  },
  {
    id: "outfit_1_4",
    name: "Outfit 4",
    price: OUTFIT_PRICE,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/1_4.png"),
  },
  // Outfits (WEBP - nuevos)
  {
    id: "outfit_w5",
    name: "Outfit 5",
    price: 1600,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/5.webp"),
  },
  {
    id: "outfit_w6",
    name: "Outfit 6",
    price: 1750,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/6.webp"),
  },
  {
    id: "outfit_w7",
    name: "Outfit 7",
    price: 1900,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/7.webp"),
  },
  {
    id: "outfit_w8",
    name: "Outfit 8",
    price: 1750,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/8.webp"),
  },
  {
    id: "outfit_w9",
    name: "Outfit 9",
    price: 1750,
    isPro: true,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/9.webp"),
  },
  {
    id: "outfit_w10",
    name: "Outfit 10",
    price: 1750,
    isPro: true,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/10.webp"),
  },
  {
    id: "outfit_w11",
    name: "Outfit 11",
    price: 1750,
    isPro: true,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/11.webp"),
  },
  {
    id: "outfit_w12",
    name: "Outfit 12",
    price: 2200,
    isPro: true,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/12.webp"),
  },
  {
    id: "outfit_w13",
    name: "Outfit 13",
    price: 1750,
    isPro: true,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/13.webp"),
  },
  {
    id: "outfit_w14",
    name: "Outfit 14",
    price: 1750,
    isPro: true,
    type: "outfit" as const,
    image: require("@/assets/images/outfits/14.webp"),
  },
];

type ShopItem = (typeof SHOP_ITEMS)[number];
type TabType = "logros" | "tienda";

export default function AchievementsScreen() {
  const {
    achievements,
    loadAchievements,
    totalCoins,
    purchasedBackgrounds,
    purchasedOutfits,
    activeBackground,
    activeOutfit,
    spendCoins,
    onPurchaseMade,
    setActiveBackground,
    setActiveOutfit,
  } = useAchievementsStore();
  const { streak: appStreak, getMultiplier } = useAppStreakStore();
  const { isPro } = useProStore();
  const [activeTab, setActiveTab] = useState<TabType>("logros");
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTrialOffer, setShowTrialOffer] = useState(false);
  const [showStreakDev, setShowStreakDev] = useState(false);
  const [showReviewDev, setShowReviewDev] = useState(false);

  useEffect(() => {
    void loadAchievements();
  }, []);

  const handleTabPress = (tab: TabType) => {
    if (tab === activeTab) return;
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
  };

  const isOwned = (item: ShopItem) => {
    if (item.type === "background")
      return purchasedBackgrounds.includes(item.id);
    return purchasedOutfits.includes(item.id);
  };

  const isActive = (item: ShopItem) => {
    if (item.type === "background") return activeBackground === item.id;
    return activeOutfit === item.id;
  };

  const handleItemPress = (item: ShopItem) => {
    if (isOwned(item)) return; // owned items use the "Aplicar" button

    // Pro-exclusive gate: non-pro users see the paywall
    if (item.isPro && !isPro) {
      posthog.capture("shop_pro_item_tapped", {
        item_type: item.type,
        item_id: item.id,
        is_pro: false,
      });
      setShowPaywall(true);
      return;
    }

    if (totalCoins < item.price) {
      Alert.alert(
        "Coronas insuficientes",
        `Necesitas ${item.price - totalCoins} coronas más para comprar "${item.name}".`,
      );
      return;
    }
    setConfirmItem(item);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmItem) return;
    // Safety: block pro-only items for non-pro users
    if (confirmItem.isPro && !isPro) {
      setConfirmItem(null);
      setShowPaywall(true);
      return;
    }
    // Atomic: deduct coins + register item in a single persist
    const success = await spendCoins(confirmItem.price, {
      type: confirmItem.type,
      itemId: confirmItem.id,
    });
    if (success) {
      // Fire achievement checks (item already saved by spendCoins)
      await onPurchaseMade(confirmItem.type, confirmItem.id);
      posthog.capture("shop_item_purchased", {
        item_type: confirmItem.type,
        item_id: confirmItem.id,
        item_name: confirmItem.name,
        price: confirmItem.price,
        is_pro_item: !!confirmItem.isPro,
        coins_after: totalCoins - confirmItem.price,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setConfirmItem(null);
  };

  const handleApply = async (item: ShopItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (item.type === "background") {
      // Toggle: if already active, deactivate
      const isDeactivatingBg = activeBackground === item.id;
      if (isDeactivatingBg) {
        await setActiveBackground(null);
      } else {
        await setActiveBackground(item.id);
      }

      // Sync background to Android widget immediately (two.tsx may be unmounted)
      if (Platform.OS === "android") {
        try {
          await AsyncStorage.setItem(
            WIDGET_BG_ID_KEY,
            isDeactivatingBg ? "" : item.id,
          );
          await AsyncStorage.setItem(WIDGET_BG_MODE_KEY, "user");
          requestWidgetUpdate({
            widgetName: "RoutinesWidget",
            renderWidget: renderRoutinesWidget,
          });
        } catch (e) {
          console.warn("Widget: could not sync background change", e);
        }
      }
    } else {
      const isDeactivating = activeOutfit === item.id;
      if (isDeactivating) {
        await setActiveOutfit(null);
      } else {
        await setActiveOutfit(item.id);
      }

      // Sync outfit to Android widget immediately (two.tsx may be unmounted)
      if (Platform.OS === "android") {
        try {
          await AsyncStorage.setItem(
            WIDGET_OUTFIT_ID_KEY,
            isDeactivating ? "" : item.id,
          );
          requestWidgetUpdate({
            widgetName: "RoutinesWidget",
            renderWidget: renderRoutinesWidget,
          });
        } catch (e) {
          console.warn("Widget: could not sync outfit change", e);
        }
      }
    }
  };

  // Convert store achievements to display format
  const achievementsList: Achievement[] = Object.values(
    ACHIEVEMENT_DEFINITIONS,
  ).map((def) => {
    const progress = achievements[def.id];
    return {
      id: def.id,
      title: def.title,
      icon: def.icon,
      gradient: def.gradient,
      progress: progress?.progress || 0,
      total: def.total,
      completed: progress?.completed || false,
      coins: def.coins,
    };
  });

  const renderShopItem = ({ item }: { item: ShopItem }) => {
    const owned = isOwned(item);
    const active = isActive(item);
    const canAfford = totalCoins >= item.price;
    const isOutfit = item.type === "outfit";
    const proExclusive = !!item.isPro;
    // Non-pro users can't buy pro items (but can still use already-owned ones)
    const proLocked = proExclusive && !isPro && !owned;

    return (
      <View key={item.id} style={styles.shopItemCard}>
        <View
          style={[
            styles.shopImageContainer,
            active && styles.shopImageContainerActive,
          ]}
        >
          <Image
            source={item.image}
            style={
              item.type === "outfit" ? styles.shopOutfitImage : styles.shopImage
            }
            resizeMode={item.type === "outfit" ? "contain" : "cover"}
          />
          {/* Pro badge – always visible on pro-exclusive items */}
          {proExclusive && (
            <View style={styles.proBadge}>
              <Crown
                size={12}
                color="#FFD700"
                fill="#FFD700"
                strokeWidth={2.5}
              />
            </View>
          )}
        </View>

        <View style={styles.shopItemDetails}>
          {!owned ? (
            proLocked ? (
              /* Non-pro: show PRO lock button */
              <Pressable
                style={[styles.actionButton, styles.proLockedButton]}
                onPress={() => handleItemPress(item)}
              >
                <Crown
                  size={14}
                  color="#FFD700"
                  fill="#FFD700"
                  strokeWidth={2.5}
                />
                <Text style={styles.proLockedButtonText}>PRO</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.actionButton,
                  totalCoins >= item.price
                    ? styles.buyButtonAffordable
                    : styles.buyButtonLocked,
                ]}
                onPress={() => handleItemPress(item)}
                disabled={totalCoins < item.price}
              >
                {totalCoins < item.price ? (
                  <Lock size={14} color="#9CA3AF" strokeWidth={2.5} />
                ) : (
                  <Crown size={14} color="#FFFFFF" strokeWidth={2.5} />
                )}
                <Text
                  style={[
                    styles.actionButtonText,
                    totalCoins >= item.price
                      ? styles.buyButtonTextAffordable
                      : styles.buyButtonTextLocked,
                  ]}
                >
                  {item.price}
                </Text>
              </Pressable>
            )
          ) : (
            <Pressable
              style={[
                styles.actionButton,
                active ? styles.applyButtonActive : styles.applyButton,
              ]}
              onPress={() => handleApply(item)}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  active
                    ? styles.applyButtonTextActive
                    : styles.applyButtonText,
                ]}
              >
                {active ? "Equipado" : "Equipar"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#111827" strokeWidth={2.5} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={styles.crownsPill}>
          <Crown size={20} color={colors.surface} strokeWidth={2.5} />
          <CoinsCounter coins={totalCoins} size="special" color="#1A1C20" />
        </View>
      </View>

      {/* Debug: Test Buttons (solo en desarrollo) */}
      {__DEV__ && (
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 24,
            gap: 8,
            marginTop: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <Pressable
            onPress={() => setShowStreakDev(true)}
            style={{
              flex: 1,
              backgroundColor: "#EF4444",
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>
              🔥 Streak
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowPaywall(true)}
            style={{
              flex: 1,
              backgroundColor: "#8B5CF6",
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>
              💰 Pay
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowTrialOffer(true)}
            style={{
              flex: 1,
              backgroundColor: "#D946EF",
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>
              🎁 Gift
            </Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              useAchievementsStore.setState((prev) => ({
                totalCoins: prev.totalCoins + 1000,
              }));
              await loadAchievements();
            }}
            style={{
              flex: 1,
              backgroundColor: "#F59E0B",
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>
              👑 +1k
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowReviewDev(true)}
            style={{
              flex: 1,
              backgroundColor: "#FBBF24",
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>
              ⭐ Review
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.mainContent}>
        {/* Content */}
        {activeTab === "logros" ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Top Dashboard Headers */}
            <View style={styles.dashboardContainer}>
              {/* Top Stat: Logros Completados */}
              <View style={styles.dashboardTopCard}>
                <View style={styles.dashboardRow}>
                  <Calendar
                    size={22}
                    color={colors.background}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.dashboardValueText}>
                    {achievementsList.filter((a) => a.completed).length}/
                    {achievementsList.length}
                  </Text>
                </View>
                <Text style={styles.dashboardLabelText}>
                  Logros Completados
                </Text>
              </View>

              {/* Split Stats: Streak and Multiplier */}
              <View style={styles.dashboardSplitContainer}>
                <View style={styles.dashboardSplitCard}>
                  <View style={styles.dashboardRow}>
                    <Flame size={22} color="#EF4444" strokeWidth={2.5} />
                    <Text style={styles.dashboardValueText}>{appStreak}</Text>
                  </View>
                  <Text style={styles.dashboardLabelText}>Racha diaria</Text>
                </View>

                <View
                  style={[
                    styles.dashboardSplitCard,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      elevation: 4,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                    },
                  ]}
                >
                  <View style={styles.dashboardRow}>
                    <Crown size={22} color="#111827" strokeWidth={2.5} />
                    <Text style={styles.dashboardValueText}>
                      x{getMultiplier()}
                    </Text>
                  </View>
                  <Text
                    style={[styles.dashboardLabelText, { color: "#374151" }]}
                  >
                    Multiplicador
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionHeaderTitle}>Achievements</Text>

            {/* Achievement Cards with Progress Line */}
            <View style={styles.achievementsContainer}>
              {achievementsList.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  isLast={index === achievementsList.length - 1}
                  onPress={() => {}}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.shopContentContainer}
          >
            {/* Backgrounds Section */}
            <Text style={styles.shopSectionTitle}>Fondos</Text>
            <FlatList
              data={SHOP_ITEMS.filter((i) => i.type === "background")}
              renderItem={renderShopItem}
              keyExtractor={(item) => item.id}
              numColumns={NUM_COLUMNS}
              scrollEnabled={false}
              columnWrapperStyle={styles.shopFlatListRow}
              contentContainerStyle={{ marginBottom: 24 }}
            />

            {/* Outfits Section */}
            <Text style={styles.shopSectionTitle}>Outfits</Text>
            <FlatList
              data={SHOP_ITEMS.filter((i) => i.type === "outfit")}
              renderItem={renderShopItem}
              keyExtractor={(item) => item.id}
              numColumns={NUM_COLUMNS}
              scrollEnabled={false}
              columnWrapperStyle={styles.shopFlatListRow}
            />
          </ScrollView>
        )}

        {/* Purchase Confirmation Modal */}
        <Modal
          visible={!!confirmItem}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmItem(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {confirmItem && (
                <>
                  {/* Large image area at top */}
                  <View style={styles.modalImageArea}>
                    <Image
                      source={confirmItem.image}
                      style={styles.modalImageFull}
                      resizeMode={
                        confirmItem.type === "outfit" ? "contain" : "cover"
                      }
                    />
                  </View>

                  {/* Content: price badge + name + buttons */}
                  <View style={styles.modalContent}>
                    {/* Price badge overlapping the image */}
                    <View style={styles.modalPriceBadge}>
                      <Crown
                        size={14}
                        color={colors.background}
                        strokeWidth={2.5}
                      />
                      <Text style={styles.modalPriceBadgeText}>
                        {confirmItem.price}
                      </Text>
                    </View>

                    <Text style={styles.modalItemName}>
                      ¿Quieres comprar este item?
                    </Text>

                    <Pressable
                      style={styles.modalBuyButton}
                      onPress={handleConfirmPurchase}
                    >
                      <Text style={styles.modalBuyButtonText}>COMPRAR</Text>
                    </Pressable>

                    <Pressable
                      style={styles.modalCancelPressable}
                      onPress={() => setConfirmItem(null)}
                    >
                      <Text style={styles.modalCancelLink}>Cancelar</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>

      {/* Footer Tabs */}
      <View style={styles.footerContainer}>
        <Pressable
          style={styles.footerTab}
          onPress={() => handleTabPress("logros")}
        >
          <Trophy
            size={24}
            color={activeTab === "logros" ? "#111827" : "#9CA3AF"}
            strokeWidth={activeTab === "logros" ? 2.5 : 2}
          />
          <Text
            style={[
              styles.footerTabText,
              activeTab === "logros" && styles.footerTabTextActive,
            ]}
          >
            Logros
          </Text>
        </Pressable>

        <Pressable
          style={styles.footerTab}
          onPress={() => handleTabPress("tienda")}
        >
          <Store
            size={24}
            color={activeTab === "tienda" ? "#111827" : "#9CA3AF"}
            strokeWidth={activeTab === "tienda" ? 2.5 : 2}
          />
          <Text
            style={[
              styles.footerTabText,
              activeTab === "tienda" && styles.footerTabTextActive,
            ]}
          >
            Tienda
          </Text>
        </Pressable>
      </View>
      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="debug_panel"
      />
      <DailyStreakScreen
        visible={showStreakDev}
        streak={appStreak}
        history={[]}
        maxStreak={appStreak}
        shieldDates={[]}
        onDismiss={() => setShowStreakDev(false)}
      />
      <ProTrialOfferModal
        visible={showTrialOffer}
        onClose={() => setShowTrialOffer(false)}
      />
      <ReviewRequestModal
        visible={showReviewDev}
        streak={appStreak}
        onClose={() => setShowReviewDev(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF0FC",
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  backButton: {
    padding: 4,
    width: 36,
  },
  crownsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF0FC", // soft grayish blue based on the image
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 42,
    gap: 6,
    position: "relative",
  },
  // Footer
  footerContainer: {
    flexDirection: "row",
    backgroundColor: "#EAF0FC",
    paddingTop: 12,
    paddingBottom: 8,
  },
  footerTab: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  footerTabText: {
    fontFamily: "Jersey10",
    fontSize: 14,
    color: "#9CA3AF",
  },
  footerTabTextActive: {
    fontFamily: "Jersey10",
    fontSize: 14,
    color: "#111827",
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  achievementsContainer: {
    gap: 16,
  },
  // Dashboard
  dashboardContainer: {
    gap: 12,
    marginBottom: 24,
  },
  dashboardTopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardSplitContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dashboardSplitCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dashboardValueText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  dashboardLabelText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    marginLeft: 4,
  },
  // Shop
  shopContentContainer: {
    padding: GRID_PADDING,
    paddingBottom: 40,
  },
  shopSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
    marginTop: 8,
  },
  shopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -(GRID_GAP / 2),
    marginBottom: 24,
  },
  shopFlatListRow: {
    justifyContent: "flex-start",
    marginHorizontal: -(GRID_GAP / 2),
  },
  shopItemCard: {
    width: ITEM_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    marginHorizontal: GRID_GAP / 2,
    marginBottom: GRID_GAP,
  },
  shopImageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopImageContainerActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  shopImage: {
    width: "100%",
    height: "100%",
  },
  shopOutfitImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 0.8 }],
  },
  // Removed ownedBadge
  shopItemDetails: {
    alignItems: "center",
    gap: 10,
  },
  shopItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    width: "100%",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  buyButtonAffordable: {
    backgroundColor: colors.surface,
    shadowColor: colors.surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buyButtonLocked: {
    backgroundColor: "#F3F4F6",
  },
  buyButtonTextAffordable: {
    color: "#FFFFFF",
  },
  buyButtonTextLocked: {
    color: "#9CA3AF",
  },
  applyButton: {
    backgroundColor: "#EAF0FC",
  },
  applyButtonText: {
    color: colors.background,
  },
  applyButtonActive: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  applyButtonTextActive: {
    color: "#9CA3AF",
  },
  // Pro badge (top-right corner of shop image)
  proBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  // PRO locked button for non-pro users
  proLockedButton: {
    backgroundColor: "#1A1C20",
  },
  proLockedButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFD700",
  },
  // Confirmation Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 32,
    width: "100%",
    maxWidth: 300,
    overflow: "hidden",
  },
  modalImageArea: {
    width: "100%",
    height: 230,
    backgroundColor: colors.primaryDim,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  modalImageFull: {
    width: "100%",
    height: "100%",
  },
  modalContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 28,
    marginTop: -32,
    gap: 14,
  },
  modalPriceBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primary,
    width: 80,
    height: 80,
    borderRadius: 40,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 2,
  },
  modalPriceBadgeText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primaryContent,
  },
  modalItemName: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: "Jersey10",
  },
  modalBuyButton: {
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    fontFamily: "Jersey10",
  },
  modalBuyButtonText: {
    fontSize: 22,
    fontFamily: "Jersey10",
    color: colors.primaryContent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalCancelPressable: {
    paddingVertical: 4,
  },
  modalCancelLink: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
