import { colors } from '@/constants/theme';
import { ActivityButton } from '@/src/components/ActivityButton';
import { NotificationCard } from '@/src/components/NotificationCard';
import { WeeklyCalendar } from '@/src/components/WeeklyCalendar';
import { useBottomTabInset } from '@/src/hooks/useBottomTabInset';
import { Link2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

interface Activity {
  id: string;
  title: string;
  emoji: string;
  metric: string;
  color: string;
  action: 'add' | 'play';
  completed: boolean;
}

export default function PlanScreen() {
  const bottomInset = useBottomTabInset();
  
  const [recipeUrl, setRecipeUrl] = useState('');
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: 'running',
      title: 'Running',
      emoji: '👟',
      metric: '5 mi',
      color: '#A8E6CF',
      action: 'add',
      completed: false,
    },
    {
      id: 'reading',
      title: 'Reading',
      emoji: '📚',
      metric: '41m 13s',
      color: '#FF8B94',
      action: 'play',
      completed: false,
    },
  ]);

  const toggleActivityStatus = (id: string) => {
    setActivities(prevActivities =>
      prevActivities.map(activity =>
        activity.id === id
          ? { ...activity, completed: !activity.completed }
          : activity
      )
    );
  };

  const loadRecipeFromUrl = async () => {
    if (!recipeUrl.trim()) {
      Alert.alert('Error', 'Pega una URL de receta primero');
      return;
    }

    setIsLoadingRecipe(true);
    try {
      const response = await fetch(
        'https://wdqwgqfisiteswbbdurg.supabase.co/functions/v1/parse-recipe',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: recipeUrl }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.tasks || data.tasks.length === 0) {
        Alert.alert('Aviso', 'No se encontraron pasos en esta receta');
        return;
      }

      // Convertir tasks de la receta en activities
      const recipeActivities: Activity[] = data.tasks.map((task: any, index: number) => ({
        id: `recipe-${Date.now()}-${index}`,
        title: task.title,
        emoji: '🍳',
        metric: `${task.duration} min`,
        color: '#FFD93D',
        action: 'play' as const,
        completed: false,
      }));

      // Agregar las nuevas actividades al principio
      setActivities(prev => [...recipeActivities, ...prev]);
      setRecipeUrl('');
      
      Alert.alert(
        '✅ Receta cargada', 
        `${data.title}\n\n${data.tasks.length} pasos agregados a tus tareas`
      );

    } catch (error) {
      console.error('Error cargando receta:', error);
      Alert.alert('Error', 'No se pudo cargar la receta. Verifica la URL.');
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const pendingActivities = activities.filter(a => !a.completed);
  const completedActivities = activities.filter(a => a.completed);
  const totalCompleted = completedActivities.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <WeeklyCalendar />

        <View style={styles.notificationWrapper}>
          <NotificationCard 
            tasksCompleted={{
              day: totalCompleted,
              week: totalCompleted + 6,
              month: totalCompleted + 22,
            }}
          />
        </View>

        {/* Input para cargar recetas */}
        <View style={styles.recipeInputContainer}>
          <View style={styles.inputWrapper}>
            <Link2 size={20} color={colors.textTertiary} />
            <TextInput
              style={styles.recipeInput}
              placeholder="Pega una URL de receta aquí..."
              placeholderTextColor={colors.textTertiary}
              value={recipeUrl}
              onChangeText={setRecipeUrl}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoadingRecipe}
            />
          </View>
          <Pressable 
            style={[styles.loadButton, isLoadingRecipe && styles.loadButtonDisabled]}
            onPress={loadRecipeFromUrl}
            disabled={isLoadingRecipe}
          >
            {isLoadingRecipe ? (
              <ActivityIndicator size="small" color="#1C2120" />
            ) : (
              <Text style={styles.loadButtonText}>Cargar</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Por Hacer</Text>
        </View>

        <View style={styles.activitiesContainer}>
          {pendingActivities.length === 0 ? (
            <Text style={styles.emptyPlaceholder}>
              No tienes tareas para hoy. Agrega una pinchando +
            </Text>
          ) : (
            pendingActivities.map(activity => (
              <ActivityButton
                key={activity.id}
                title={activity.title}
                emoji={activity.emoji}
                metric={activity.metric}
                color={activity.color}
                action={activity.action}
                completed={false}
                onPress={() => toggleActivityStatus(activity.id)}
              />
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Completadas</Text>
        </View>

        <View style={styles.activitiesContainer}>
          {completedActivities.map(activity => (
            <ActivityButton
              key={activity.id}
              title={activity.title}
              emoji={activity.emoji}
              metric={activity.metric}
              color={activity.color}
              action={activity.action}
              completed={true}
              onPress={() => toggleActivityStatus(activity.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F9F8',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    // paddingBottom será aplicado dinámicamente con bottomInset
  },
  notificationWrapper: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C2120',
    letterSpacing: 0.5,
  },
  activitiesContainer: {
    paddingHorizontal: 20,
  },
  emptyPlaceholder: {
    fontSize: 16,
    color: '#1C2120',
    opacity: 0.3,
    textAlign: 'center',
    paddingVertical: 32,
  },
  recipeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 230, 207, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  recipeInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C2120',
    fontWeight: '500',
  },
  loadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  loadButtonDisabled: {
    opacity: 0.6,
  },
  loadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2120',
  },
});