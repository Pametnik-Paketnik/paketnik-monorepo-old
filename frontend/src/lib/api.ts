import { store } from '@/store';
import { logout } from '@/store/authSlice';

interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Enhanced fetch wrapper that handles JWT expiration automatically
 */
export async function apiRequest(url: string, options: ApiRequestOptions = {}) {
  const { requiresAuth = true, ...fetchOptions } = options;
  
  // Get current auth state
  const state = store.getState();
  const token = state.auth.accessToken;
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  
  // Add auth header if required and token exists
  if (requiresAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      // Token is expired or invalid
      console.warn('JWT token expired or invalid, logging out user');
      store.dispatch(logout());
      
      // Redirect to login page
      window.location.href = '/login';
      
      throw new Error('Authentication failed. Please log in again.');
    }
    
    return response;
  } catch (error) {
    // If it's a network error and we have an invalid token, also logout
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // This might be a CORS error due to invalid token
      console.warn('Network error, checking if related to authentication');
    }
    
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(url: string, options: ApiRequestOptions = {}) {
  return apiRequest(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(url: string, data?: unknown, options: ApiRequestOptions = {}) {
  return apiRequest(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Convenience method for PATCH requests
 */
export async function apiPatch(url: string, data?: unknown, options: ApiRequestOptions = {}) {
  return apiRequest(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(url: string, options: ApiRequestOptions = {}) {
  return apiRequest(url, { ...options, method: 'DELETE' });
} 