import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NeighbourhoodServerSession, validateLivePlan } from '../server/session.js';
import { createNeighbourhoodHttp } from '../server/http.js';
import { MockNeighbourhoodProvider, MetaNeighbourhoodProvider, maximumGenerationUsd, validateConversation, type NeighbourhoodProvider } from '../server/inference/neighbourhood-provider.js';
import { initializeProbeBudget } from '../server/controls/probe-budget.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import type { ConversationContext } from '../shared/neighbourhood/conversation.js';

const folders: string[] = []; const cleanup: (() => Promise<void>)[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), 'city-backend-')); folders.push(path); return path; }
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); for (const path of folders.splice(0)) await rm(path, { recursive: true, force: true }); });
async function session(provider?: NeighbourhoodProvider) {
  let wall = 100_000; const checkpoint = join(await directory(), 'session.json');
  const value = await NeighbourhoodServerSession.open({ checkpoint, ...(provider ? { provider } : {}), now: () => wall });
  cleanup.push(() => value.close()); return { value, checkpoint, elapse: () => { wall += 4000; } };
}
const context = (): ConversationContext => ({ observation: new Neighbourhood().observe('zainab'), message: 'Where can I eat?', history: [] });

describe('authoritative durable session', () => {
  it('propagates validated road changes to events and affected character observations', async () => {
    const fixture = new MockNeighbourhoodProvider(); const spy = vi.spyOn(fixture, 'decide'); const { value } = await session(fixture);
    const input = { id: 'closure', worldId: value.frame.snapshot.worldId, type: 'road' as const, edgeId: 'stand-centre', blocked: true };
    expect((await value.command(input)).accepted).toBe(true); expect(value.frame.snapshot.blockedEdges).toContain('stand-centre');
    await value.decide('musa'); expect(spy.mock.calls[0]![0].observation.knownBlockedEdges).toContain('stand-centre');
    expect(value.frame.events.some(event => event.type === 'road-changed')).toBe(true);
  });
  it('publishes matching snapshots and events only after a checkpoint exists', async () => {
    const { value, checkpoint } = await session(); await value.decide('amina');
    const saved = JSON.parse(await readFile(checkpoint, 'utf8')); const world = JSON.parse(saved.world);
    expect(saved.sequence).toBe(value.frame.sequence); expect(world.revision).toBe(value.frame.snapshot.revision);
    expect(value.frame.events.some(event => event.type === 'action-validated')).toBe(true);
    expect(JSON.stringify(value.frame)).not.toContain('memories');
  });
  it('runs collection, delivery and purchases using the existing authoritative world', async () => {
    const { value, elapse } = await session();
    for (let index = 0; index < 300; index++) { elapse(); await value.decide(); await value.tick(.25); }
    expect(value.frame.snapshot.tasks.some(task => task.status === 'delivered')).toBe(true);
    expect(value.frame.snapshot.actors.find(actor => actor.id === 'zainab')!.goods).toBe(1);
    expect(value.frame.snapshot.resources.supplierGoods + value.frame.snapshot.resources.marketGoods + value.frame.snapshot.actors.reduce((sum, actor) => sum + actor.goods, 0)).toBe(9);
  });
  it('restores memories, time, event sequence, transcript and request counts across restart', async () => {
    const { value, checkpoint } = await session(); const id = value.frame.snapshot.worldId;
    await value.converse({ id: 'chat', worldId: id, actorId: 'zainab', message: 'I heard supplies vanished' });
    await value.command({ id: 'pause', worldId: id, type: 'pause', paused: true }); const before = value.frame; await value.close();
    const restored = await NeighbourhoodServerSession.open({ checkpoint }); cleanup.push(() => restored.close());
    expect(restored.frame.sequence).toBeGreaterThan(before.sequence); expect(restored.frame.snapshot.worldId).toBe(id);
    expect(restored.frame.paused).toBe(true); expect(restored.frame.decisionBudget.used).toBe(1);
    expect(restored.history('zainab')).toHaveLength(2);
    const world = Neighbourhood.restore(JSON.parse(await readFile(checkpoint, 'utf8')).world);
    expect(world.observe('zainab').actor.memories.some(memory => memory.source === 'player' && memory.kind === 'reported' && memory.certainty === 'uncertain')).toBe(true);
    expect(world.snapshot.resources.supplierGoods).toBe(8);
  });
  it('deduplicates conversations without generating twice', async () => {
    const provider = new MockNeighbourhoodProvider(); const spy = vi.spyOn(provider, 'converse'); const { value } = await session(provider);
    const input = { id: 'same', worldId: value.frame.snapshot.worldId, actorId: 'amina' as const, message: 'Hello' };
    expect(await value.converse(input)).toEqual(await value.converse(input)); expect(spy).toHaveBeenCalledTimes(1);
    await expect(value.converse({ ...input, message: 'Changed' })).rejects.toThrow('collision');
  });
  it('preserves inference counts and wall throttles across world reset', async () => {
    const { value } = await session(); await value.converse({ id: 'chat', worldId: value.frame.snapshot.worldId, actorId: 'amina', message: 'Hello' });
    await value.command({ id: 'reset', worldId: value.frame.snapshot.worldId, type: 'reset', experiment: 'cooperate' });
    expect(value.frame.decisionBudget.used).toBe(1);
    await expect(value.converse({ id: 'again', worldId: value.frame.snapshot.worldId, actorId: 'amina', message: 'Hello' })).rejects.toThrow('cooldown');
  });
  it('permits only one generation globally and rejects stale results after reset', async () => {
    const provider = new MockNeighbourhoodProvider(); let release!: (value: Awaited<ReturnType<typeof provider.converse>>) => void;
    vi.spyOn(provider, 'converse').mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const { value } = await session(provider); const pending = value.converse({ id: 'slow', worldId: value.frame.snapshot.worldId, actorId: 'amina', message: 'Hello' });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await expect(value.converse({ id: 'other', worldId: value.frame.snapshot.worldId, actorId: 'musa', message: 'Hello' })).rejects.toThrow('pending');
    await value.command({ id: 'reset', worldId: value.frame.snapshot.worldId, type: 'reset', experiment: 'cooperate' });
    release({ reply: 'Late reply', evidenceIds: [], uncertain: true, proposedDecision: null });
    await expect(pending).rejects.toThrow('changed'); expect(value.history('amina')).toEqual([]);
  });
  it('leaves conversation actions pending until separate confirmation and prevents duplicate effects', async () => {
    const provider = new MockNeighbourhoodProvider();
    vi.spyOn(provider, 'converse').mockImplementation(async context => ({ reply: 'I could walk to the market.', evidenceIds: ['market'], uncertain: false, proposedDecision: { goalId: context.observation.actor.goals[0]!.id, reason: 'Proposed walk', action: { type: 'travel', destination: 'market' } } }));
    const { value } = await session(provider); const worldId = value.frame.snapshot.worldId;
    const reply = await value.converse({ id: 'chat', worldId, actorId: 'zainab', message: 'Visit the market?' });
    expect(reply.proposalId).toBeTruthy(); expect(value.frame.snapshot.actors.find(actor => actor.id === 'zainab')!.moving).toBe(false);
    const input = { id: 'confirm', worldId, proposalId: reply.proposalId! }; expect((await value.confirm(input)).accepted).toBe(true);
    const revision = value.frame.snapshot.revision; expect((await value.confirm(input)).accepted).toBe(true); expect(value.frame.snapshot.revision).toBe(revision);
  });
  it('rejects invalid proposed actions with the semantic validator', async () => {
    const provider = new MockNeighbourhoodProvider();
    vi.spyOn(provider, 'decide').mockImplementation(async request => ({ mode: 'mock', model: 'test', decision: { goalId: request.observation.actor.goals[0]!.id, reason: 'Invalid action', action: { type: 'buy', quantity: 6 } } }));
    const { value } = await session(provider); await value.decide('musa');
    expect(value.frame.events.filter(event => event.type === 'action-validated').at(-1)?.data.accepted).toBe(false);
    expect(value.frame.snapshot.resources.marketGoods).toBe(1);
  });
  it('pauses authoritative time and rejects stale autonomous inference after pause', async () => {
    const provider = new MockNeighbourhoodProvider(); let release!: () => void;
    vi.spyOn(provider, 'decide').mockImplementation(async request => { await new Promise<void>(resolve => { release = resolve; }); return new MockNeighbourhoodProvider().decide(request); });
    const { value } = await session(provider); const pending = value.decide('amina'); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await value.command({ id: 'pause', worldId: value.frame.snapshot.worldId, type: 'pause', paused: true }); await value.tick(.25); release(); await pending;
    expect(value.frame.snapshot.time).toBe(0); expect(value.frame.events.some(event => event.type === 'intention-selected')).toBe(false);
  });
  it('does not substitute mock output or retry when inference fails', async () => {
    const provider = new MockNeighbourhoodProvider(); const spy = vi.spyOn(provider, 'converse').mockRejectedValue(new Error('timeout with confidential upstream data'));
    const { value } = await session(provider); const input = { id: 'failed', worldId: value.frame.snapshot.worldId, actorId: 'musa' as const, message: 'Hello' };
    await expect(value.converse(input)).rejects.toThrow('no mock substitution'); await expect(value.converse(input)).rejects.toThrow('will not be retried'); expect(spy).toHaveBeenCalledTimes(1);
  });
  it('fails closed on corrupt checkpoints', async () => {
    const checkpoint = join(await directory(), 'bad.json'); await writeFile(checkpoint, '{}'); await expect(NeighbourhoodServerSession.open({ checkpoint })).rejects.toThrow('checkpoint');
  });
  it('rejects stale actor proposals after state changes and expires unanswered proposals', async () => {
    const provider = new MockNeighbourhoodProvider();
    vi.spyOn(provider, 'converse').mockImplementation(async context => ({ reply: 'I could wait.', evidenceIds: [], uncertain: true, proposedDecision: { goalId: context.observation.actor.goals[0]!.id, reason: 'Proposed wait', action: { type: 'wait', seconds: 2 } } }));
    const { value, elapse } = await session(provider); const worldId = value.frame.snapshot.worldId;
    const first = await value.converse({ id: 'first', worldId, actorId: 'zainab', message: 'Wait?' });
    for (let i=0;i<16;i++) elapse(); await value.tick(.25);
    await expect(value.confirm({ id: 'expired', worldId, proposalId: first.proposalId! })).rejects.toThrow('expired');
    expect(value.frame.snapshot.actors.find(actor => actor.id === 'zainab')!.moving).toBe(false);
  });
  it('enforces session maximum requests across restarts', async () => {
    const { value, checkpoint, elapse } = await session();
    for (let i=0;i<48;i++) {
      for (let j=0;j<16;j++) elapse();
      await value.converse({ id: `chat-${i}`, worldId: value.frame.snapshot.worldId, actorId: 'zainab', message: 'Hello' });
    }
    await value.close(); const restored = await NeighbourhoodServerSession.open({ checkpoint, now: () => 10_000_000 }); cleanup.push(() => restored.close());
    await expect(restored.converse({ id: 'exhausted', worldId: restored.frame.snapshot.worldId, actorId: 'musa', message: 'Hello' })).rejects.toThrow('limit');
    expect(restored.frame.decisionBudget.used).toBe(48);
  });
  it('enforces approved live allowance using a simulated provider, including after reset', async () => {
    const fixture = new MockNeighbourhoodProvider();
    const provider: NeighbourhoodProvider = { mode: 'live-meta', metrics: null, converse: context => fixture.converse(context), decide: request => fixture.decide(request) };
    const checkpoint = join(await directory(), 'session.json');
    const plan = { id: 'test-plan', approved: true as const, expiresAt: new Date(Date.now()+60000).toISOString(), maxGenerations: 1, maxEstimatedUsd: .025, allowAutonomy: false };
    const value = await NeighbourhoodServerSession.open({ checkpoint, provider, plan }); cleanup.push(() => value.close());
    await value.decide(); expect(value.frame.decisionBudget.used).toBe(0);
    await value.converse({ id: 'chat', worldId: value.frame.snapshot.worldId, actorId: 'zainab', message: 'Hello' });
    await value.command({ id: 'reset', worldId: value.frame.snapshot.worldId, type: 'reset', experiment: 'cooperate' });
    await expect(value.converse({ id: 'second', worldId: value.frame.snapshot.worldId, actorId: 'musa', message: 'Hello' })).rejects.toThrow('allowance');
    expect(JSON.parse(await readFile(checkpoint,'utf8')).plan.used).toBe(1);
  });
});

