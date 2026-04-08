import { colors } from '@/constants/theme';
import { Achievement, AchievementCard } from '@/src/components/AchievementCard';
import { CoinsCounter } from '@/src/components/CoinsCounter';
import { ACHIEVEMENT_DEFINITIONS, useAchievementsStore } from '@/src/store/achievementsStore';
import { useAppStreakStore } from '@/src/store/appStreakStore';
import { useProStore } from '@/src/store/proStore';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { PaywallModal } from '@/src/components/PaywallModal';
import { ProTrialOfferModal } from '@/src/components/ProTrialOfferModal';
import { Calendar, ChevronLeft, Crown, Flame, Lock, Store, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  // Backgrounds (PNG - originales)
  { id: 'bg_spring', name: 'Primavera', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/spring.png') },
  { id: 'bg_beach', name: 'Playa', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/beach.png') },
  { id: 'bg_autumn', name: 'Otoño', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/autumm.png') },
  { id: 'bg_winter', name: 'Invierno', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/winter.png') },
  { id: 'bg_woods', name: 'Bosque', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/woods.png') },
  // Backgrounds (WEBP - nuevos)
  { id: 'bg_w1', name: 'Fondo 1', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/1.webp') },
  { id: 'bg_w2', name: 'Fondo 2', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/2.webp') },
  { id: 'bg_w3', name: 'Fondo 3', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/3.webp') },
  { id: 'bg_w4', name: 'Fondo 4', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/4.webp') },
  { id: 'bg_w5', name: 'Fondo 5', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/5.webp') },
  { id: 'bg_w6', name: 'Fondo 6', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/6.webp') },
  { id: 'bg_w7', name: 'Fondo 7', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/7.webp') },
  { id: 'bg_w8', name: 'Fondo 8', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/8.webp') },
  { id: 'bg_w9', name: 'Fondo 9', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/9.webp') },
  { id: 'bg_w10', name: 'Fondo 10', price: BG_PRICE, type: 'background' as const, image: require('@/assets/images/pixelbgs/10.webp') },
  // Outfits (PNG - originales)
  { id: 'outfit_1_1', name: 'Outfit 1', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_1.png') },
  { id: 'outfit_1_2', name: 'Outfit 2', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_2.png') },
  { id: 'outfit_1_3', name: 'Outfit 3', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_3.png') },
  { id: 'outfit_1_4', name: 'Outfit 4', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/1_4.png') },
  // Outfits (WEBP - nuevos)
  { id: 'outfit_w5',  name: 'Outfit 5',  price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/5.webp') },
  { id: 'outfit_w6',  name: 'Outfit 6',  price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/6.webp') },
  { id: 'outfit_w7',  name: 'Outfit 7',  price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/7.webp') },
  { id: 'outfit_w8',  name: 'Outfit 8',  price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/8.webp') },
  { id: 'outfit_w9',  name: 'Outfit 9',  price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/9.webp') },
  { id: 'outfit_w10', name: 'Outfit 10', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/10.webp') },
  { id: 'outfit_w11', name: 'Outfit 11', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/11.webp') },
  { id: 'outfit_w12', name: 'Outfit 12', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/12.webp') },
  { id: 'outfit_w13', name: 'Outfit 13', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/13.webp') },
  { id: 'outfit_w14', name: 'Outfit 14', price: OUTFIT_PRICE, type: 'outfit' as const, image: require('@/assets/images/outfits/14.webp') },
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
  const { streak: appStreak, getMultiplier } = useAppStreakStore();
  const { isPro } = useProStore();
  const [activeTab, setActiveTab] = useState<TabType>('logros');
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTrialOffer, setShowTrialOffer] = useState(false);

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

  const renderShopItem = ({ item }: { item: ShopItem }) => {
    const owned = isOwned(item);
    const active = isActive(item);
    const canAfford = totalCoins >= item.price;
    const isOutfit = item.type === 'outfit';

    return (
      <View key={item.id} style={styles.shopItemCard}>
        <View style={[styles.shopImageContainer, active && styles.shopImageContainerActive]}>
          <Image 
            source={item.image} 
            style={item.type === 'outfit' ? styles.shopOutfitImage : styles.shopImage} 
            resizeMode={item.type === 'outfit' ? 'contain' : 'cover'}
          />
        </View>
        
        <View style={styles.shopItemDetails}>
          <Text style={styles.shopItemName} numberOfLines={1}>{item.name}</Text>
          
          {!owned ? (
            <Pressable 
              style={[
                styles.actionButton, 
                totalCoins >= item.price ? styles.buyButtonAffordable : styles.buyButtonLocked
              ]}
              onPress={() => setConfirmItem(item)}
              disabled={totalCoins < item.price}
            >
              {totalCoins < item.price ? (
                <Lock size={14} color="#9CA3AF" strokeWidth={2.5} />
              ) : (
                <Crown size={14} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={[styles.actionButtonText, totalCoins >= item.price ? styles.buyButtonTextAffordable : styles.buyButtonTextLocked]}>
                {item.price}
              </Text>
            </Pressable>
          ) : (
            <Pressable 
              style={[
                styles.actionButton, 
                active ? styles.applyButtonActive : styles.applyButton
              ]}
              onPress={() => handleApply(item)}
            >
              <Text style={[styles.actionButtonText, active ? styles.applyButtonTextActive : styles.applyButtonText]}>
                {active ? 'Equipado' : 'Equipar'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginTop: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => router.push('/onboardingfinal')}
            style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>🚀 Onb.</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowPaywall(true)}
            style={{ flex: 1, backgroundColor: '#8B5CF6', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>💰 Pay</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowTrialOffer(true)}
            style={{ flex: 1, backgroundColor: '#D946EF', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>🎁 Gift</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const current = useAchievementsStore.getState().totalCoins;
              useAchievementsStore.setState({ totalCoins: current + 1000 });
            }}
            style={{ flex: 1, backgroundColor: '#F59E0B', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>👑 +1k</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.mainContent}>
        {/* Content */}
        {activeTab === 'logros' ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
            {/* Top Dashboard Headers */}
            <View style={styles.dashboardContainer}>
              {/* Top Stat: Logros Completados */}
              <View style={styles.dashboardTopCard}>
                <View style={styles.dashboardRow}>
                  <Calendar size={22} color={colors.background} strokeWidth={2.5} />
                  <Text style={styles.dashboardValueText}>
                    {achievementsList.filter(a => a.completed).length}/{achievementsList.length}
                  </Text>
                </View>
                <Text style={styles.dashboardLabelText}>Logros Completados</Text>
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

                <View style={[styles.dashboardSplitCard, { backgroundColor: colors.primary, borderColor: colors.primary, elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }]}>
                  <View style={styles.dashboardRow}>
                    <Crown size={22} color="#111827" strokeWidth={2.5} />
                    <Text style={styles.dashboardValueText}>x{getMultiplier()}</Text>
                  </View>
                  <Text style={[styles.dashboardLabelText, { color: '#374151' }]}>Multiplicador</Text>
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
                  onPress={() => { }}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.shopContentContainer}>
            {/* Backgrounds Section */}
            <Text style={styles.shopSectionTitle}>Fondos</Text>
            <FlatList
              data={SHOP_ITEMS.filter(i => i.type === 'background')}
              renderItem={renderShopItem}
              keyExtractor={item => item.id}
              numColumns={NUM_COLUMNS}
              scrollEnabled={false}
              columnWrapperStyle={styles.shopFlatListRow}
              contentContainerStyle={{ marginBottom: 24 }}
            />

            {/* Outfits Section */}
            <Text style={styles.shopSectionTitle}>Outfits</Text>
            <FlatList
              data={SHOP_ITEMS.filter(i => i.type === 'outfit')}
              renderItem={renderShopItem}
              keyExtractor={item => item.id}
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
      </View>

      {/* Footer Tabs */}
      <View style={styles.footerContainer}>
        <Pressable
          style={styles.footerTab}
          onPress={() => handleTabPress('logros')}
        >
          <Trophy
            size={24}
            color={activeTab === 'logros' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'logros' ? 2.5 : 2}
          />
          <Text style={[styles.footerTabText, activeTab === 'logros' && styles.footerTabTextActive]}>
            Logros
          </Text>
        </Pressable>

        <Pressable
          style={styles.footerTab}
          onPress={() => handleTabPress('tienda')}
        >
          <Store
            size={24}
            color={activeTab === 'tienda' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'tienda' ? 2.5 : 2}
          />
          <Text style={[styles.footerTabText, activeTab === 'tienda' && styles.footerTabTextActive]}>
            Tienda
          </Text>
        </Pressable>
      </View>
      {/* Paywall Modal */}
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      <ProTrialOfferModal visible={showTrialOffer} onClose={() => setShowTrialOffer(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF0FC',
  },
  mainContent: {
    flex: 1,
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
  crownsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0FC', // soft grayish blue based on the image
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 42,
    gap: 6,
    position: 'relative',
  },
  // Footer
  footerContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAF0FC',
    paddingTop: 12,
    paddingBottom: 8,
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  footerTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  footerTabTextActive: {
    color: '#111827',
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
  // Dashboard
  dashboardContainer: {
    gap: 12,
    marginBottom: 24,
  },
  dashboardTopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardSplitContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dashboardSplitCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dashboardValueText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  dashboardLabelText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
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
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -(GRID_GAP / 2),
    marginBottom: 24,
  },
  shopFlatListRow: {
    justifyContent: 'flex-start',
    marginHorizontal: -(GRID_GAP / 2),
  },
  shopItemCard: {
    width: ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    marginHorizontal: GRID_GAP / 2,
    marginBottom: GRID_GAP,
  },
  shopImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shopImageContainerActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopOutfitImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 0.8 }],
  },
  // Removed ownedBadge
  shopItemDetails: {
    alignItems: 'center',
    gap: 10,
  },
  shopItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
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
    backgroundColor: '#F3F4F6',
  },
  buyButtonTextAffordable: {
    color: '#FFFFFF',
  },
  buyButtonTextLocked: {
    color: '#9CA3AF',
  },
  applyButton: {
    backgroundColor: '#EAF0FC',
  },
  applyButtonText: {
    color: colors.background,
  },
  applyButtonActive: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  applyButtonTextActive: {
    color: '#9CA3AF',
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
