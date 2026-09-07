import { API_BASE_URL } from '../config/api.config';

export class ApiClient {
  public static async get<T>(endpoint: string): Promise<T | null> {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.warn(`[ApiClient Warning] GET ${endpoint} returned status ${response.status}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      console.warn(`[ApiClient Error] GET ${endpoint} failed:`, error.message);
      return null;
    }
  }

  public static async post<T>(endpoint: string, body?: any): Promise<T | null> {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        console.warn(`[ApiClient Warning] POST ${endpoint} returned status ${response.status}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      console.warn(`[ApiClient Error] POST ${endpoint} failed:`, error.message);
      return null;
    }
  }

  public static async put<T>(endpoint: string, body?: any): Promise<T | null> {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        console.warn(`[ApiClient Warning] PUT ${endpoint} returned status ${response.status}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      console.warn(`[ApiClient Error] PUT ${endpoint} failed:`, error.message);
      return null;
    }
  }
}
