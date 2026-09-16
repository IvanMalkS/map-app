import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { DatabaseProvider, useDatabase } from '../DatabaseContext';
import * as ops from '../../database/operations';

const mockDb = { fake: 'db' };
let onInitHandler: ((db: unknown) => Promise<void>) | undefined;
let onErrorHandler: ((error: Error) => void) | undefined;

jest.mock('expo-sqlite', () => ({
  SQLiteProvider: ({ children, onInit, onError }: any) => {
    onInitHandler = onInit;
    onErrorHandler = onError;
    return children;
  },
  useSQLiteContext: () => mockDb,
}));

jest.mock('../../database/schema', () => ({
  DATABASE_NAME: 'markers.db',
  migrateDbIfNeeded: jest.fn(),
}));

jest.mock('../../database/operations');

function Probe({ onReady }: { onReady: (value: ReturnType<typeof useDatabase>) => void }) {
  const value = useDatabase();
  onReady(value);
  return <Text>ready</Text>;
}

class CapturingErrorBoundary extends React.Component<
  { children: React.ReactNode; onCatch: (error: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onCatch(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

describe('contexts/DatabaseContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onInitHandler = undefined;
    onErrorHandler = undefined;
  });

  it('выбрасывает ошибку при использовании useDatabase вне DatabaseProvider', () => {
    const Broken = () => {
      useDatabase();
      return null;
    };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    let caught: Error | undefined;

    act(() => {
      create(
        <CapturingErrorBoundary onCatch={(error) => (caught = error)}>
          <Broken />
        </CapturingErrorBoundary>
      );
    });

    expect(caught?.message).toBe('useDatabase must be used within a DatabaseProvider');

    consoleError.mockRestore();
  });

  it('предоставляет доступ к операциям над маркерами через useDatabase', async () => {
    (ops.addMarker as jest.Mock).mockResolvedValue(7);
    let received: ReturnType<typeof useDatabase> | undefined;

    await act(async () => {
      create(
        <DatabaseProvider>
          <Probe onReady={(value) => (received = value)} />
        </DatabaseProvider>
      );
    });

    expect(received).toBeDefined();
    const id = await received!.addMarker(1, 2);

    expect(ops.addMarker).toHaveBeenCalledWith(mockDb, 1, 2);
    expect(id).toBe(7);
    expect(received!.error).toBeNull();
  });

  it('сохраняет ошибку операции в контексте и пробрасывает её вызывающему', async () => {
    (ops.deleteMarker as jest.Mock).mockRejectedValue(new Error('операция не удалась'));
    let received: ReturnType<typeof useDatabase> | undefined;

    await act(async () => {
      create(
        <DatabaseProvider>
          <Probe onReady={(value) => (received = value)} />
        </DatabaseProvider>
      );
    });

    await act(async () => {
      await expect(received!.deleteMarker(1)).rejects.toThrow('операция не удалась');
    });
    expect(received!.error).toEqual(expect.objectContaining({ message: 'операция не удалась' }));
  });

  it('сбрасывает ошибку после следующей успешной операции', async () => {
    (ops.deleteMarker as jest.Mock).mockRejectedValueOnce(new Error('сбой'));
    (ops.getMarkers as jest.Mock).mockResolvedValue([]);
    let received: ReturnType<typeof useDatabase> | undefined;

    await act(async () => {
      create(
        <DatabaseProvider>
          <Probe onReady={(value) => (received = value)} />
        </DatabaseProvider>
      );
    });

    await act(async () => {
      await expect(received!.deleteMarker(1)).rejects.toThrow();
    });
    expect(received!.error).not.toBeNull();

    await act(async () => {
      await received!.getMarkers();
    });
    expect(received!.error).toBeNull();
  });

  it('показывает экран-заглушку вместо детей при ошибке инициализации', async () => {
    let tree: ReturnType<typeof create> | undefined;

    await act(async () => {
      tree = create(
        <DatabaseProvider>
          <Text>дети не должны отрендериться</Text>
        </DatabaseProvider>
      );
    });

    act(() => {
      onErrorHandler?.(new Error('не удалось открыть базу'));
    });

    const text = tree!.root
      .findAllByType(Text)
      .map((node: ReactTestInstance) => node.props.children)
      .flat();
    expect(text.join(' ')).toContain('не удалось открыть базу');
  });
});
