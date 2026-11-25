import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient, {
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuthToken,
  ensureAuthenticatedSession,
} from '../../api/client';

describe('TARKA Production Auth & Unified Request Layer Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearStoredAuthToken();
  });

  describe('1. Token Storage Synchronization', () => {
    it('persists and retrieves tokens across storage with parity keys and in-memory fallback', () => {
      expect(getStoredAuthToken()).toBeNull();

      setStoredAuthToken('test-jwt-access-token-12345');
      expect(getStoredAuthToken()).toBe('test-jwt-access-token-12345');

      if (typeof sessionStorage !== 'undefined') {
        expect(sessionStorage.getItem('sentinelx_auth_token')).toBe('test-jwt-access-token-12345');
      }
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('sentinelx_auth_token')).toBe('test-jwt-access-token-12345');
      }

      clearStoredAuthToken();
      expect(getStoredAuthToken()).toBeNull();
    });
  });

  describe('2. Auto-Bootstrapping Forensic Investigator Session', () => {
    it('initializes session token for INVESTIGATOR_DELHI when storage is empty', async () => {
      const mockToken = 'mocked-jwt-delhi-investigator-token';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: mockToken,
          token_type: 'bearer',
          user_id: 'usr-delhi-01',
          allowed_cases: ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'],
        }),
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as any;

      try {
        const token = await ensureAuthenticatedSession(true);
        expect(token).toBe(mockToken);
        expect(getStoredAuthToken()).toBe(mockToken);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/forensics/auth/session'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ username: 'INVESTIGATOR_DELHI' }),
          })
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('returns existing cached token without redundant network calls unless forceRefresh is true', async () => {
      setStoredAuthToken('existing-token-abc');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const token = await ensureAuthenticatedSession(false);
      expect(token).toBe('existing-token-abc');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('3. Unified Request Interceptors & Headers', () => {
    it('automatically attaches Authorization header to outgoing apiClient requests', async () => {
      setStoredAuthToken('token-auth-bearer-xyz');

      const handler = (apiClient.interceptors.request as any).handlers?.[0]?.fulfilled;
      expect(handler).toBeDefined();

      const config = await handler({
        headers: {},
        url: '/api/v1/cases/CASE-2026-002/networks',
      });

      expect(config.headers?.Authorization).toBe('Bearer token-auth-bearer-xyz');
    });

    it('rewrites legacy localhost URLs to clean paths or remote base', async () => {
      const handler = (apiClient.interceptors.request as any).handlers?.[0]?.fulfilled;
      expect(handler).toBeDefined();

      const config = await handler({
        headers: {},
        url: 'http://localhost:8000/api/v1/ingestion/jobs',
      });

      expect(config.url).not.toContain('localhost:8000');
      expect(config.url).toContain('/api/v1/ingestion/jobs');
    });
  });
});
