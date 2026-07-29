import { colors } from "@/constants/theme";
import { Achievement, AchievementCard } from "@/src/components/AchievementCard";
import { AppText as Text } from "@/src/components/AppText";
import { CoinsCounter } from "@/src/components/CoinsCounter";
import { PaywallModal } from "@/src/components/PaywallModal";
import { posthog } from "@/src/config/posthog";
import { ShopItem } from "@/src/config/shopItems";
import { useShopItems } from "@/src/hooks/useShopItems";
import {
  ACHIEVEMENT_DEFINITIONS,
  useAchievementsStore,
} from "@/src/store/achievementsStore";
import { useEggCatalog, CatalogEgg } from "@/src/hooks/useEggCatalog";
import { useEggStore, EggData, EggRarity } from "@/src/store/eggStore";
import { useAppStreakStore } from "@/src/store/appStreakStore";
import { useProStore } from "@/src/store/proStore";
import {
  renderRoutinesWidget,
  WIDGET_BG_ID_KEY,
  WIDGET_BG_MODE_KEY,
  WIDGET_BG_URI_KEY,
  WIDGET_OUTFIT_ID_KEY,
  WIDGET_OUTFIT_URI_KEY,
} from "@/src/widgets/widgetTaskHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import {
  ChevronLeft,
  Lock,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
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
const OUTFIT_COLUMNS = 3;
const OUTFIT_ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2) / OUTFIT_COLUMNS - GRID_GAP;

const hapticsLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
const hapticsMed = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
const hapticsHeavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
const hapticsSuccess = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
const hapticsSel = () => Haptics.selectionAsync().catch(() => {});

type TabType = "logros" | "outfits" | "backgrounds" | "eggs";

// ─────────────────────────────────────────────────────────────────────────────
// Memoized shop item card — only re-renders when its specific props change.
// This prevents all 39 cards from re-rendering whenever totalCoins changes.
// ─────────────────────────────────────────────────────────────────────────────
type ShopItemCardProps = {
  item: ShopItem;
  owned: boolean;
  active: boolean;
  canAfford: boolean;
  onItemPress: (item: ShopItem) => void;
  onApply: (item: ShopItem) => void;
};

