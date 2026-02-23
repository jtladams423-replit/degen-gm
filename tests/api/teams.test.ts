import { describe, it, expect } from 'vitest';

describe('Teams API', () => {
  const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

  it('should return NFL teams', async () => {
    const res = await fetch(`${BASE_URL}/api/teams?sport=NFL`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return NBA teams', async () => {
    const res = await fetch(`${BASE_URL}/api/teams?sport=NBA`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return team by code', async () => {
    const res = await fetch(`${BASE_URL}/api/teams/LAL?sport=NBA`);
    const data = await res.json();
    if (res.status === 200) {
      expect(data.code).toBe('LAL');
    } else {
      expect(res.status).toBe(404);
    }
  });

  it('should return 404 for non-existent team', async () => {
    const res = await fetch(`${BASE_URL}/api/teams/ZZZZZ?sport=NFL`);
    expect(res.status).toBe(404);
  });

  it('should return free agents', async () => {
    const res = await fetch(`${BASE_URL}/api/free-agents?sport=NFL`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return roster players', async () => {
    const res = await fetch(`${BASE_URL}/api/roster?sport=NFL`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
