import { describe, it, expect } from 'vitest';

describe('Prospects API', () => {
  const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

  it('should return NFL prospects', async () => {
    const res = await fetch(`${BASE_URL}/api/prospects?sport=NFL`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return NBA prospects', async () => {
    const res = await fetch(`${BASE_URL}/api/prospects?sport=NBA`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should default to NFL when no sport specified', async () => {
    const res = await fetch(`${BASE_URL}/api/prospects`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
