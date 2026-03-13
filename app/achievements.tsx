import { colors } from '@/constants/theme';
import { Achievement, AchievementCard } from '@/src/components/AchievementCard';
import { CoinsCounter } from '@/src/components/CoinsCounter';
import { ACHIEVEMENT_DEFINITIONS, useAchievementsStore } from '@/src/store/achievementsStore';
import { useAppStreakStore } from '@/src/store/appStreakStore';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { Check, ChevronLeft, Crown, Lock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 24;
const GRID_GAP = 12;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2) / NUM_COLUMNS - GRID_GAP;

// Prices
const BG_PRICE = 500;
const OUTFIT_PRICE = 650;

// Shop items from assets
const SHOP_ITEMS = [
  // Backgrounds
  { id: 'bg_spring', name: 'Primavera', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/spring.png') },
  { id: 'bg_beach', name: 'Playa', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/beach.png') },
  { id: 'bg_autumn', name: 'Otoño', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/autumm.png') },
  { id: 'bg_winter', name: 'Invierno', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/winter.png') },
  { id: 'bg_woods', name: 'Bosque', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/woods.png') },
  // Outfits
  { id: 'outfit_1_1', name: 'Outfit 1', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_1.png') },
  { id: 'outfit_1_2', name: 'Outfit 2', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_2.png') },
  { id: 'outfit_1_3', name: 'Outfit 3', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_3.png') },
  { id: 'outfit_1_4', name: 'Outfit 4', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_4.png') },
];

type ShopItem = typeof SHOP_ITEMS[number];
type TabType = 'logros' | 'tienda';

export default function AchievementsScreen() {
  const {
    achievements, loadAchievements, totalCoins,
    purchasedBackgrounds, purchasedOutfits,
    activeBackground, activeOutfit,
    spendCoins, onPurchaseMade, setActiveBackground, setActiveOutfit,
  } = useAchievementsStore();
  const { streak: appStreak } = useAppStreakStore();
  const [activeTab, setActiveTab] = useState<TabType>('logros');
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const handleTabPress = (tab: TabType) => {
    if (tab === activeTab) return;
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
  };

  const isOwned = (item: ShopItem) => {
    if (item.type === 'background') return purchasedBackgrounds.includes(item.id);
    return purchasedOutfits.includes(item.id);
  };

  const isActive = (item: ShopItem) => {
    if (item.type === 'background') return activeBackground === item.id;
    return activeOutfit === item.id;
  };

  const handleItemPress = (item: ShopItem) => {
    if (isOwned(item)) return; // owned items use the "Aplicar" button
    if (totalCoins < item.price) {
      Alert.alert('Coronas insuficientes', `Necesitas ${item.price - totalCoins} coronas más para comprar "${item.name}".`);
      return;
    }
    setConfirmItem(item);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmItem) return;
    const success = await spendCoins(confirmItem.price);
    if (success) {
      await onPurchaseMade(confirmItem.type, confirmItem.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setConfirmItem(null);
  };

  const handleApply = async (item: ShopItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (item.type === 'background') {
      // Toggle: if already active, deactivate
      if (activeBackground === item.id) {
        await setActiveBackground(null);
      } else {
        await setActiveBackground(item.id);
      }
    } else {
      if (activeOutfit === item.id) {
        await setActiveOutfit(null);
      } else {
        await setActiveOutfit(item.id);
      }
    }
  };

  // Convert store achievements to display format
  const achievementsList: Achievement[] = Object.values(ACHIEVEMENT_DEFINITIONS).map((def) => {
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

  const renderShopItem = (item: ShopItem) => {
    const owned = isOwned(item);
    const active = isActive(item);
    const canAfford = totalCoins >= item.price;
    const isOutfit = item.type === 'outfit';

    return (
      <Pressable
        key={item.id}
        style={styles.shopItem}
        onPress={() => !owned && handleItemPress(item)}
      >
        <View style={[styles.shopImageContainer, active && styles.shopImageContainerActive]}>
          <Image
            source={item.image}
            style={isOutfit ? styles.shopImageOutfit : styles.shopImage}
            resizeMode={isOutfit ? 'contain' : 'cover'}
          />
          {/* Lock overlay for non-owned */}
          {!owned && (
            <View style={styles.lockOverlay}>
              <Lock size={24} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
            </View>
          )}
          {/* Active check badge */}
          {active && (
            <View style={styles.activeBadge}>
              <Check size={14} color="#fff" strokeWidth={3} />
            </View>
          )}
        </View>

        {/* Bottom: price or Apply button */}
        {owned ? (
          <Pressable
            style={[styles.applyButton, active && styles.applyButtonActive]}
            onPress={() => handleApply(item)}
          >
            <Text style={[styles.applyButtonText, active && styles.applyButtonTextActive]}>
              {active ? 'Activo' : 'Aplicar'}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.priceRow, !canAfford && styles.priceRowDisabled]}>
            <Crown size={14} color={canAfford ? colors.primary : colors.textSecondary} strokeWidth={2.5} />
            <Text style={[styles.priceText, !canAfford && styles.priceTextDisabled]}>{item.price}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <CoinsCounter coins={totalCoins} size="large" />
        <Crown size={24} color={colors.primary} strokeWidth={2.5} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'logros' && styles.tabActive]}
          onPress={() => handleTabPress('logros')}
        >
          <Text style={[styles.tabText, activeTab === 'logros' && styles.tabTextActive]}>
            Logros
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'tienda' && styles.tabActive]}
          onPress={() => handleTabPress('tienda')}
        >
          <Text style={[styles.tabText, activeTab === 'tienda' && styles.tabTextActive]}>
            Tienda
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === 'logros' ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Streak Multiplier Banner */}
          {appStreak > 0 && (
            <View style={styles.multiplierBanner}>
              <Text style={styles.multiplierText}>
                🔥 ¡Tu racha de {appStreak} día{appStreak !== 1 ? 's' : ''} aumentará las coronas que recibas hoy en un {Math.round(appStreak * 15)}%!
              </Text>
            </View>
          )}

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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.shopContentContainer}>
          {/* Backgrounds Section */}
          <Text style={styles.shopSectionTitle}>Fondos</Text>
          <View style={styles.shopGrid}>
            {SHOP_ITEMS.filter(i => i.type === 'background').map(renderShopItem)}
          </View>

          {/* Outfits Section */}
          <Text style={styles.shopSectionTitle}>Outfits</Text>
          <View style={styles.shopGrid}>
            {SHOP_ITEMS.filter(i => i.type === 'outfit').map(renderShopItem)}
          </View>
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
                <View style={styles.modalImageContainer}>
                  <Image
                    source={confirmItem.image}
                    style={confirmItem.type === 'outfit' ? styles.modalImageOutfit : styles.modalImage}
                    resizeMode={confirmItem.type === 'outfit' ? 'contain' : 'cover'}
                  />
                </View>
                <Text style={styles.modalTitle}>¿Comprar "{confirmItem.name}"?</Text>
                <View style={styles.modalPriceRow}>
                  <Crown size={18} color={colors.primary} strokeWidth={2.5} />
                  <Text style={styles.modalPriceText}>{confirmItem.price}</Text>
                </View>
                <Text style={styles.modalBalance}>
                  Tendrás {totalCoins - confirmItem.price} coronas después de la compra
                </Text>
                <View style={styles.modalButtons}>
                  <Pressable style={styles.modalCancelButton} onPress={() => setConfirmItem(null)}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.modalConfirmButton} onPress={handleConfirmPurchase}>
                    <Text style={styles.modalConfirmText}>Comprar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  backButton: {
    padding: 4,
    width: 36,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
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
  multiplierBanner: {
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  multiplierText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Shop
  shopContentContainer: {
    padding: GRID_PADDING,
    paddingBottom: 40,
  },
  shopSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -(GRID_GAP / 2),
    marginBottom: 24,
  },
  shopItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginHorizontal: GRID_GAP / 2,
    marginBottom: GRID_GAP,
  },
  shopImageContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: `${colors.textPrimary}10`,
    position: 'relative',
  },
  shopImageContainerActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopImageOutfit: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  activeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  priceRowDisabled: {
    opacity: 0.5,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  priceTextDisabled: {
    color: colors.textSecondary,
  },
  // Apply button
  applyButton: {
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  applyButtonActive: {
    backgroundColor: `${colors.primary}30`,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  applyButtonTextActive: {
    color: colors.primary,
  },
  // Confirmation Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: `${colors.textPrimary}10`,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalImageOutfit: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  modalPriceText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  modalBalance: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
});
