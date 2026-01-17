import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Mic, MicOff, Sparkles, X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tipos
interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  isListening: boolean;
  isProcessing?: boolean;
  transcribedText?: string;
}

// Chips de sugerencia rápida
const QUICK_CHIPS = [
  { label: 'Hoy', icon: Calendar },
  { label: 'Mañana', icon: Clock },
  { label: 'Urgente', icon: Zap },
];

export function TaskModalNew({
  visible,
  onClose,
  onSubmit,
  onVoiceStart,
  onVoiceStop,
  isListening,
  isProcessing = false,
  transcribedText = '',
}: TaskModalProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animaciones
  const micScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const iconRotation = useSharedValue(0);
  const waveHeights = useRef([
    useSharedValue(8),
    useSharedValue(12),
    useSharedValue(16),
    useSharedValue(12),
    useSharedValue(8),
  ]).current;

  // Sincronizar texto transcrito con el estado local
  useEffect(() => {
    if (transcribedText && transcribedText.trim()) {
      setText(transcribedText);
    }
  }, [transcribedText]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      // Focus input after a small delay to ensure modal is visible
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      // Reset all states when modal closes
      setText('');
      setIsRecording(false);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    }
  }, [visible]);

  // Efecto "Respiración" para el micrófono cuando está grabando
  useEffect(() => {
    if (isListening || isRecording) {
      micScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 })
        ),
        -1,
        false
      );
      
      // Animar las barras de onda
      waveHeights.forEach((height, index) => {
        const randomHeight = 8 + Math.random() * 24;
        height.value = withRepeat(
          withSequence(
            withTiming(randomHeight, { duration: 300 + index * 50 }),
            withTiming(8 + Math.random() * 16, { duration: 300 + index * 50 })
          ),
          -1,
          true
        );
      });
    } else {
      micScale.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0.5, { duration: 200 });
      waveHeights.forEach((height) => {
        height.value = withTiming(8, { duration: 200 });
      });
    }
  }, [isListening, isRecording]);

  // Palpitación suave del micrófono (siempre activa)
  useEffect(() => {
    micPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Animación de carga para el botón de generar
  useEffect(() => {
    if (isProcessing) {
      iconRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      iconRotation.value = withTiming(0, { duration: 300 });
    }
  }, [isProcessing, iconRotation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  // Manejadores
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Stop recording if active
    if (isRecording || isListening) {
      onVoiceStop();
      setIsRecording(false);
    }
    
    onClose();
  }, [isRecording, isListening, onVoiceStop, onClose]);

  const handleSubmit = useCallback(() => {
    if (!text.trim() && !isProcessing) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animación de "apretar" botón
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );
    
    onSubmit(text.trim());
  }, [text, isProcessing, onSubmit, buttonScale]);

  const handleMicPressIn = useCallback(() => {
    if (isProcessing) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(true);
    onVoiceStart();
    
    // Auto-stop recording after 30 seconds max
    recordingTimeoutRef.current = setTimeout(() => {
      handleMicPressOut();
    }, 30000);
  }, [isProcessing, onVoiceStart]);

  const handleMicPressOut = useCallback(() => {
    if (!isRecording && !isListening) return;
    
    // Clear the timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecording(false);
    onVoiceStop();
  }, [isRecording, isListening, onVoiceStop]);

  const handleMicToggle = useCallback(() => {
    if (isRecording || isListening) {
      handleMicPressOut();
    } else {
      handleMicPressIn();
    }
  }, [isRecording, isListening, handleMicPressIn, handleMicPressOut]);

  // Estilos animados
  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isListening || isRecording ? micScale.value : micPulse.value }
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Estilos para las barras de onda
  const waveBarStyles = waveHeights.map((height) =>
    useAnimatedStyle(() => ({
      height: height.value,
    }))
  );

  const isActive = isListening || isRecording;
  const canSubmit = text.trim().length > 0 || isProcessing;

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoid}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <TouchableWithoutFeedback>
                <Animated.View 
                  entering={SlideInDown.springify().damping(20).mass(0.5).stiffness(100)}
                  exiting={SlideOutDown.duration(200)}
                  style={styles.animatedContainer}
                >
                  {/* Efecto Glassmorphism */}
                  <BlurView intensity={95} tint="light" style={styles.blurContainer}>
                    
                    {/* Handle Bar */}
                    <View style={styles.handleBar} />
                    
                    {/* Header: Título + Cerrar */}
                    <View style={styles.header}>
                      <View style={styles.headerLeft}>
                        <View style={styles.headerLine} />
                        <Text style={styles.headerTitle}>
                          Nueva Misión
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={handleClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X size={20} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    {/* Input Principal "Brain Dump" */}
                    <View style={styles.inputContainer}>
                      {isActive ? (
                        <View style={styles.listeningContainer}>
                          <Animated.Text 
                            style={[styles.listeningText, glowStyle]}
                            entering={FadeIn.duration(200)}
                          >
                            {isProcessing ? 'Procesando...' : 'Escuchando...'}
                          </Animated.Text>
                          {/* Visualización de ondas animadas */}
                          <View style={styles.waveContainer}>
                            {waveBarStyles.map((style, i) => (
                              <Animated.View 
                                key={i} 
                                style={[styles.waveBar, style]}
                              />
                            ))}
                          </View>
                          {isProcessing && (
                            <Text style={styles.processingHint}>
                              Convirtiendo voz a texto...
                            </Text>
                          )}
                        </View>
                      ) : (
                        <TextInput
                          ref={inputRef}
                          multiline
                          placeholder="Sácalo de tu mente..."
                          placeholderTextColor="#94a3b8"
                          value={text}
                          onChangeText={setText}
                          style={styles.textInput}
                          selectionColor="#7c3aed"
                          maxLength={500}
                          textAlignVertical="top"
                          returnKeyType="default"
                          blurOnSubmit={false}
                        />
                      )}
                    </View>

                    {/* Chips de Sugerencia */}
                    {!isActive && (
                      <View style={styles.chipsContainer}>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false} 
                          contentContainerStyle={styles.chipsScrollContent}
                        >
                          {QUICK_CHIPS.map((chip, index) => (
                            <Pressable
                              key={index}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setText((prev) => `${prev}${prev ? ' ' : ''}#${chip.label}`);
                              }}
                              style={({ pressed }) => [
                                styles.chip,
                                pressed && styles.chipPressed
                              ]}
                            >
                              <chip.icon size={14} color="#64748b" style={{ marginRight: 6 }} />
                              <Text style={styles.chipText}>
                                {chip.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* The Control Deck: Mic + Action Button */}
                    <View style={styles.controlDeck}>
                      
                      {/* Botón Micrófono (Con efecto breathing) */}
                      <Animated.View style={micAnimatedStyle}>
                        <Pressable
                          onPress={handleMicToggle}
                          onLongPress={handleMicPressIn}
                          delayLongPress={200}
                          disabled={isProcessing}
                          style={({ pressed }) => [
                            styles.micButton,
                            isActive && styles.micButtonActive,
                            pressed && !isActive && styles.micButtonPressed,
                            isProcessing && styles.micButtonDisabled,
                          ]}
                        >
                          {isActive ? (
                            <MicOff size={24} color="white" />
                          ) : (
                            <Mic size={24} color="white" />
                          )}
                        </Pressable>
                      </Animated.View>

                      {/* Botón Principal: Generar */}
                      <Animated.View style={[buttonAnimatedStyle, { flex: 1 }]}>
                        <Pressable
                          onPress={handleSubmit}
                          disabled={!canSubmit || isActive}
                          style={[
                            styles.submitButton,
                            !canSubmit || isActive ? styles.submitButtonDisabled : {}
                          ]}
                        >
                          {canSubmit && !isActive ? (
                            <LinearGradient
                              colors={['#CBA6F7', '#FAB387']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.submitButtonGradient}
                            >
                              <Animated.View style={iconAnimatedStyle}>
                                <Sparkles 
                                  size={20} 
                                  color="#ffffff"
                                  style={{ marginRight: 8 }}
                                />
                              </Animated.View>
                              <Text style={styles.submitButtonTextActive}>
                                {isProcessing ? 'Generando...' : 'Generar Subtarea'}
                              </Text>
                            </LinearGradient>
                          ) : (
                            <>
                              <Animated.View style={iconAnimatedStyle}>
                                <Sparkles 
                                  size={20} 
                                  color="#94a3b8" 
                                  style={{ marginRight: 8 }}
                                />
                              </Animated.View>
                              <Text style={styles.submitButtonTextDisabled}>
                                {isProcessing ? 'Generando...' : 'Generar Subtarea'}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </Animated.View>

                    </View>

                    {/* Hint Text */}
                    <Text style={styles.hintText}>
                      {isActive 
                        ? 'Toca el micrófono para detener'
                        : 'Mantén presionado el micrófono para grabar'
                      }
                    </Text>

                  </BlurView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  animatedContainer: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  blurContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLine: {
    width: 4,
    height: 24,
    backgroundColor: '#7c3aed',
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 50,
  },
  inputContainer: {
    minHeight: 100,
    maxHeight: 180,
    marginBottom: 20,
    justifyContent: 'flex-start',
  },
  listeningContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  listeningText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#7c3aed',
    textAlign: 'center',
  },
  processingHint: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#a78bfa',
    borderRadius: 3,
    minHeight: 8,
  },
  textInput: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1e293b',
    lineHeight: 32,
    minHeight: 80,
    maxHeight: 160,
    paddingTop: 0,
  },
  chipsContainer: {
    marginBottom: 20,
  },
  chipsScrollContent: {
    gap: 10,
    paddingRight: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipPressed: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  chipText: {
    color: '#64748b',
    fontWeight: '500',
    fontSize: 14,
  },
  controlDeck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#FCA5A5',
    shadowOpacity: 0.4,
  },
  micButtonPressed: {
    backgroundColor: '#DC2626',
    opacity: 0.9,
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  submitButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  submitButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  submitButtonTextDisabled: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
  },
});
