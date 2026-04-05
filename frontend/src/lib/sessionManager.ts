/**
 * Session Manager
 * Manages session ID storage and lifecycle
 */

const SESSION_KEY = 'sessionId';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export interface StoredUser {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

class SessionManager {
  private sessionId: string | null = null;
  private token: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      this.sessionId = localStorage.getItem(SESSION_KEY);
      this.token = localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to load session from storage:', error);
    }
  }

  /**
   * Store authentication data after login/register
   */
  setAuth(data: {
    access_token: string;
    session_id: string;
    user: StoredUser;
  }): void {
    this.token = data.access_token;
    this.sessionId = data.session_id;

    try {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(SESSION_KEY, data.session_id);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  }

  /**
   * Clear authentication data on logout
   */
  clearAuth(): void {
    this.token = null;
    this.sessionId = null;

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth from storage:', error);
    }
  }

  /**
   * Get session ID for API requests
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get JWT token for API requests
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get stored user data
   */
  getUser(): StoredUser | null {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.sessionId || this.token);
  }

  /**
   * Update user data
   */
  updateUser(user: Partial<StoredUser>): void {
    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...user };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

export default sessionManager;
