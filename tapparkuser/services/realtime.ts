import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config/api';

type RealtimePayload = {
  areaId?: number;
  reservationId?: number;
  userId?: number;
};

const TOKEN_KEY = 'tappark_auth_token';

class RealtimeService {
  private socket: Socket | null = null;
  private readonly subscriptions = new Set<string>();

  private getSocketUrl() {
    const apiUrl = getApiUrl();
    return apiUrl.replace(/\/api\/?$/, '');
  }

  private normalizePayload(payload: RealtimePayload): { areaId?: number; reservationId?: number } | null {
    const areaId = Number(payload.areaId);
    const reservationId = Number(payload.reservationId);

    const normalized: { areaId?: number; reservationId?: number } = {};

    if (Number.isFinite(areaId) && areaId > 0) {
      normalized.areaId = Math.floor(areaId);
    }

    if (Number.isFinite(reservationId) && reservationId > 0) {
      normalized.reservationId = Math.floor(reservationId);
    }

    if (!normalized.areaId && !normalized.reservationId) {
      return null;
    }

    return normalized;
  }

  private getSubscriptionKey(payload: { areaId?: number; reservationId?: number }): string {
    const area = payload.areaId ? `area:${payload.areaId}` : 'area:-';
    const reservation = payload.reservationId ? `reservation:${payload.reservationId}` : 'reservation:-';
    return `${area}|${reservation}`;
  }

  private parseSubscriptionKey(key: string): { areaId?: number; reservationId?: number } {
    const parts = key.split('|');
    const areaPart = parts[0]?.replace('area:', '');
    const reservationPart = parts[1]?.replace('reservation:', '');

    const result: { areaId?: number; reservationId?: number } = {};

    const areaId = Number(areaPart);
    const reservationId = Number(reservationPart);

    if (Number.isFinite(areaId) && areaId > 0) {
      result.areaId = areaId;
    }

    if (Number.isFinite(reservationId) && reservationId > 0) {
      result.reservationId = reservationId;
    }

    return result;
  }

  private emitAllSubscriptions() {
    if (!this.socket?.connected) {
      return;
    }

    for (const key of Array.from(this.subscriptions)) {
      const payload = this.parseSubscriptionKey(key);
      if (payload.areaId || payload.reservationId) {
        this.socket.emit('subscribe', payload);
      }
    }
  }

  private createSocket(): Socket {
    const socket = io(this.getSocketUrl(), {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: async (cb) => {
        try {
          const token = await AsyncStorage.getItem(TOKEN_KEY);
          cb(token ? { token } : {});
        } catch {
          cb({});
        }
      }
    });

    socket.on('connect', () => {
      this.emitAllSubscriptions();
    });

    socket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
    });

    return socket;
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (!this.socket) {
      this.socket = this.createSocket();
    } else if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  subscribe(payload: RealtimePayload) {
    const normalized = this.normalizePayload(payload);
    if (!normalized) {
      return;
    }

    const key = this.getSubscriptionKey(normalized);
    this.subscriptions.add(key);

    const socket = this.connect();
    if (socket.connected) {
      socket.emit('subscribe', normalized);
    }
  }

  unsubscribe(payload: RealtimePayload) {
    const normalized = this.normalizePayload(payload);
    if (!normalized) {
      return;
    }

    const key = this.getSubscriptionKey(normalized);
    this.subscriptions.delete(key);

    if (this.socket) {
      this.socket.emit('unsubscribe', normalized);
    }
  }

  clearSubscriptions() {
    this.subscriptions.clear();
  }

  on<T = any>(eventName: string, handler: (payload: T) => void) {
    this.connect().on(eventName, handler);
  }

  off<T = any>(eventName: string, handler: (payload: T) => void) {
    if (this.socket) {
      this.socket.off(eventName, handler);
    }
  }
}

export default new RealtimeService();
