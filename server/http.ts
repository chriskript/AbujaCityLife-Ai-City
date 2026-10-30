import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NeighbourhoodServerSession, SessionError } from './session.js';
import { npcIds } from '../shared/neighbourhood/types.js';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();
export function createNeighbourhoodHttp(session: NeighbourhoodServerSession, accessToken: string, options: { dist?: string; tick?: boolean } = {}) {
  if (accessToken.length < 32) throw new Error('Demo access token too short');
  const cookie = randomBytes(32).toString('hex');
  let authenticatedUntil = 0;
  const streams = new Set<ServerResponse>(); const rates = new Map<string, number[]>();
  let ticking = false;
  function limit(key: string, maximum: number): void {
    const now = Date.now(); const recent = (rates.get(key) ?? []).filter(time => time > now - 60_000);
    if (recent.length >= maximum) throw new SessionError(429, 'Request throttled'); recent.push(now); rates.set(key, recent);
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const port = (server.address() as { port: number }).port;
      if (![ `127.0.0.1:${port}`, `localhost:${port}`, '127.0.0.1:5173', 'localhost:5173' ].includes(req.headers.host ?? '')) throw new SessionError(403, 'Invalid host');
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { status: 'ready', mode: session.mode });
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' || !options.dist || !(url.pathname === '/' || url.pathname === '/THIRD_PARTY_NOTICES.txt' || /^\/assets\/[\w.-]+\.(js|css)$/.test(url.pathname))) throw new SessionError(404, 'Not found');
        const file = await readFile(resolve(options.dist, url.pathname === '/' ? 'index.html' : `.${url.pathname}`));
        res.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : url.pathname.endsWith('.txt') ? 'text/plain' : 'text/html'); res.end(file); return;
      }
      let body: Record<string, any> = {};
      if (req.method === 'POST') {
        const allowed = [`http://127.0.0.1:${port}`, `http://localhost:${port}`, 'http://127.0.0.1:5173', 'http://localhost:5173'];
        if (!allowed.includes(req.headers.origin ?? '') || req.headers['x-city-lab'] !== '1' || req.headers['content-type'] !== 'application/json') throw new SessionError(403, 'Same-origin operator request required');
        body = await readJson(req);
      }
      if (req.method === 'POST' && url.pathname === '/api/login') {
        limit('login', 5); exact(body, ['token']);
        if (typeof body.token !== 'string' || !timingSafeEqual(digest(body.token), digest(accessToken))) throw new SessionError(401, 'Access denied');
        authenticatedUntil = Date.now() + 4 * 60 * 60_000;
        res.setHeader('Set-Cookie', `citylab=${cookie}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=14400`); return json(res, 200, { authenticated: true });
      }
      const supplied = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith('citylab='))?.slice(8) ?? '';
      if (authenticatedUntil < Date.now() || !timingSafeEqual(digest(supplied), digest(cookie))) throw new SessionError(401, 'Controlled demonstration sign-in required');
      if (req.method === 'GET' && url.pathname === '/api/session') { limit('read', 180); return json(res, 200, session.frame); }
      if (req.method === 'GET' && url.pathname === '/api/events') {
        if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`, 'http://127.0.0.1:5173', 'http://localhost:5173'].includes(req.headers.origin)) throw new SessionError(403, 'Invalid event origin');
        limit('stream', 20); if (streams.size >= 2) throw new SessionError(429, 'Observer limit reached');
        res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        streams.add(res); const unsubscribe = session.subscribe(frame => { if (res.writableLength > 128_000) res.destroy(); else res.write(`data: ${JSON.stringify(frame)}\n\n`); });
        const heartbeat = setInterval(() => { if (authenticatedUntil < Date.now()) res.end(); else res.write(': heartbeat\n\n'); }, 15_000); heartbeat.unref();
        res.on('close', () => { clearInterval(heartbeat); unsubscribe(); streams.delete(res); }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/conversations') {
        limit('read', 180); const id = url.searchParams.get('actorId'); if (!npcIds.includes(id as any)) throw new SessionError(400, 'Unknown inhabitant'); return json(res, 200, session.history(id as typeof npcIds[number]));
      }
      if (req.method !== 'POST') throw new SessionError(404, 'Not found');
      limit('write', 60);
      if (typeof body.id !== 'string' || typeof body.worldId !== 'string') throw new SessionError(400, 'Request and world identifiers required');
      if (url.pathname === '/api/commands') {
        const keys = body.type === 'pause' ? ['id', 'worldId', 'type', 'paused'] : body.type === 'speed' ? ['id', 'worldId', 'type', 'speed'] : body.type === 'road' ? ['id','worldId','type','edgeId','blocked'] : ['id', 'worldId', 'type', 'experiment']; exact(body, keys);
        if (!(body.type === 'pause' && typeof body.paused === 'boolean') && !(body.type === 'speed' && [1,2,4].includes(body.speed)) && !(body.type === 'road' && typeof body.edgeId === 'string' && body.edgeId.length <= 80 && typeof body.blocked === 'boolean') && !(body.type === 'reset' && ['cooperate','decline','wait','self-collect','reduce-sales'].includes(body.experiment))) throw new SessionError(400, 'Invalid control');
        return json(res, 200, await session.command(body as any));
      }
      if (url.pathname === '/api/conversations') {
        exact(body, ['id','worldId','actorId','message']);
        if (!npcIds.includes(body.actorId) || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 500) throw new SessionError(400, 'Invalid conversation');
        return json(res, 200, await session.converse(body as any));
      }
      if (url.pathname === '/api/proposals') { exact(body, ['id','worldId','proposalId']); if (typeof body.proposalId !== 'string') throw new SessionError(400, 'Invalid proposal'); return json(res, 200, await session.confirm(body as any)); }
      throw new SessionError(404, 'Not found');
    } catch (error) { if (!res.headersSent) json(res, error instanceof SessionError ? error.status : 503, { error: error instanceof SessionError ? error.message : 'Service unavailable' }); else res.destroy(); }
  });
  server.requestTimeout = 25_000; server.headersTimeout = 10_000; server.maxHeadersCount = 32;
  const timer = setInterval(() => {
    if (options.tick === false || !streams.size || ticking) return;
    ticking = true;
    void session.tick(.25).then(() => { void session.decide().catch(() => {}); }).catch(() => {}).finally(() => { ticking = false; });
  }, 250); timer.unref();
  return { server, async close() { clearInterval(timer); for (const stream of streams) stream.end(); await new Promise<void>(resolve => server.close(() => resolve())); await session.close(); } };
}
function json(res: ServerResponse, status: number, value: unknown): void { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); }
function exact(value: object, keys: string[]): void { if (Object.keys(value).sort().join(',') !== keys.sort().join(',')) throw new SessionError(400, 'Invalid request fields'); }
async function readJson(req: IncomingMessage): Promise<Record<string, any>> {
  let text = ''; for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 4096) throw new SessionError(413, 'Request too large'); }
  try { const value: unknown = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value as Record<string, any>; } catch { throw new SessionError(400, 'Invalid JSON'); }
}
