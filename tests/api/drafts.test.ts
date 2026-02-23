import { describe, it, expect } from 'vitest';

describe('Drafts API', () => {
  const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

  it('should return draft order', async () => {
    const res = await fetch(`${BASE_URL}/api/draft-order?sport=NFL`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return mock drafts list', async () => {
    const res = await fetch(`${BASE_URL}/api/mock-drafts?sport=NFL`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should create and retrieve a mock draft', async () => {
    const createRes = await fetch(`${BASE_URL}/api/mock-drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Draft',
        year: 2026,
        method: 'User',
        rounds: 1,
        sport: 'NFL',
        picks: [],
      }),
    });
    expect(createRes.status).toBe(201);
    const draft = await createRes.json();
    expect(draft).toHaveProperty('id');

    const getRes = await fetch(`${BASE_URL}/api/mock-drafts/${draft.id}`);
    expect(getRes.status).toBe(200);
    const gotten = await getRes.json();
    expect(gotten.name).toBe('Test Draft');

    const deleteRes = await fetch(`${BASE_URL}/api/mock-drafts/${draft.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(204);
  });

  it('should return 404 for non-existent mock draft', async () => {
    const res = await fetch(`${BASE_URL}/api/mock-drafts/999999`);
    expect(res.status).toBe(404);
  });
});
