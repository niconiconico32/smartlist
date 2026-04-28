import { colors } from '@/constants/theme';
import { Dimensions, StyleSheet } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================
// SHARED LAYOUT STYLES
// ============================================
export const layoutStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
  },
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  slide: {
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButtonArea: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    fontSize: 30,
    color: colors.textPrimary,
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  progressBarWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: colors.surface,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },

  // Navigation
  navigationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // Dev
  devCloseButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.textPrimary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.textPrimary}33`,
  },
  devCloseButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
    marginTop: -2,
  },
});

// ============================================
// SHARED SLIDE STYLES (titles, subtitles, pills, etc.)
// ============================================
export const slideStyles = StyleSheet.create({
  // Titles
  slideTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f2f2f2',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 24,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  slideSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.surface,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },

  // Logo
  logoImageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImageSmall: {
    width: 80,
    height: 80,
  },

  // Pill grid (for single/multi-select)
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: `${colors.textPrimary}0D`,
    gap: 8,
  },
  pillSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  // Goals grid
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: `${colors.textPrimary}0D`,
    gap: 8,
  },
  goalPillSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  goalEmoji: {
    fontSize: 18,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  // Name input
  nameInputContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 18,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}0D`,
    textAlign: 'center',
  },

  // Agreement
  statementSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statementWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: 32,
    paddingTop: 24,
  },
  statementOwl: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 72,
    height: 72,
    zIndex: 10,
  },
  speechCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}1A`,
    padding: 24,
    marginLeft: 40,
    marginTop: 16,
  },
  quoteOpen: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.accent,
    lineHeight: 36,
    marginBottom: 4,
  },
  quoteClose: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.accent,
    lineHeight: 36,
    textAlign: 'right',
    marginTop: 4,
  },
  speechCardText: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  speechCardHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  agreementOptions: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 20,
  },
  agreementOption: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  agreementOptionGradient: {
    borderRadius: 32,
    padding: 2,
  },
  agreementOptionInner: {
    backgroundColor: colors.background,
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.textPrimary}33`,
  },
  agreementOptionSelected: {
    shadowOpacity: 0.35,
  },
  agreementOptionInnerSelected: {
    backgroundColor: '#F2E852',
    borderColor: `${colors.textPrimary}26`,
  },
  agreementOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  agreementOptionTextSelected: {
    color: colors.textTertiary,
    fontWeight: '600',
  },

  // Welcome
  welcomeSlideSimple: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  welcomeContentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeDialogueArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeMascotCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  welcomeMascotLarge: {
    width: 190,
    height: 190,
  },
  welcomeTitleCenter: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  welcomeSubtitleCenter: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  welcomeButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  welcomeButtonSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: `${colors.textPrimary}33`,
  },
  welcomeButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  // Speech bubble
  speechBubbleContainer: {
    alignItems: 'center',
    marginBottom: 0,
    minHeight: 90,
  },
  speechBubble: {
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: colors.textRoutineCard,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: SCREEN_WIDTH - 80,
    minWidth: SCREEN_WIDTH * 0.6,
    minHeight: 90,
    justifyContent: 'center',
  },
  speechBubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.textRoutineCard,
    marginTop: -1,
  },
  speechBubbleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Task demo
  taskMascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  taskMascotImage: {
    width: 80,
    height: 80,
    marginTop: 4,
  },
  taskSpeechBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}1A`,
    padding: 16,
    position: 'relative',
  },
  taskSpeechText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 24,
  },
  taskInputContainer: {
    width: '100%',
    marginBottom: 24,
    position: 'relative',
  },
  taskInput: {
    backgroundColor: `${colors.textRoutineCard}33`,
    borderRadius: 20,
    padding: 18,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 3,
    borderColor: colors.primary,
    minHeight: 220,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  generateButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  generateButton: {
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 6,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${colors.textPrimary}1A`,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Neuroscience
  neuroscienceContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  neuroscienceTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  neuroscienceSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
