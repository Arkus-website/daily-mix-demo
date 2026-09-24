import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { findMixByShareToken } from '@/db/repo';
import { GET as getMe } from './me/route';
import { DELETE as unsave, POST as save } from './mix/[id]/save/route';
import { POST as share } from './mix/[id]/share/route';
import { GET as getToday } from './mix/today/route';

const req = (path: string, userId?: string, method = 'GET') =>
  new NextRequest(`http://localhost${path}`, { method, headers: userId ? { cookie: `dm_session=${userId}` } : {} });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/mix/today', () => {
  it('requires a session', async () => {
    expect((await getToday(req('/api/mix/today'))).status).toBe(401);
  });

  it("returns today's mix for the current user", async () => {
    const res = await getToday(req('/api/mix/today', 'u_ana'));
    expect(res.status).toBe(200);
    const mix = await res.json();
    expect(mix.userId).toBe('u_ana');
    expect(mix.mixDate).toBe('2026-09-23');
    expect(mix.items).toHaveLength(3);
    expect(mix.saved).toBe(false);
  });

  it('returns the same mix on a second call the same day', async () => {
    const first = await (await getToday(req('/api/mix/today', 'u_chloe'))).json();
    const second = await (await getToday(req('/api/mix/today', 'u_chloe'))).json();
    expect(second).toEqual(first);
  });
});

describe('POST/DELETE /api/mix/:id/save', () => {
  it('toggles the saved state for the owner', async () => {
    const { id } = await (await getToday(req('/api/mix/today', 'u_ben'))).json();

    expect(await (await save(req(`/api/mix/${id}/save`, 'u_ben', 'POST'), params(id))).json()).toEqual({ saved: true });
    expect((await (await getToday(req('/api/mix/today', 'u_ben'))).json()).saved).toBe(true);

    expect(await (await unsave(req(`/api/mix/${id}/save`, 'u_ben', 'DELETE'), params(id))).json()).toEqual({ saved: false });
    expect((await (await getToday(req('/api/mix/today', 'u_ben'))).json()).saved).toBe(false);
  });

  it('requires a session', async () => {
    const { id } = await (await getToday(req('/api/mix/today', 'u_ben'))).json();
    expect((await save(req(`/api/mix/${id}/save`, undefined, 'POST'), params(id))).status).toBe(401);
  });

  it("does not let one user save another user's mix", async () => {
    const { id } = await (await getToday(req('/api/mix/today', 'u_ben'))).json();
    expect((await save(req(`/api/mix/${id}/save`, 'u_dev', 'POST'), params(id))).status).toBe(404);
    expect((await unsave(req(`/api/mix/${id}/save`, 'u_dev', 'DELETE'), params(id))).status).toBe(404);
  });

  it('returns 404 for an unknown mix', async () => {
    expect((await save(req('/api/mix/nope/save', 'u_ben', 'POST'), params('nope'))).status).toBe(404);
  });
});

describe('POST /api/mix/:id/share', () => {
  it('requires a session', async () => {
    const { id } = await (await getToday(req('/api/mix/today', 'u_ben'))).json();
    expect((await share(req(`/api/mix/${id}/share`, undefined, 'POST'), params(id))).status).toBe(401);
  });

  it("does not let one user share another user's mix", async () => {
    const { id } = await (await getToday(req('/api/mix/today', 'u_ben'))).json();
    expect((await share(req(`/api/mix/${id}/share`, 'u_dev', 'POST'), params(id))).status).toBe(404);
  });

  it('returns 404 for an unknown mix', async () => {
    expect((await share(req('/api/mix/nope/share', 'u_ben', 'POST'), params('nope'))).status).toBe(404);
  });

  it('creates a token that resolves to the mix, and is stable across calls', async () => {
    const { id } = await (await getToday(req('/api/mix/today', 'u_chloe'))).json();

    const first = await (await share(req(`/api/mix/${id}/share`, 'u_chloe', 'POST'), params(id))).json();
    const second = await (await share(req(`/api/mix/${id}/share`, 'u_chloe', 'POST'), params(id))).json();
    expect(first.token).toBe(second.token);

    const shared = findMixByShareToken(first.token);
    expect(shared?.id).toBe(id);
  });
});

describe('GET /api/me', () => {
  it('requires a session', async () => {
    expect((await getMe(req('/api/me'))).status).toBe(401);
  });

  it('returns the current user', async () => {
    expect(await (await getMe(req('/api/me', 'u_ana'))).json()).toEqual({ id: 'u_ana', displayName: 'Ana Ruiz', plan: 'premium' });
  });
});
