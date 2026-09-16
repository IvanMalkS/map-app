/**
 * Глобальный перехват необработанных ошибок приложения.
 *
 * Хранит последнюю ошибку в простом внешнем сторе (без React-контекста),
 * чтобы её можно было показать в {@link ErrorBanner} и сообщать о ней из
 * мест, не относящихся к дереву React — глобального обработчика JS-исключений
 * и обработчика необработанных отклонений промисов.
 */

export interface AppError {
  message: string;
  timestamp: number;
}

type Listener = (error: AppError | null) => void;

const listeners = new Set<Listener>();
let currentError: AppError | null = null;
let handlersInstalled = false;

/**
 * Подстроки сообщений об ошибках, которые уже обрабатываются
 */
const KNOWN_NON_FATAL_ERROR_SUBSTRINGS = [
  'expo-notifications: Android Push notifications',
];

function isKnownNonFatalError(message: string): boolean {
  return KNOWN_NON_FATAL_ERROR_SUBSTRINGS.some((substring) => message.includes(substring));
}

function notify() {
  for (const listener of listeners) {
    listener(currentError);
  }
}

/** Сообщает о неожиданной ошибке, чтобы показать пользователю баннер. */
export function reportError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);

  if (isKnownNonFatalError(message)) {
    if (__DEV__) {
      console.warn('[errorReporting] known non-fatal error, banner suppressed:', error);
    }
    return;
  }

  if (__DEV__) {
    console.error('[errorReporting] unhandled error:', error);
  }

  currentError = { message, timestamp: Date.now() };
  notify();
}

/** Скрывает текущий баннер ошибки. */
export function clearError(): void {
  currentError = null;
  notify();
}

/** Подписывается на изменения текущей ошибки, возвращает функцию отписки. */
export function subscribeToErrors(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentError);
  return () => listeners.delete(listener);
}

/**
 * Устанавливает глобальные обработчики необработанных JS-исключений и
 * отклонённых промисов. Безопасно вызывать несколько раз — реальная
 * установка происходит один раз за время жизни приложения.
 */
export function setupGlobalErrorHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  const globalAny = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
    addEventListener?: (type: string, handler: (event: { reason: unknown }) => void) => void;
  };

  if (globalAny.ErrorUtils) {
    const previousHandler = globalAny.ErrorUtils.getGlobalHandler();
    globalAny.ErrorUtils.setGlobalHandler((error, isFatal) => {
      reportError(error);
      previousHandler?.(error, isFatal);
    });
  }

  if (typeof globalAny.addEventListener === 'function') {
    globalAny.addEventListener('unhandledrejection', (event) => {
      reportError(event.reason);
    });
  }
}
