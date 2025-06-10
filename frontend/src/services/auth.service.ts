interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  userType: string;
}

interface TwoFactorMethod {
  type: string;
  enabled: boolean;
  display_name: string;
}

// Login response types
interface LoginSuccessResponse {
  success: true;
  message: string;
  access_token: string;
  user: User;
}

interface Login2FARequiredResponse {
  success: true;
  message: string;
  twoFactorRequired: true;
  tempToken: string;
  available_2fa_methods: TwoFactorMethod[];
}

interface LoginErrorResponse {
  success: false;
  message: string;
}

type LoginResponse = LoginSuccessResponse | Login2FARequiredResponse | LoginErrorResponse;

// TOTP verification response
interface TotpVerificationResponse {
  success: boolean;
  message: string;
  access_token?: string;
  user?: User;
}

// Face ID WebSocket flow response
interface FaceAuthWebResponse {
  requestId: string;
  status: string;
  websocketRoom: string;
  expiresAt: string;
  devicesNotified: number;
}

export class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }

  // Initial login (username/password)
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }

    const data = await response.json();
    return data;
  }

  // Register new user
  async register(email: string, password: string, name: string, surname: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        name, 
        surname, 
        userType: 'USER' 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }

    const data = await response.json();
    return data;
  }

  // TOTP 2FA verification
  async verifyTotp(tempToken: string, totpCode: string): Promise<TotpVerificationResponse> {
    const response = await fetch(`${this.baseUrl}/auth/2fa/totp/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tempToken, code: totpCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'TOTP verification failed');
    }

    return await response.json();
  }

  // Traditional Face ID verification (direct image upload)
  async verifyFaceId(tempToken: string, faceImage: File): Promise<TotpVerificationResponse> {
    const formData = new FormData();
    formData.append('tempToken', tempToken);
    formData.append('face_image', faceImage);

    const response = await fetch(`${this.baseUrl}/auth/2fa/face/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Face ID verification failed');
    }

    return await response.json();
  }

  // WebSocket-based Face ID authentication (for web clients)
  async initiateFaceAuthWeb(tempToken: string, timeoutMinutes?: number): Promise<FaceAuthWebResponse> {
    const response = await fetch(`${this.baseUrl}/auth/2fa/face/login/web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        tempToken, 
        timeoutMinutes: timeoutMinutes || 5,
        deviceInfo: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate Face ID authentication');
    }

    return await response.json();
  }

  // Check Face ID request status
  async getFaceAuthStatus(requestId: string): Promise<FaceAuthWebResponse> {
    const response = await fetch(`${this.baseUrl}/auth/2fa/face/status/${requestId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get Face ID status');
    }

    return await response.json();
  }

  // Logout
  async logout(accessToken: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with client-side logout even if server request fails
    }
  }
}

// Singleton instance
let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
} 