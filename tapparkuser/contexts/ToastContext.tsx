import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeColors } from './ThemeContext';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

type ToastState = {
  visible: boolean;
  title?: string;
  message: string;
  tone: ToastTone;
};

type ToastContextType = {
  showToast: (message: string, options?: { title?: string; tone?: ToastTone; durationMs?: number }) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colors = useThemeColors();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    tone: 'info',
  });
  const translateY = useRef(new Animated.Value(-28)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -28,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
      }),
    ]).start(() => {
      setToast((current) => ({ ...current, visible: false }));
      progress.setValue(1);
    });
  }, [opacity, progress, translateY]);

  const showToast = useCallback(
    (
      message: string,
      options?: { title?: string; tone?: ToastTone; durationMs?: number }
    ) => {
      if (!message) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setToast({
        visible: true,
        title: options?.title,
        message,
        tone: options?.tone || 'info',
      });

      opacity.setValue(0);
      translateY.setValue(-28);
      progress.setValue(1);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(progress, {
        toValue: 0,
        duration: options?.durationMs ?? 2600,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, options?.durationMs ?? 2600);
    },
    [hideToast, opacity, progress, translateY]
  );

  const value = useMemo(
    () => ({
      showToast,
      hideToast,
    }),
    [showToast, hideToast]
  );

  const toneStyles = {
    success: {
      accent: '#1E8E5A',
      background: '#EAF7F0',
      border: '#B9E2C8',
    },
    error: {
      accent: '#C0392B',
      background: '#FDEDEC',
      border: '#F2C7C3',
    },
    info: {
      accent: '#2F6FED',
      background: '#EEF4FF',
      border: '#C9D9FF',
    },
    warning: {
      accent: '#B7791F',
      background: '#FFF6E5',
      border: '#F1D49A',
    },
  }[toast.tone];

  const iconPath = {
    success: 'M2 6l3 3 5-5',
    error: 'M3 3l6 6M9 3l-6 6',
    info: 'M6 5v4M6 3.5v.5',
    warning: 'M6 4v3M6 8.5v.5',
  }[toast.tone];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast.visible ? (
        <View pointerEvents="box-none" style={styles.portal}>
          <Animated.View
            style={[
              styles.toast,
              {
                backgroundColor: toneStyles.background,
                borderColor: toneStyles.border,
                shadowColor: toneStyles.accent,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: toneStyles.accent }]}>
              <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                <Path
                  d={iconPath}
                  stroke="white"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.content}>
              {toast.title ? (
                <Text style={[styles.title, { color: toneStyles.accent }]}>{toast.title}</Text>
              ) : null}
              <Text style={[styles.message, { color: toneStyles.accent }]}>{toast.message}</Text>
              <Animated.View
                style={[
                  styles.progress,
                  {
                    backgroundColor: toneStyles.accent,
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Pressable onPress={hideToast} hitSlop={8} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: toneStyles.accent }]}>×</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  portal: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 56,
    alignItems: 'center',
  },
  toast: {
    width: '92%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 0.5,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  closeButton: {
    marginLeft: 8,
    marginTop: -1,
  },
  closeText: {
    fontSize: 16,
    lineHeight: 18,
    opacity: 0.5,
  },
  progress: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
});
