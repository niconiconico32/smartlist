import { Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- 2026 Design Tokens ---
export const C = {
  deepNight: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceLight: '#F1F5F9',
  indigo: '#6366F1',
  indigoMuted: 'rgba(99, 102, 241, 0.1)',
  indigoGlow: 'rgba(99, 102, 241, 0.3)',
  amber: '#D97706',
  amberMuted: 'rgba(217, 119, 6, 0.1)',
  white: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textBlack: '#0F172A',
  textDim: '#94A3B8',
  glassBg: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  danger: '#EF4444',
  success: '#10B981',
};

export const copilotStyles = StyleSheet.create({
  // --- Layout ---
  container: { flex: 1, backgroundColor: C.deepNight },
  gradient: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleSpacer: {
    flex: 1,
  },

  // --- Idle Phase Layout ---
  idleContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },

  // --- Top Mascot ---
  speechBubbleContainer: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 40,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  speechBubbleText: {
    fontFamily: 'Jersey10',
    fontSize: 22, // Increased size for pixel font legibility
    color: '#eaeaeaff',
    textAlign: 'center',
    lineHeight: 26,
  },
  topMascotContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  topMascotImage: {
    width: 80,
    height: 80,
  },
  mascotNameText: {
    fontSize: 14,
    fontWeight: '400',
    color: C.white,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
    fontStyle: 'italic',
  },

  // --- Bento Grid ---
  bentoScrollContent: {
    flexDirection: 'column',
    gap: 8,
     marginTop: 16,
    marginBottom: 8,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  bentoPillPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  bentoPillIcon: {
    marginRight: 4,
  },
  bentoPillText: {
    color: C.textPrimary,
    fontWeight: '600',
    fontSize: 11,
  },

  // --- Mic Button ---
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Take up middle space
  },
  micWaveRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(118, 99, 242, 0.25)', // Subtle purple from the theme surface
  },
  micWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micAura: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.indigo,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  micHint: {
    color: C.textDim,
    fontSize: 12,
    marginTop: 18,
    letterSpacing: 0.3,
    fontWeight: '500',
    textAlign: 'center',
  },
  micHintActive: {
    color: C.danger,
    fontWeight: '600',
  },
  micLabel: {
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  micLabelActive: {
    color: C.danger,
  },
  micProcessing: {
    color: C.amber,
    fontSize: 13,
    marginTop: 14,
    fontWeight: '600',
  },

  // --- Text Input Bar (Minimalist) ---
  altInputWrapper: {
    width: '100%',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  altInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 8,
  },
  altInput: {
    flex: 1,
    fontSize: 16,
    color: C.textPrimary,
    paddingHorizontal: 4,
    minHeight: 40,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  recordingOverlayContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: C.surface,
    zIndex: 10,
  },
  recordingRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.danger,
    marginRight: 10,
  },
  recordingOverlayText: {
    fontSize: 15,
    color: C.textSecondary,
    fontStyle: 'italic',
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: C.indigo,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: C.surfaceLight,
  },

  // --- Processing State ---
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingMascot: {
    width: 100,
    height: 100,
  },
  processingText: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: C.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },

  // --- Result / Expanded State (ScrollView) ---
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  resultContent: {
    alignItems: 'center',
    width: '100%',
  },
  resultMascot: {
    width: 90,
    height: 90,                                                                                                                                                                                                                                                                                    
    marginBottom: 16,
  },
  analysisCard: {
    padding: 24,
    width: '100%',               
    marginBottom: 24,
  },
  expandedInput: {                                       
    fontSize: 22,
    lineHeight: 24,            
    color: C.textPrimary,
    minHeight: 120,         
    textAlignVertical: 'top',
    fontWeight: 300,
  },                          
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  taskBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.indigoMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskBulletText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.indigo,
  },
  taskText: {
    fontSize: 15,
    color: C.textPrimary,
    lineHeight: 22,
  },
  taskDuration: {
    fontSize: 13,
    color: C.amber,
    fontWeight: '600',
    marginTop: 2,
  },
  resultActions: {
    width: '100%',
    gap: 12,
  },
  startButton: {
    backgroundColor: C.indigo,
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonPressed: {
    backgroundColor: '#4F46E5',
  },
  startButtonText: {
    color: C.white,
    fontFamily: 'Jersey10',
    fontSize: 22,
    letterSpacing: 2,
  },
  adjustButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  adjustButtonPressed: {
  },
  adjustButtonText: {
    color: C.textSecondary,
    fontSize: 14,
  },
});
