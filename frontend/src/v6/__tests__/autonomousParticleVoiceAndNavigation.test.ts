import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TARKA_NAVIGATION_REGISTRY,
  resolveNavigationIntent,
} from '../navigation/tarkaNavigationRegistry';
import {
  TARKA_CONTEXTUAL_GUIDES,
  getContextualGuide,
} from '../guide/tarkaContextualGuide';
import {
  SEMANTIC_ELEMENT_REGISTRY,
  highlightController,
} from '../highlight/semanticRegistry';
import { TarkaVoiceEngine } from '../voice/TarkaVoiceEngine';

describe('TARKA Autonomous Particle Intelligence & Navigation Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Autonomous Navigation Registry Resolution', () => {
    it('verifies registry definitions and accurately resolves exact aliases across critical operational screens', () => {
      expect(Object.keys(TARKA_NAVIGATION_REGISTRY).length).toBeGreaterThanOrEqual(15);
      expect(Object.keys(TARKA_CONTEXTUAL_GUIDES).length).toBeGreaterThanOrEqual(15);
      const matchEvidence = resolveNavigationIntent('take me to the evidence locker');
      expect(matchEvidence).not.toBeNull();
      expect(matchEvidence?.route.canonicalView).toBe('evidence');
      expect(matchEvidence?.confidence).toBeGreaterThanOrEqual(0.9);

      const matchLedger = resolveNavigationIntent('explain the current ledger');
      expect(matchLedger).not.toBeNull();
      expect(matchLedger?.route.canonicalView).toBe('ledger');

      const matchNetwork = resolveNavigationIntent('show the fraud network');
      expect(matchNetwork).not.toBeNull();
      expect(matchNetwork?.route.canonicalView).toBe('network');

      const matchTimeline = resolveNavigationIntent('open the temporal analysis');
      expect(matchTimeline).not.toBeNull();
      expect(matchTimeline?.route.canonicalView).toBe('timeline');

      const matchReport = resolveNavigationIntent('open the forensic report');
      expect(matchReport).not.toBeNull();
      expect(matchReport?.route.canonicalView).toBe('report');

      const matchHome = resolveNavigationIntent('go back home');
      expect(matchHome).not.toBeNull();
      expect(matchHome?.route.canonicalView).toBe('home');
    });

    it('gracefully handles keyword queries and partial intents', () => {
      const matchZ3 = resolveNavigationIntent('show me z3 formal verification proof');
      expect(matchZ3).not.toBeNull();
      expect(matchZ3?.route.canonicalView).toBe('claim-lens');

      const matchBsa = resolveNavigationIntent('generate section 63 bsa certificate');
      expect(matchBsa).not.toBeNull();
      expect(matchBsa?.route.canonicalView).toBe('court-proof');
    });

    it('returns null for empty or non-matching queries', () => {
      expect(resolveNavigationIntent('')).toBeNull();
      expect(resolveNavigationIntent('completely unrelated phrase xyz')).toBeNull();
    });
  });

  describe('2. Voice Engine Strict Provider Directives', () => {
    it('RULE 6: In OFFLINE_LOCAL mode, speak() produces ZERO spoken audio (no TTS, no browser speech)', async () => {
      const engine = new TarkaVoiceEngine('en-IN', 'OFFLINE_LOCAL');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const result = await engine.speak('This is an offline test statement.');
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('RULE 5: In SARVAM_CLOUD mode, speak() exclusively calls Sarvam synthesis endpoint and never browser TTS', async () => {
      const engine = new TarkaVoiceEngine('ta-IN', 'SARVAM_CLOUD');
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio_base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        }),
      } as any);

      await engine.speak('வணக்கம், விசாரணை அறிக்கை தயாராக உள்ளது.');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/sarvam/synthesize',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('3. Contextual Forensic Guide Registry Completeness', () => {
    it('provides dual-depth guides and abbreviations across all major operational views', () => {
      const viewsToVerify = [
        'home',
        'workspace',
        'cases',
        'evidence',
        'ledger',
        'people',
        'money',
        'network',
        'device',
        'timeline',
        'claims',
        'claim-lens',
        'provenance',
        'flight-recorder',
        'court-proof',
        'actions',
        'lab',
        'report',
        'settings',
        'health',
      ];

      for (const viewId of viewsToVerify) {
        const guide = getContextualGuide(viewId);
        expect(guide).toBeDefined();
        expect(guide.title.length).toBeGreaterThan(0);
        expect(guide.purpose.length).toBeGreaterThan(15);
        expect(guide.investigatorExplanation.length).toBeGreaterThan(25);
        expect(guide.technicalExplanation.length).toBeGreaterThan(25);
        expect(Object.keys(guide.abbreviations).length).toBeGreaterThan(0);
      }
    });

    it('falls back to workspace guide when view is unknown', () => {
      const fallback = getContextualGuide('unknown-test-route');
      expect(fallback.screenId).toBe('workspace');
    });
  });

  describe('4. Universal Semantic Element Highlighting', () => {
    it('correctly registers critical forensic element IDs and properties', () => {
      expect(SEMANTIC_ELEMENT_REGISTRY['el-metric-total-loss']).toBeDefined();
      expect(SEMANTIC_ELEMENT_REGISTRY['el-ledger-row-rrn-402918273645']).toBeDefined();
      expect(SEMANTIC_ELEMENT_REGISTRY['el-graph-node-mule-1']).toBeDefined();
      expect(SEMANTIC_ELEMENT_REGISTRY['el-device-cgnat-funnel']).toBeDefined();
      expect(SEMANTIC_ELEMENT_REGISTRY['el-court-proof-certificate']).toBeDefined();
    });

    it('allows controller subscription, notification, and highlight clearing', () => {
      const listener = vi.fn();
      const unsubscribe = highlightController.subscribe(listener);

      highlightController.highlightElement('el-metric-total-loss', 'error', 0);
      expect(listener).toHaveBeenCalledWith('el-metric-total-loss', 'error');
      expect(highlightController.getActiveHighlight().elementId).toBe('el-metric-total-loss');

      highlightController.clearHighlight();
      expect(listener).toHaveBeenCalledWith(null, 'error');
      expect(highlightController.getActiveHighlight().elementId).toBeNull();

      unsubscribe();
    });
  });
});
