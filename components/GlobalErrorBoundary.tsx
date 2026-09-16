import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reportError } from '../services/errorReporting';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Перехватывает ошибки рендера в дереве React, сообщает о них через
 * {@link reportError} (чтобы показать {@link ErrorBanner}) и подменяет
 * сломанное поддерево на экран-заглушку с возможностью повторить попытку.
 */
export class GlobalErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    reportError(error);
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.message}>{error.message}</Text>
          <Pressable onPress={this.retry} style={styles.button}>
            <Text style={styles.buttonText}>Повторить</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
