import { describe, it, expect } from 'vitest';
import { validateTrade, getDefaultCapSettings } from '../../server/tradeEngine';

describe('Trade Engine', () => {
  describe('getDefaultCapSettings', () => {
    it('should return cap settings for valid year', () => {
      const settings = getDefaultCapSettings(2026);
      expect(settings).toHaveProperty('salaryCap');
      expect(settings).toHaveProperty('taxLine');
      expect(settings).toHaveProperty('firstApron');
      expect(settings).toHaveProperty('secondApron');
      expect(typeof settings.salaryCap).toBe('number');
    });
  });

  describe('validateTrade', () => {
    it('should validate a simple two-team trade with no players', () => {
      const result = validateTrade([
        { teamCode: 'LAL', currentSalary: 180, capSpace: 10, rosterSize: 14, playersOut: [], playersIn: [], picksOut: [], picksIn: [] },
        { teamCode: 'BOS', currentSalary: 190, capSpace: 5, rosterSize: 14, playersOut: [], playersIn: [], picksOut: [], picksIn: [] },
      ], 2026);
      expect(result).toHaveProperty('isValid');
    });
  });
});
