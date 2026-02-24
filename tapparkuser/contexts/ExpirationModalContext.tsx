import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PENDING_EXPIRATION_STORAGE_KEY } from '../app/constants/storageKeys';

interface ExpirationDetails {
  reservationId?: number;
  spotNumber?: string;
  areaName?: string;
  userName?: string;
  billingBreakdown?: {
    waitTimeMinutes: number;
    parkingTimeMinutes: number;
    totalChargedHours: number;
    breakdown?: string;
  };
  timestamp: number;
}

interface ExpirationModalContextType {
  showExpirationModal: boolean;
  expirationDetails: ExpirationDetails | null;
  checkPendingReservationExpiration: () => Promise<void>;
  handleExpirationModalClose: () => void;
  showExpirationModalWithDetails: (details: ExpirationDetails) => void;
}

const EXPIRATION_MODAL_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export const ExpirationModalContext = createContext<ExpirationModalContextType | undefined>(undefined);

export const useExpirationModal = () => {
  const context = useContext(ExpirationModalContext);
  if (context === undefined) {
    throw new Error('useExpirationModal must be used within an ExpirationModalProvider');
  }
  return context;
};

interface ExpirationModalProviderProps {
  children: ReactNode;
}

export const ExpirationModalProvider: React.FC<ExpirationModalProviderProps> = ({ children }) => {
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expirationDetails, setExpirationDetails] = useState<ExpirationDetails | null>(null);
  const isCheckingPendingRef = useRef(false);
  const shownExpirationSignaturesRef = useRef<Set<string>>(new Set());

  const getExpirationSignature = useCallback((details: ExpirationDetails | null | undefined): string => {
    if (!details) return 'unknown';
    if (details.reservationId) return `reservation:${details.reservationId}`;
    if (details.timestamp) return `timestamp:${details.timestamp}`;
    return 'unknown';
  }, []);

  const handleExpirationModalClose = useCallback(() => {
    setShowExpirationModal(false);
    setExpirationDetails(null);
  }, []);

  const checkPendingReservationExpiration = useCallback(async () => {
    if (isCheckingPendingRef.current) {
      return;
    }

    isCheckingPendingRef.current = true;
    try {
      const stored = await AsyncStorage.getItem(PENDING_EXPIRATION_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      const signature = getExpirationSignature(parsed);

      if (shownExpirationSignaturesRef.current.has(signature)) {
        await AsyncStorage.removeItem(PENDING_EXPIRATION_STORAGE_KEY);
        return;
      }

      if (showExpirationModal && expirationDetails) {
        const activeSignature = getExpirationSignature(expirationDetails);
        if (activeSignature === signature) {
          await AsyncStorage.removeItem(PENDING_EXPIRATION_STORAGE_KEY);
          return;
        }
      }

      const timestamp = parsed?.timestamp;
      if (!timestamp || Date.now() - timestamp > EXPIRATION_MODAL_MAX_AGE_MS) {
        await AsyncStorage.removeItem(PENDING_EXPIRATION_STORAGE_KEY);
        return;
      }

      shownExpirationSignaturesRef.current.add(signature);
      await AsyncStorage.removeItem(PENDING_EXPIRATION_STORAGE_KEY);
      setExpirationDetails(parsed);
      setShowExpirationModal(true);
    } catch (error) {
      console.error('Error loading pending reservation expiration details:', error);
    } finally {
      isCheckingPendingRef.current = false;
    }
  }, [expirationDetails, getExpirationSignature, showExpirationModal]);

  const showExpirationModalWithDetails = useCallback((details: ExpirationDetails) => {
    const signature = getExpirationSignature(details);
    if (shownExpirationSignaturesRef.current.has(signature)) {
      return;
    }
    shownExpirationSignaturesRef.current.add(signature);
    setExpirationDetails(details);
    setShowExpirationModal(true);
  }, [getExpirationSignature]);

  const value: ExpirationModalContextType = {
    showExpirationModal,
    expirationDetails,
    checkPendingReservationExpiration,
    handleExpirationModalClose,
    showExpirationModalWithDetails,
  };

  return (
    <ExpirationModalContext.Provider value={value}>
      {children}
    </ExpirationModalContext.Provider>
  );
};