const ShopItemCard = React.memo(function ShopItemCard({
  item,
  owned,
  active,
  canAfford,
  onItemPress,
  onApply,
}: ShopItemCardProps) {
  const { t } = useTranslation();

  const cardPress = () => {
    if (item.type !== "outfit") return;
    hapticsLight();
    if (owned) {
      onApply(item);
    } else {
      onItemPress(item);
    }
  };

  const isOutfit = item.type === "outfit";
  const isBackground = item.type === "background";

  return (
    <>
      {isOutfit ? (
        <Pressable
          style={[
            styles.outfitCard,
            { borderColor: item.isPro ? "#FFD700" : "#FFFFFF", backgroundColor: item.isPro ? "#3D2B1F" : "#2A2A2A" },
          ]}
          onPress={cardPress}
        >
          {active && (
            <>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </>
          )}
          <View style={[styles.outfitImageContainer]}>
            <Image
              source={item.imageUri ? { uri: item.imageUri } : item.image}
              style={styles.shopOutfitImage}
              resizeMode="contain"
            />
            {item.isPro && (
              <View style={styles.lockerBadge}>
                <Image source={require("@/assets/images/store_Locker.png")} style={styles.lockerIcon} resizeMode="contain" />
              </View>
            )}
          </View>
          <View style={styles.outfitBottomBar}>
            {owned ? (
              <Text style={styles.outfitOwnedCheck}>✓</Text>
            ) : (
              <>
                <Image
                  source={require("@/assets/images/crownIcon.png")}
                  style={styles.outfitCrownIcon}
                  resizeMode="contain"
                />
                <Text style={styles.outfitPriceText}>{item.price}</Text>
              </>
            )}
          </View>
        </Pressable>
      ) : (
        <View style={styles.shopItemCard}>
          <View
            style={[
              styles.shopImageContainer,
            ]}
          >
            <Image
              source={item.imageUri ? { uri: item.imageUri } : item.image}
              style={styles.shopImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.shopItemDetails}>
            {!owned ? (
              <Pressable
                style={[
                  styles.actionButton,
                  canAfford ? styles.buyButtonAffordable : styles.buyButtonLocked,
                ]}
                onPress={() => onItemPress(item)}
                disabled={!canAfford}
              >
                {!canAfford ? (
                  <Lock size={14} color="#9CA3AF" strokeWidth={2.5} />
                ) : (
                  <Image source={require("@/assets/images/crownIcon.png")} style={styles.crownBuyIcon} />
                )}
                <Text
                  style={[
                    styles.actionButtonText,
                    canAfford
                      ? styles.buyButtonTextAffordable
                      : styles.buyButtonTextLocked,
                  ]}
                >
                  {item.price}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.actionButton,
                  active ? styles.applyButtonActive : styles.applyButton,
                ]}
                onPress={() => onApply(item)}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    active ? styles.applyButtonTextActive : styles.applyButtonText,
                  ]}
                >
                  {active
                    ? t("achievements.shop.equipped")
                    : t("achievements.shop.equip")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </>
  );
});

const EGG_RARITY_STYLES: Record<
  EggRarity,
  { border: string; bg: string }
> = {
  common: { border: "#67E8F9", bg: "#164e63" },
  rare: { border: "#A855F7", bg: "#4C1D95" },
  legendary: { border: "#F97316", bg: "#7C2D12" },
};

type EggCardProps = {
  egg: CatalogEgg;
  owned: boolean;
  hatched: boolean;
  onBuy: (egg: CatalogEgg) => void;
};

const EggCard = React.memo(function EggCard({
  egg,
  owned,
  hatched,
  onBuy,
}: EggCardProps) {
  const rarityStyle = EGG_RARITY_STYLES[egg.rarity];
  const showLocker = egg.rarity !== "common" && !hatched;
  const Wrapper = owned ? View : Pressable;

  return (
    <Wrapper
      {...(!owned ? { onPress: () => onBuy(egg) } : {})}
      style={[
        styles.eggCard,
        { borderColor: rarityStyle.border, backgroundColor: rarityStyle.bg },
      ]}
    >
      <View style={[styles.eggImageContainer, owned && styles.eggImageOwned]}>
        <Image source={hatched ? egg.petImage : egg.image} style={styles.eggImage} resizeMode="contain" />
        {showLocker && (
          <View style={styles.lockerBadge}>
            <Image source={require("@/assets/images/store_Locker.png")} style={styles.lockerIcon} resizeMode="contain" />
          </View>
        )}
      </View>
      <View style={styles.eggBottomBar}>
        {hatched ? (
          <Text style={styles.eggHatchedText}>✦</Text>
        ) : owned ? (
          <Text style={styles.eggOwnedCheck}>✓</Text>
        ) : (
          <>
            <Image
              source={require("@/assets/images/crownIcon.png")}
              style={styles.eggCrownIcon}
              resizeMode="contain"
            />
            <Text style={styles.eggPriceText}>{egg.cost}</Text>
          </>
        )}
      </View>
    </Wrapper>
  );
});

type EggGridProps = {
  catalog: CatalogEgg[];
  eggs: EggData[];
  totalCoins: number;
  isPro: boolean;
  spendCoins: (amount: number) => Promise<boolean>;
};

function EggGrid({ catalog, eggs, totalCoins, isPro, spendCoins }: EggGridProps) {
  const { t } = useTranslation();
  const unlockEgg = useEggStore((s) => s.unlockEgg);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleBuy = useCallback(async (egg: CatalogEgg) => {
    hapticsLight();
    if (egg.rarity !== "common" && !isPro) {
      setShowPaywall(true);
      return;
    }
    if (totalCoins < egg.cost) {
      Alert.alert(
        t("achievements.shop.insufficient_title"),
        t("achievements.shop.insufficient_message", {
          missing: egg.cost - totalCoins,
          item: egg.name,
        }),
      );
      return;
    }
    Alert.alert(
      egg.name,
      `${egg.cost} crowns`,
      [
        { text: t("achievements.shop.cancel"), style: "cancel" },
        {
          text: t("achievements.shop.buy"),
          onPress: async () => {
            const success = await spendCoins(egg.cost);
            if (success) {
              unlockEgg(egg.id as any);
              hapticsSuccess();
            }
          },
        },
      ],
    );
  }, [isPro, totalCoins, spendCoins, unlockEgg, t]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.shopContentContainer}
    >
      <View style={styles.shopGrid}>
          {catalog.map((egg) => {
          const eggData = eggs.find((e) => e.id === egg.id);
          const owned = eggData?.unlocked ?? false;
          const hatched = eggData?.evolved ?? false;
          return (
            <EggCard
              key={egg.id}
              egg={egg}
              owned={owned}
              hatched={hatched}
              onBuy={handleBuy}
            />
          );
        })}
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="debug_panel"
      />
    </ScrollView>
  );
}

