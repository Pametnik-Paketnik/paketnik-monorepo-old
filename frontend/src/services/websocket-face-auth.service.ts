import { io, Socket } from 'socket.io-client';

interface FaceAuthCompletionData {
  success: boolean;
  message: string;
  access_token?: string;
  user?: {
    id: number;
    name: string;
    surname: string;
    email: string;
    userType: string;
  };
}

interface FaceAuthCompleteEvent {
  requestId: string;
  success: boolean;
  data?: FaceAuthCompletionData;
  error?: string;
  timestamp: string;
}

interface FaceAuthStatusEvent {
  requestId: string;
  status: string;
  message?: string;
  timestamp: string;
}

interface JoinedRoomEvent {
  requestId: string;
  message: string;
}

interface FaceAuthErrorEvent {
  message: string;
}

export class WebSocketFaceAuthService {
  private socket: Socket | null = null;
  private isConnected = false;

  constructor(private baseUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        resolve();
        return;
      }

      this.socket = io(`${this.baseUrl}/face-auth`, {
        transports: ['websocket'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected for Face ID authentication');
        this.isConnected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinRoom(requestId: string, tempToken?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);

      this.socket.once('joined_room', (data: JoinedRoomEvent) => {
        clearTimeout(timeout);
        console.log('Joined Face ID room:', data);
        resolve();
      });

      this.socket.once('face_auth_error', (error: FaceAuthErrorEvent) => {
        clearTimeout(timeout);
        console.error('Failed to join Face ID room:', error);
        reject(new Error(error.message));
      });

      this.socket.emit('join_face_auth_room', { requestId, tempToken });
    });
  }

  leaveRoom(requestId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_face_auth_room', { requestId });
    }
  }

  onFaceAuthComplete(callback: (event: FaceAuthCompleteEvent) => void): void {
    if (this.socket) {
      this.socket.on('face_auth_complete', callback);
    }
  }

  onFaceAuthStatus(callback: (event: FaceAuthStatusEvent) => void): void {
    if (this.socket) {
      this.socket.on('face_auth_status', callback);
    }
  }

  onError(callback: (error: FaceAuthErrorEvent) => void): void {
    if (this.socket) {
      this.socket.on('face_auth_error', callback);
    }
  }

  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners('face_auth_complete');
      this.socket.removeAllListeners('face_auth_status');
      this.socket.removeAllListeners('face_auth_error');
      this.socket.removeAllListeners('joined_room');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let webSocketFaceAuthService: WebSocketFaceAuthService | null = null;

export function getWebSocketFaceAuthService(): WebSocketFaceAuthService {
  if (!webSocketFaceAuthService) {
    // Extract the base URL from VITE_API_URL (remove /api suffix if present)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const baseUrl = apiUrl.replace('/api', '');
    webSocketFaceAuthService = new WebSocketFaceAuthService(baseUrl);
  }
  return webSocketFaceAuthService;
} 