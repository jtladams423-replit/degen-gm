import { describe, it, expect } from 'vitest';

describe('Trades API', () => {
  const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

  it('should return trade proposals', async () => {
    const res = await fetch(`${BASE_URL}/api/trades?sport=NBA`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return cap settings', async () => {
    const res = await fetch(`${BASE_URL}/api/cap-settings?sport=NBA`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should validate trade with proper schema', async () => {
    const tradeData = {
      teams: [
        { teamCode: 'LAL', currentSalary: 180, capSpace: 10, rosterSize: 14, playersOut: [], playersIn: [], picksOut: [], picksIn: [] },
        { teamCode: 'BOS', currentSalary: 190, capSpace: 5, rosterSize: 14, playersOut: [], playersIn: [], picksOut: [], picksIn: [] },
      ],
      year: 2026,
    };
    const res = await fetch(`${BASE_URL}/api/trades/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeData),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('isValid');
  });

  it('should reject invalid trade schema', async () => {
    const res = await fetch(`${BASE_URL}/api/trades/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    });
    expect(res.status).toBe(400);
  });
});