describe('controlled HTTP boundary', () => {
  async function http() {
    const { value } = await session(); const token = 'test-only-operator-token-'.repeat(3); const app = createNeighbourhoodHttp(value, token, { tick: false });
    await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve)); cleanup.push(() => app.close());
    const url = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    const post = (path: string, body: unknown, cookie = '', origin = url) => fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-City-Lab': '1', Origin: origin, Cookie: cookie }, body: JSON.stringify(body) });
    const login = await post('/api/login', { token }); const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    return { value, url, cookie, post, login };
  }
  it('requires authentication for snapshots, events and all writes', async () => {
    const { url, post, login } = await http(); expect(login.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Strict');
    expect((await fetch(url + '/api/session')).status).toBe(401); expect((await fetch(url + '/api/events')).status).toBe(401);
    expect((await post('/api/commands', {})).status).toBe(401);
  });
  it('rejects cross-origin writes, unknown fields and excessive message bodies', async () => {
    const { url, cookie, post, value } = await http();
    expect((await post('/api/commands', {}, cookie, 'https://attacker.example')).status).toBe(403);
    const input = { id: 'chat', worldId: value.frame.snapshot.worldId, actorId: 'amina', message: 'Hello' };
    expect((await post('/api/conversations', { ...input, secret: 'extra' }, cookie)).status).toBe(400);
    expect((await post('/api/conversations', { ...input, message: 'x'.repeat(5000) }, cookie)).status).toBe(413);
    expect((await fetch(url + '/api/session', { headers: { Cookie: cookie } })).status).toBe(200);
  });
  it('accepts a controlled conversation and never serves credentials or checkpoints', async () => {
    const { url, cookie, post, value } = await http();
    const response = await post('/api/conversations', { id: 'chat', worldId: value.frame.snapshot.worldId, actorId: 'amina', message: 'Where is food?' }, cookie);
    expect(response.status).toBe(200); expect((await response.json()).reply).toContain('Mock fixture');
    for (const path of ['/.env','/runtime/meta-probe-budget.json','/runtime/neighbourhood-session.json','/api/logs','/server/session.ts']) expect((await fetch(url + path, { headers: { Cookie: cookie } })).status).toBe(404);
  });
  it('throttles abusive authentication attempts', async () => { const { post } = await http(); for (let i=0;i<4;i++) expect((await post('/api/login', { token: 'wrong' })).status).toBe(401); expect((await post('/api/login', { token: 'wrong' })).status).toBe(429); });
});