export default function AchievementsScreen() {
  const { t } = useTranslation();
  // ── Atomic selectors: only re-render when the specific field changes ──
  const achievements = useAchievementsStore((s) => s.achievements);
  const loadAchievements = useAchievementsStore((s) => s.loadAchievements);
  const totalCoins = useAchievementsStore((s) => s.totalCoins);
  const purchasedBackgrounds = useAchievementsStore((s) => s.purchasedBackgrounds);
  const purchasedOutfits = useAchievementsStore((s) => s.purchasedOutfits);
  const activeBackground = useAchievementsStore((s) => s.activeBackground);
  const activeOutfit = useAchievementsStore((s) => s.activeOutfit);
  const spendCoins = useAchievementsStore((s) => s.spendCoins);
  const onPurchaseMade = useAchievementsStore((s) => s.onPurchaseMade);
  const setActiveBackground = useAchievementsStore((s) => s.setActiveBackground);
  const setActiveOutfit = useAchievementsStore((s) => s.setActiveOutfit);
  const claimAchievement = useAchievementsStore((s) => s.claimAchievement);
  const storeLoaded = useAchievementsStore((s) => s._loaded);
  const { streak: appStreak, getMultiplier } = useAppStreakStore();
  const { isPro } = useProStore();
  const shopItems = useShopItems();
  const catalog = useEggCatalog();
  const eggs = useEggStore((s) => s.eggs);
  const [activeTab, setActiveTab] = useState<TabType>("logros");
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const debugTapCount = useRef(0);

  useEffect(() => {
    void loadAchievements();
  }, []);

  const handleTabPress = useCallback(
    (tab: TabType) => {
      if (tab === activeTab) return;
      if (Platform.OS === "ios") {
        hapticsSel();
      } else {
        hapticsLight();
      }
      setActiveTab(tab);
    },
    [activeTab],
  );

  const isOwned = useCallback(
    (item: ShopItem) => {
      if (item.id === "outfit_default") return true;
      if (item.type === "background")
        return purchasedBackgrounds.includes(item.id);
      return purchasedOutfits.includes(item.id);
    },
    [purchasedBackgrounds, purchasedOutfits],
  );

  const isActive = useCallback(
    (item: ShopItem) => {
      if (item.id === "outfit_default") return activeOutfit === null || activeOutfit === undefined;
      if (item.type === "background") return activeBackground === item.id;
      return activeOutfit === item.id;
    },
    [activeBackground, activeOutfit],
  );

  const handleItemPress = useCallback(
    (item: ShopItem) => {
      hapticsLight();
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
          t("achievements.shop.insufficient_title"),
          t("achievements.shop.insufficient_message", {
            missing: item.price - totalCoins,
            item: item.name,
          }),
        );
        return;
      }
      setConfirmItem(item);
    },
    [isPro, totalCoins, isOwned, t],
  );

  const handleConfirmPurchase = useCallback(async () => {
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
      const actualCoinsAfter = useAchievementsStore.getState().totalCoins;
      posthog.capture("shop_item_purchased", {
        item_type: confirmItem.type,
        item_id: confirmItem.id,
        item_name: confirmItem.name,
        price: confirmItem.price,
        is_pro_item: !!confirmItem.isPro,
        coins_after: actualCoinsAfter,
      });
      hapticsSuccess();
    }
    setConfirmItem(null);
  }, [confirmItem, isPro, totalCoins, spendCoins, onPurchaseMade]);

  const handleApply = useCallback(
    async (item: ShopItem) => {
      hapticsMed();
      if (item.type === "background") {
        // Toggle: if already active, deactivate
        const isDeactivatingBg = activeBackground === item.id;
        if (isDeactivatingBg) {
          await setActiveBackground(null, null);
        } else {
          await setActiveBackground(item.id, item.imageUri ?? null);
        }

        // Sync background to Android widget immediately (two.tsx may be unmounted)
        if (Platform.OS === "android") {
          try {
            await AsyncStorage.setItem(
              WIDGET_BG_ID_KEY,
              isDeactivatingBg ? "" : item.id,
            );
            // Persist remote URI so the widget can load it when bgId is not in the local map
            await AsyncStorage.setItem(
              WIDGET_BG_URI_KEY,
              isDeactivatingBg ? "" : (item.imageUri ?? ""),
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
        const isDefaultOutfit = item.id === "outfit_default";
        const isDeactivating = activeOutfit === item.id;
        if (isDeactivating || isDefaultOutfit) {
          await setActiveOutfit(null, null);
        } else {
          await setActiveOutfit(item.id, item.imageUri ?? null);
        }

        // Sync outfit to Android widget immediately (two.tsx may be unmounted)
        if (Platform.OS === "android") {
          try {
            await AsyncStorage.setItem(
              WIDGET_OUTFIT_ID_KEY,
              isDeactivating || isDefaultOutfit ? "" : item.id,
            );
            // Persist remote URI so the widget can load it when outfitId is not in the local map
            await AsyncStorage.setItem(
              WIDGET_OUTFIT_URI_KEY,
              isDeactivating || isDefaultOutfit ? "" : (item.imageUri ?? ""),
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
    },
    [activeBackground, activeOutfit, setActiveBackground, setActiveOutfit],
  );

  // Memoized derived data — avoids recomputation on unrelated renders
  const achievementsList = useMemo<Achievement[]>(
    () =>
      Object.values(ACHIEVEMENT_DEFINITIONS)
        .map((def) => {
          const progress = achievements[def.id];
          return {
            id: def.id,
            title: t(`achievements.items.${def.id}`, { defaultValue: def.title }),
            icon: def.icon,
            gradient: def.gradient,
            progress: progress?.progress || 0,
            total: def.total,
            completed: progress?.completed || false,
            claimed: progress?.claimed ?? false,
            coins: def.coins,
          };
        })
        .sort((a, b) => {
          if (a.completed && !a.claimed && !(b.completed && !b.claimed)) return -1;
          if (!(a.completed && !a.claimed) && b.completed && !b.claimed) return 1;
          if (a.claimed && !b.claimed) return 1;
          if (!a.claimed && b.claimed) return -1;
          return 0;
        }),
    [achievements, t],
  );

  const bgItems = useMemo(
    () => shopItems.filter((i) => i.type === "background"),
    [shopItems],
  );

  const outfitItems = useMemo(
    () => shopItems.filter((i) => i.type === "outfit"),
    [shopItems],
  );

  if (!storeLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <ImageBackground
        source={require("@/assets/images/storefront.jpeg")}
        style={styles.storefrontBg}
        imageStyle={styles.storefrontImage}
      >
        <View style={styles.header}>
          <Pressable onPress={() => { hapticsLight(); router.back(); }} style={styles.backButton}>
            <ChevronLeft size={28} color="#edeff1" strokeWidth={2.5} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => {
            debugTapCount.current += 1;
            if (debugTapCount.current >= 5) {
              debugTapCount.current = 0;
              const previewItem = outfitItems[0];
              if (previewItem) setConfirmItem(previewItem);
            }
          }} style={styles.crownsPill}>
            <Image source={require("@/assets/images/crownIcon.png")} style={styles.crownHeaderIcon} />
            <CoinsCounter coins={totalCoins} size="special" color="#2c2d30" />
          </Pressable>
        </View>
      </ImageBackground>

      <ImageBackground
        source={require("@/assets/images/storewall.jpeg")}
        style={styles.mainContent}
        imageStyle={styles.storewallImage}
      >
        {/* Top Tabs */}
        <View style={styles.topTabsContainer}>
          <Pressable
            style={[styles.topTab, activeTab === "logros" && styles.topTabActive]}
            onPress={() => handleTabPress("logros")}
          >
            <Image
              source={require("@/assets/images/storeIcon_logro.png")}
              style={[
                styles.tabIcon,
                activeTab === "logros" && styles.tabIconActive,
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "logros" && styles.tabLabelActive,
              ]}
            >
              {t("achievements.tab_achievements")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.topTab, activeTab === "outfits" && styles.topTabActive]}
            onPress={() => handleTabPress("outfits")}
          >
            <Image
              source={require("@/assets/images/storeIcon_outfit.png")}
              style={[
                styles.tabIcon,
                activeTab === "outfits" && styles.tabIconActive,
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "outfits" && styles.tabLabelActive,
              ]}
            >
              {t("achievements.shop.outfits")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.topTab, activeTab === "backgrounds" && styles.topTabActive]}
            onPress={() => handleTabPress("backgrounds")}
          >
            <Image
              source={require("@/assets/images/storeIcon_background.png")}
              style={[
                styles.tabIcon,
                activeTab === "backgrounds" && styles.tabIconActive,
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "backgrounds" && styles.tabLabelActive,
              ]}
            >
              {t("achievements.shop.backgrounds")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.topTab, activeTab === "eggs" && styles.topTabActive]}
            onPress={() => handleTabPress("eggs")}
          >
            <Image
              source={require("@/assets/images/storeIcon_egg.png")}
              style={[
                styles.tabIcon,
                activeTab === "eggs" && styles.tabIconActive,
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "eggs" && styles.tabLabelActive,
              ]}
            >
              Eggs
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {activeTab === "logros" ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Achievement Cards with Progress Line */}
            <View style={styles.achievementsContainer}>
              {achievementsList.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  isLast={index === achievementsList.length - 1}
                  onPress={() => {}}
                  onClaim={() => claimAchievement(achievement.id as any)}
                />
              ))}
            </View>
          </ScrollView>
        ) : activeTab === "backgrounds" ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.shopContentContainer}
          >
            <View style={styles.bgList}>
              {bgItems.map((item) => {
                const isOwned = purchasedBackgrounds.includes(item.id);
                return (
                <Pressable key={item.id} style={styles.bgItem}
                  onPress={() => isOwned ? handleApply(item) : handleItemPress(item)}
                >
                  <View style={styles.bgPreviewWrap}>
                    <Image
                      source={item.imageUri ? { uri: item.imageUri } : item.image}
                      style={styles.bgPreview}
                      resizeMode="cover"
                    />
                    <Image
                      source={require("@/assets/images/store_BackgroundBorder.png")}
                      style={styles.bgBorder}
                      resizeMode="stretch"
                    />
                    {!!item.isPro && !isOwned && (
                      <View style={styles.bgLockerBadge}>
                        <Image source={require("@/assets/images/store_Locker.png")} style={styles.bgLockerIcon} resizeMode="contain" />
                      </View>
                    )}
                    <View style={styles.bgPricePill}>
                      {isOwned ? (
                        <Text style={styles.bgPricePillText}>
                          {activeBackground === item.id
                            ? t("achievements.shop.equipped")
                            : "✓"}
                        </Text>
                      ) : (
                        <>
                          <Image
                            source={require("@/assets/images/crownIcon.png")}
                            style={styles.bgPricePillIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.bgPricePillText}>{item.price}</Text>
                        </>
                      )}
                    </View>
                  </View>
                </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : activeTab === "outfits" ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.outfitContentContainer}
          >
            <View style={styles.outfitGrid}>
              {outfitItems.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={purchasedOutfits.includes(item.id)}
                  active={activeOutfit === item.id}
                  canAfford={totalCoins >= item.price}
                  onItemPress={handleItemPress}
                  onApply={handleApply}
                />
              ))}
            </View>
          </ScrollView>
        ) : activeTab === "eggs" ? (
          <EggGrid
            catalog={catalog}
            eggs={eggs}
            totalCoins={totalCoins}
            isPro={isPro}
            spendCoins={spendCoins}
          />
        ) : null}

        {/* Purchase Confirmation Modal */}
        <Modal
          visible={!!confirmItem}
          transparent
          animationType="fade"
          onRequestClose={() => { hapticsLight(); setConfirmItem(null); }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {confirmItem && (
                <>
                  {/* Close X button */}
                  <Pressable
                    style={styles.modalCloseX}
                    hitSlop={12}
                    onPress={() => { hapticsLight(); setConfirmItem(null); }}
                  >
                    <X size={20} color="#8B6F5E" strokeWidth={3} />
                  </Pressable>

                  {/* Image preview with pixel-art border */}
                  <View style={styles.modalImageWrap}>
                    <Image
                      source={
                        confirmItem.imageUri
                          ? { uri: confirmItem.imageUri }
                          : confirmItem.image
                      }
                      style={styles.modalImageFull}
                      resizeMode={
                        confirmItem.type === "outfit" ? "contain" : "cover"
                      }
                    />
                    {confirmItem.type === "background" && (
                      <Image
                        source={require("@/assets/images/store_BackgroundBorder.png")}
                        style={styles.modalImageBorder}
                        resizeMode="stretch"
                      />
                    )}
                    {confirmItem.isPro && (
                      <View style={styles.modalLockerBadge}>
                        <Image source={require("@/assets/images/store_Locker.png")} style={styles.modalLockerIcon} resizeMode="contain" />
                      </View>
                    )}
                  </View>


                  {/* Action row: price pill + GET button */}
                  <View style={styles.modalActionRow}>
                    <View style={styles.modalPricePillSmall}>
                      <Image source={require("@/assets/images/crownIcon.png")} style={styles.modalPricePillSmallIcon} resizeMode="contain" />
                      <Text style={styles.modalPricePillSmallText}>{confirmItem.price}</Text>
                    </View>
                    <Pressable
                      style={styles.modalGetButton}
                      onPress={handleConfirmPurchase}
                    >
                      <Image
                        source={require("@/assets/images/achievement_getButton.png")}
                        style={styles.modalGetImage}
                        resizeMode="contain"
                      />
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </ImageBackground>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="debug_panel"
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
  storefrontBg: {
    height: 240,
  },
  storefrontImage: {
    resizeMode: "cover",
  },
  storewallImage: {
    resizeMode: "cover",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  backButton: {
    padding: 4,
    width: 36,
    color: "#f3f4f7",
    
    
  },
  crownsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF0FC", // soft grayish blue based on the image
    paddingHorizontal: 10,
    paddingLeft: 32,
    paddingVertical: 2,
    borderRadius: 32,
    gap: 6,
    position: "relative",
    fontFamily: "Jersey10",
  },
  // Footer
  topTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#c1d9dd",
    paddingHorizontal: 24,
    gap: 0,
  },
  topTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  topTabActive: {
    borderBottomColor: "#111827",
  },
  tabIcon: {
    width: 48,
    height: 48,
    opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontFamily: "Jersey10",
    fontSize: 16,
    color: "#9CA3AF",
  },
  tabLabelActive: {
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
  // Shop
  shopContentContainer: {
    padding: GRID_PADDING,
    paddingBottom: 40,
  },
  outfitContentContainer: {
    padding: GRID_PADDING,
    paddingBottom: 40,
  },
  shopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -(GRID_GAP / 2),
    marginBottom: 24,
  },
  outfitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -(GRID_GAP / 2),
  },
  bgList: {
    gap: 20,
  },
  bgItem: {
    borderRadius: 22,
    overflow: "hidden",
  },
  bgPreviewWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  bgPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  bgBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  bgPricePill: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bgPricePillIcon: {
    width: 24,
    height: 24,
  },
  bgPricePillText: {
    fontSize: 13,
    fontFamily: "Jersey10",
    color: "#FFFFFF",
  },
  bgLockerBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    alignItems: "center",
    justifyContent: "center",
  },
  bgLockerIcon: {
    width: "100%",
    height: "100%",
  },
  shopFlatListRow: {
    justifyContent: "flex-start",
    marginHorizontal: -(GRID_GAP / 2),
  },
  shopItemCard: {
    width: ITEM_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fdfdff",
    gap: 12,
    marginHorizontal: GRID_GAP / 2,
    marginBottom: GRID_GAP,
  },
  outfitCard: {
    width: OUTFIT_ITEM_WIDTH,
    borderRadius: 8,
    borderWidth: 2,
    padding: 6,
    gap: 0,
    marginHorizontal: GRID_GAP / 2,
    marginBottom: GRID_GAP,
    position: "relative",
  },
  outfitImageContainer: {
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    aspectRatio: 1,
  },
  shopOutfitImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 0.8 }],
  },
  outfitBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    marginTop: 4,
  },
  outfitCrownIcon: {
    width: 28,
    height: 28,
  },
  outfitPriceText: {
    fontSize: 16,
    fontFamily: "Jersey10",
    color: "#FFFFFF",
  },
  outfitOwnedCheck: {
    fontSize: 18,
    color: "#FFFFFF",
    fontFamily: "Jersey10",
  },
  cornerTopLeft: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 52,
    height: 52,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderColor: "#aeff78",
    zIndex: 10,
  },
  cornerTopRight: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 52,
    height: 52,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderColor: "#aeff78",
    zIndex: 10,
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: -6,
    left: -6,
    width: 52,
    height: 52,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderColor: "#aeff78",
    zIndex: 10,
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 52,
    height: 52,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderColor: "#aeff78",
    zIndex: 10,
  },
  shopImageContainer: {
    width: "100%",
    aspectRatio: 1,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopImage: {
    width: "100%",
    height: "100%",
  },
  eggCard: {
    width: ITEM_WIDTH,
    borderRadius: 8,
    borderWidth: 2,
    padding: 6,
    gap: 0,
    marginHorizontal: GRID_GAP / 2,
    marginBottom: GRID_GAP,
  },
  eggImageContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0,
    borderRadius: 4,
    aspectRatio: 1,
  },
  eggImageOwned: {
    borderWidth: 2,
    borderColor: "#10B981",
  },
  eggImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 0.85 }],
  },
  eggBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    marginTop: 4,
  },
  eggCrownIcon: {
    width: 28,
    height: 28,
  },
  eggPriceText: {
    fontSize: 16,
    fontFamily: "Jersey10",
    color: "#FFFFFF",
  },
  eggOwnedCheck: {
    fontSize: 18,
    color: "#FFFFFF",
    fontFamily: "Jersey10",
  },
  eggHatchedText: {
    fontSize: 18,
    color: "#FFD700",
    fontFamily: "Jersey10",
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
  crownBuyIcon: {
    width: 14,
    height: 14,
  },
  lockerBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  lockerIcon: {
    width: "100%",
    height: "100%",
  },
  crownHeaderIcon: {
    width: 36,
    height: 36,
    position: "absolute",
    left: -12,
    top: "50%",
    marginTop: -20,
    
  },
  // PRO locked button for non-pro users

  // Confirmation Modal — pixel-art storefront style
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#F5E6D3",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#8B6F5E",
    overflow: "hidden",
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalCloseX: {
    position: "absolute",
    top: 20,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,230,211,0.9)",
    zIndex: 10,
  },
  modalImageWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  modalImageFull: {
    width: "100%",
    height: "100%",
  },
  modalImageBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  modalLockerBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLockerIcon: {
    width: "100%",
    height: "100%",
  },
  modalItemName: {
    fontSize: 22,
    fontFamily: "Jersey10",
    color: "#8B6F5E",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    paddingTop: 8,
  },
  modalPricePillSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalPricePillSmallIcon: {
    width: 42,
    height: 42,
  },
  modalPricePillSmallText: {
    fontSize: 36,
    fontFamily: "Jersey10",
    color: "#080808",
  },
  modalGetButton: {
    flex: 1,
    height: 66,
    justifyContent: "center",
  },
  modalGetImage: {
    width: "100%",
    height: "100%",
  },
});
