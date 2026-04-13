import { colors } from '@/constants/theme';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('AppErrorBoundary caught:', error, errorInfo);
    }
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>¡Algo salió mal!</Text>
          <Text style={styles.message}>
            La app encontró un error inesperado.{'\n'}
            No te preocupes, tus datos están seguros.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={this.handleRestart}
          >
            <Text style={styles.buttonText}>Reiniciar App</Text>
          </Pressable>

          {__DEV__ && this.state.error && (
            <View style={styles.devInfo}>
              <Text style={styles.devTitle}>Debug Info:</Text>
              <Text style={styles.devText}>{this.state.error.message}</Text>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  devInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    width: '100%',
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  devText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'SpaceMono',
  },
});