describe('Meta neighbourhood contract without paid requests', () => {
  async function provider(response: unknown, budget = .25) {
    const ledgerPath = join(await directory(), 'ledger.json'); await initializeProbeBudget(ledgerPath);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ input_tokens: 400 }))).mockResolvedValueOnce(new Response(JSON.stringify(response)));
    const provider = new MetaNeighbourhoodProvider({ apiKey: 'test-only-placeholder', ledgerPath, dailyUsd: budget, totalUsd: 1, fetcher });
    return { provider, fetcher, ledgerPath };
  }
  const output = (value: unknown, model = 'muse-spark-1.3') => ({ model, status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 400, output_tokens: 100 } });
  it('uses the verified endpoint, bounded Responses request and original persistent reservations', async () => {
    const { provider: p, fetcher, ledgerPath } = await provider(output({ reply: 'I know Market Square.', evidenceIds: ['market'], uncertain: false, proposedDecision: null }));
    await p.converse(context()); expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]![0]).toBe('https://api.meta.ai/v1/responses/input_tokens'); expect(fetcher.mock.calls[1]![0]).toBe('https://api.meta.ai/v1/responses');
    const body = JSON.parse(fetcher.mock.calls[1]![1]!.body as string); expect(body.model).toBe('muse-spark-1.3'); expect(body.max_output_tokens).toBe(2048); expect(body.store).toBe(false); expect(body.text.format.strict).toBe(true);
    expect(body.input).not.toContain('lake-overlook'); expect(body.input).not.toContain('earn');
    expect(JSON.parse(await readFile(ledgerPath, 'utf8')).reservations[0].microUsd).toBe(Math.ceil(maximumGenerationUsd * 1e6));
    expect(p.metrics?.inputTokens).toBe(400); expect(p.metrics?.estimatedCostUsd).toBeLessThan(maximumGenerationUsd);
  });
  it('makes no HTTP calls when the persistent budget cannot reserve the maximum', async () => {
    const { provider: p, fetcher } = await provider({}, .001); await expect(p.converse(context())).rejects.toThrow('exhausted'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not retry network failures and retains reservations', async () => {
    const { provider: p, fetcher, ledgerPath } = await provider({}); fetcher.mockReset().mockRejectedValue(new DOMException('Timeout', 'TimeoutError'));
    await expect(p.converse(context())).rejects.toThrow('Timeout'); expect(fetcher).toHaveBeenCalledTimes(1); expect(JSON.parse(await readFile(ledgerPath, 'utf8')).reservations).toHaveLength(1);
  });
  it('rejects a different responding model', async () => { const { provider: p } = await provider(output({}, 'other-model')); await expect(p.converse(context())).rejects.toThrow('Unexpected Meta model'); });
  it('rejects invented evidence and malformed model actions', async () => {
    const { provider: p } = await provider(output({ reply: 'Invented place', evidenceIds: ['unknown-palace'], uncertain: false, proposedDecision: null })); await expect(p.converse(context())).rejects.toThrow('grounded');
    expect(() => validateConversation({ reply: 'Done', evidenceIds: [], uncertain: true, proposedDecision: { action: { type: 'execute-code' } } }, context())).toThrow();
  });
  it('requires explicit, unexpired and bounded live evaluation approval', async () => {
    expect(() => validateLivePlan(undefined)).toThrow(); expect(() => validateLivePlan({ id: 'eval', approved: true, expiresAt: '2000-01-01', maxGenerations: 1, maxEstimatedUsd: .1, allowAutonomy: false })).toThrow();
    const plan = { id: 'eval', approved: true, expiresAt: new Date(Date.now()+60000).toISOString(), maxGenerations: 1, maxEstimatedUsd: .025, allowAutonomy: false }; expect(() => validateLivePlan(plan)).not.toThrow();
    const { provider: p } = await provider({}); await expect(NeighbourhoodServerSession.open({ checkpoint: join(await directory(), 'session.json'), provider: p })).rejects.toThrow('approved');
  });
});
