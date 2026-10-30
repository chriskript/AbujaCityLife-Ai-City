import './neighbourhood.css';
import { NeighbourhoodScene } from './rendering/scene.js';
import { LocalNeighbourhoodSession } from './simulation/local-neighbourhood-session.js';
import { RemoteNeighbourhoodSession } from './simulation/remote-neighbourhood-session.js';
import { PresentationStore, type NeighbourhoodSession, type NeighbourhoodFrame, type ObservableEvent, type Experiment, type SessionCommand } from '../../shared/neighbourhood/presentation.js';
import type { NpcId } from '../../shared/neighbourhood/types.js';

document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = 'Observe the residents working, travelling and cooperating in an original miniature neighbourhood inspired by Abuja.';
document.querySelector('#experience')!.innerHTML = `
  <div id="world" aria-label="Living 3D neighbourhood with autonomous mock residents"></div>
  <div id="labels" aria-hidden="true"></div><div id="inhabitant-labels" aria-label="Select an inhabitant in the scene"></div>
  <div class="scene-caption"><span class="eyebrow">INDEPENDENT LIVES. ONE SHARED WORLD.</span><h1>Life happens<br />around you.</h1><p>Watch their day unfold. Choose someone to get closer.</p></div>
  <section class="inhabitant-panel" aria-label="Inhabitants">
    <div class="people" role="group" aria-label="Choose an inhabitant">
    </div>
    <div class="person-heading"><span id="person-avatar" class="portrait large amina">A</span><div><h2 id="person-name">Amina</h2><p id="person-role">Market trader</p></div><span class="local-tag">NEIGHBOUR</span></div>
    <div class="activity-line"><span></span><strong id="person-activity" role="status">Starting the day</strong></div>
    <p id="person-intention" class="intention">The neighbourhood is waking up.</p>
    <div class="person-facts"><span id="person-location">Market Square</span><span id="person-goods">No goods carried</span></div>
    <div class="recent-heading">RECENTLY OBSERVED</div><ul id="person-recent" class="person-recent"></ul><p id="person-social" class="intention"></p>
    <details class="conversation"><summary>Talk to <span id="talk-name">Amina</span> <span id="conversation-mode" class="coming-soon">CONNECTING</span></summary><div id="transcript" aria-live="polite"></div><label for="conversation-input">Message</label><textarea id="conversation-input" maxlength="500" placeholder="Ask about their neighbourhood…"></textarea><button id="send-message">Send message</button><button id="confirm-proposal" hidden>Confirm proposed action</button><p id="conversation-status">Mock replies are labelled fixtures. Actions require separate validation.</p></details>
    <section id="backend-access" hidden><label for="demo-token">Local demo access token</label><input id="demo-token" type="password" autocomplete="off" /><button id="sign-in">Connect to backend</button><p id="connection-status" role="status"></p></section>
    <details class="experiments"><summary>Neighbourhood experiments</summary><label for="experiment">Mock decision policy</label><select id="experiment"><option value="cooperate">Cooperation</option><option value="decline">Driver declines</option><option value="wait">Trader waits</option><option value="self-collect">Trader collects supplies herself</option><option value="reduce-sales">Trader pauses sales</option></select><p>Choose an alternative, then reset. These are labelled mock policies, not guaranteed live AI outcomes.</p></details>
  </section>
  <div class="view-controls" role="group" aria-label="Neighbourhood controls"><button id="focus" aria-pressed="false">◎ Focus Amina</button><button id="pause" aria-pressed="false">Ⅱ Pause</button></div>
  <div class="compass" aria-hidden="true"><span>↑</span>N</div>
  <section class="activity-feed" aria-label="Neighbourhood activity"><div class="feed-heading"><span class="eyebrow">AROUND THE NEIGHBOURHOOD</span><span id="feed-mode">MOCK</span></div><ol id="activity-feed"></ol><details id="event-inspection"><summary>Inspect recorded events</summary><pre id="event-details"></pre></details></section>
  <section class="neighbourhood-bar" aria-label="Shared world status"><div><span class="eyebrow">AT THE MARKET</span><strong id="market-stock">1 portion available</strong></div><div><span class="eyebrow">SUPPLY DESK</span><strong id="supplier-stock">8 goods</strong></div><div class="cooperation-status"><span class="eyebrow">NEIGHBOURS HELPING NEIGHBOURS</span><strong id="task-status" role="status">A new day begins</strong></div><div class="clock-controls"><span id="world-clock">00:00</span><label class="sr-only" for="speed">Simulation speed</label><select id="speed"><option value="1">1× time</option><option value="2" selected>2× time</option><option value="4">4× time</option></select><button id="reset">↻ Reset neighbourhood</button></div></section>
  <div id="notice" role="status">Activities use scripted mock decisions. No Meta requests are made.</div>`;

const el = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const local = new URLSearchParams(location.search).get('authority') === 'local';
const remote = local ? null : new RemoteNeighbourhoodSession();
const session: NeighbourhoodSession = remote ?? new LocalNeighbourhoodSession();
let proposalId: string | null = null;
let conversationBusy = false;
const store = new PresentationStore();
const listeners = new AbortController();
let frame: NeighbourhoodFrame | null = null;
let selected: NpcId = 'amina';
let focused = false;
let disposed = false;
let lostContext = false;
let lastTime = 0;
let elapsedFrames = 0;
let elapsedSeconds = 0;
let fps = 0;
let previousWorld = '';
let uiKey = '';
let scene: NeighbourhoodScene;
const names: Record<string,string> = {};
const locations: Record<string, string> = { stand: 'Taxi Stand', centre: 'Community Centre', market: 'Market Square', overlook: 'Lake Overlook', hill: 'Hill Garden', west: 'West road', junction: 'Road junction', bridge: 'Lake junction' };

export function describeObservable(event: ObservableEvent): string {
  const name = event.actor ? names[event.actor] ?? 'Resident' : 'Neighbourhood';
  const descriptions: Record<string, string> = {
    'encounter-noticed': `${names[String(event.data.first)] ?? 'A resident'} noticed ${names[String(event.data.second)] ?? 'a neighbour'} nearby.`,
    'encounter-invited': `${name} invited ${names[String(event.data.recipient)] ?? 'a neighbour'} to talk: ${event.detail}`,
    'encounter-accepted': `${name} agreed to discuss the opportunity. This is not a job commitment.`,
    'encounter-declined': `${name} declined the conversation.`,
    'encounter-deferred': `${name} deferred the conversation to attend to another priority.`,
    'encounter-clarified': `${name} asked for clarification: ${event.detail}`,
    'encounter-expired': 'An encounter invitation expired without a response.',
    'resident-introduced': event.detail,
    'information-shared': `${name} shared an attributed report: ${event.detail}`,
    'transport-proposed': `${name} asked for help bringing supplies.`,
    'transport-accepted': `${name} accepted the transport request.`,
    'transport-declined': `${name} declined the transport request.`,
    'transport-collected': `${name} collected ${event.data.quantity} goods at the supply desk.`,
    'transport-delivered': `${name} delivered ${event.data.quantity} goods to the market.`,
    'delivery-observed': `${name} checked the delivered goods and receipt.`,
    'buy': `${name} bought ${event.data.quantity} portion.`,
    'collect-self': `${name} collected ${event.data.quantity} supplies herself.`,
    'stock-stall': `${name} added ${event.data.quantity} goods to the stall.`,
    'sales-changed': event.data.open ? `${name} reopened the stall.` : `${name} paused sales.`,
    'action-failed': `${name} stopped: ${event.detail}.`,
    'offer-expired': 'An unanswered transport offer expired.',
    'road-changed': event.detail,
    'arrived': `${name} arrived at ${locations[event.subject] ?? event.subject}.`,
    'activity-started': `${name} ${event.subject === 'wait' ? 'is waiting' : 'started a local activity'}.`,
    'activity-completed': `${name} finished an activity.`,
  };
  return descriptions[event.type] ?? `${name}: ${event.detail}`;
}
function timeLabel(time: number): string { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }

function select(id: NpcId): void {
  selected = id; focused = true; proposalId = null; el('#confirm-proposal').hidden = true; scene.setFollow(true); updateUi(true); void loadHistory();
}
function updateUi(force = false): void {
  if (!frame) return;
  const view = frame.snapshot;
  el('#world-clock').textContent = `${timeLabel(view.time)}${frame.paused ? ' · paused' : ''}`;
  const key = `${view.worldId}:${frame.eventCursor}:${selected}:${frame.paused}:${frame.speed}:${focused}`;
  if (!force && key === uiKey) return; uiKey = key;
  if (!view.actors.some(actor => actor.id === selected)) selected = view.actors[0]!.id;
  for (const person of view.actors) names[person.id] = person.name;
  const roster = el('.people');
  if ([...roster.querySelectorAll<HTMLElement>('[data-person]')].map(button => button.dataset.person).join(':') !== view.actors.map(person => person.id).join(':')) {
    roster.replaceChildren();
    for (const person of view.actors) {
      const button = document.createElement('button'); button.dataset.person = person.id;
      const portrait = document.createElement('span'); portrait.className = 'portrait ' + person.id; portrait.textContent = person.name[0]!;
      button.append(portrait,document.createTextNode(person.name));
      button.addEventListener('click',() => select(person.id), { signal: listeners.signal }); roster.append(button);
    }
  }
  const actor = view.actors.find(actor => actor.id === selected)!;
  el('#person-name').textContent = actor.name; el('#person-role').textContent = actor.occupation;
  el('#person-activity').textContent = actor.activity;
  el('#person-intention').textContent = actor.intention ?? 'Choosing an activity from personal priorities.';
  el('#person-location').textContent = actor.moving ? `From ${locations[actor.node] ?? actor.node}` : locations[actor.node] ?? actor.node;
  el('#person-goods').textContent = actor.goods ? `Carrying ${actor.goods} goods` : actor.rewards ? `${actor.rewards} completed job` : 'No goods carried';
  el('#person-avatar').className = `portrait large ${selected}`; el('#person-avatar').textContent = actor.name[0]!;
  el('#talk-name').textContent = actor.name;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-person]')) button.setAttribute('aria-pressed', String(button.dataset.person === selected));
  const pause = el<HTMLButtonElement>('#pause'); pause.setAttribute('aria-pressed', String(frame.paused)); pause.textContent = frame.paused ? '▷ Resume' : 'Ⅱ Pause';
  const focus = el<HTMLButtonElement>('#focus'); focus.setAttribute('aria-pressed', String(focused)); focus.textContent = focused ? '◎ Whole neighbourhood' : `◎ Focus ${actor.name}`;
  el<HTMLSelectElement>('#speed').value = String(frame.speed);
  el('#market-stock').textContent = `${view.resources.marketGoods} ${view.resources.marketGoods === 1 ? 'portion' : 'portions'}${view.resources.salesOpen ? ' available' : ' · sales paused'}`;
  el('#supplier-stock').textContent = `${view.resources.supplierGoods} goods`;
  const task = view.tasks.at(-1);
  const statuses = { proposed: 'Transport requested', accepted: `${names[task?.recipient ?? ''] ?? 'Resident'} agreed to help`, declined: `${names[task?.recipient ?? ''] ?? 'Resident'} declined the request`, collected: 'Supplies on board', delivered: 'Delivery completed', expired: 'Request expired' };
  el('#task-status').textContent = task ? statuses[task.status] : 'Neighbours at work';
  const events = frame.events.filter(event => !['action-validated', 'action-proposed', 'intention-selected'].includes(event.type));
  const feed = el('#activity-feed'); feed.replaceChildren();
  for (const event of events.slice(-5).reverse()) {
    const item = document.createElement('li'); const timestamp = document.createElement('time');
    timestamp.textContent = timeLabel(event.time); item.append(timestamp, document.createTextNode(describeObservable(event))); feed.append(item);
  }
  const relevant = events.filter(event => event.actor === selected || view.tasks.some(task => task.id === event.subject && (task.recipient === selected || task.requester === selected)));
  const recent = el('#person-recent'); recent.replaceChildren();
  for (const event of relevant.slice(-2).reverse()) { const item = document.createElement('li'); item.textContent = describeObservable(event); recent.append(item); }
  if (!recent.children.length) { const item = document.createElement('li'); item.textContent = 'Their day is just beginning.'; recent.append(item); }
  const encounter = view.encounters.filter(item => item.initiator === selected || item.recipient === selected).at(-1);
  el('#person-social').textContent = encounter ? `Encounter with ${names[encounter.initiator === selected ? encounter.recipient : encounter.initiator]}: ${encounter.status}. Job commitments are recorded separately.` : 'Nearby encounters are optional.';
  el('#event-details').textContent = JSON.stringify({ mode: frame.mode, time: view.time, revision: view.revision, tasks: view.tasks, encounters: view.encounters, events: frame.events }, null, 2);
  const mode = el('.mode-pill'); mode.replaceChildren(); const dot = document.createElement('i');
  mode.title = frame.mode === 'mock' ? 'Deterministic mock decisions. No model API calls.' : 'Decisions supplied by the live Meta provider.';
  mode.append(dot, document.createTextNode(frame.mode === 'mock' ? local ? 'Mock / local test' : 'Mock / backend' : 'Live Meta / backend'));
  el('#feed-mode').textContent = frame.mode === 'mock' ? 'MOCK' : 'LIVE META';
  document.body.dataset.worldId = view.worldId; document.body.dataset.task = task?.status ?? 'none';
  document.body.dataset.selected = selected; document.body.dataset.paused = String(frame.paused);
  document.body.dataset.marketGoods = String(view.resources.marketGoods);
  el('#conversation-mode').textContent = frame.mode === 'live-meta' ? 'LIVE META' : 'MOCK FIXTURE';
  el<HTMLButtonElement>('#send-message').disabled = !remote || conversationBusy;
  el<HTMLTextAreaElement>('#conversation-input').disabled = !remote;
  if (frame.decisionBudget.used >= frame.decisionBudget.limit) el('#notice').textContent = 'Session decision limit reached. Reset preserves request and spending limits.';
  else el('#notice').textContent = frame.mode === 'live-meta' ? 'Live Meta decisions. Actions are validated by the authoritative backend.' : local ? 'Local mock test mode. No backend or Meta requests.' : 'Authoritative backend · mock activities and labelled conversation fixtures · no Meta requests.';
}

async function command(payload: Omit<Extract<SessionCommand, { type: 'pause' }>, 'id' | 'worldId'> | Omit<Extract<SessionCommand, { type: 'speed' }>, 'id' | 'worldId'> | Omit<Extract<SessionCommand, { type: 'reset' }>, 'id' | 'worldId'>): Promise<void> {
  if (!frame) return;
  try {
    const receipt = await session.send({ ...payload, id: `ui-${crypto.randomUUID()}`, worldId: frame.snapshot.worldId });
    if (!receipt.accepted) el('#notice').textContent = receipt.reason;
  } catch (error) { el('#notice').textContent = (error as Error).message; }
}
async function loadHistory(): Promise<void> {
  if (!remote) return;
  const actor = selected;
  try {
    const turns = await remote.history(actor); if (actor !== selected) return;
    const target = el('#transcript'); target.replaceChildren();
    for (const turn of turns) { const line = document.createElement('p'); line.textContent = `${turn.speaker === 'player' ? 'You' : names[actor]} (${turn.mode}): ${turn.text}`; target.append(line); }
  } catch { /* Connection status is shown separately. */ }
}
let unsubscribe = (): void => {};
function dispose(): void {
  if (disposed) return; disposed = true;
  listeners.abort(); unsubscribe(); session.dispose(); scene?.dispose();
}

try {
  scene = new NeighbourhoodScene(el('#world'), el('#labels'), lost => {
    lostContext = lost; lastTime = 0; session.setVisible(!lost && !document.hidden);
    el('#notice').textContent = lost ? 'Graphics paused. Waiting for the scene to recover…' : 'Activities use scripted mock decisions. No Meta requests are made.';
  });
  scene.enableInhabitants(select);
  unsubscribe = session.subscribe(next => {
    if (!store.accept(next)) return; frame = store.frame!;
    if (previousWorld !== frame.snapshot.worldId) { scene.resetPresentation(); previousWorld = frame.snapshot.worldId; proposalId = null; el('#confirm-proposal').hidden = true; void loadHistory(); }
    updateUi();
  });
  const options = { signal: listeners.signal };
  remote?.onConnection(state => {
    el('#backend-access').hidden = state === 'ready';
    el('#demo-token').hidden = state !== 'unauthorized'; el('#sign-in').hidden = state !== 'unauthorized';
    el('#connection-status').textContent = state === 'unauthorized' ? 'Controlled local demonstration. Use the token from runtime/demo-access.json.' : state === 'offline' ? 'Backend unavailable. Start npm run backend, then reload. The visible snapshot is frozen.' : state === 'connecting' ? 'Connecting to authoritative backend…' : '';
    if (state !== 'ready') el('#notice').textContent = 'Waiting for the secured backend. No local fallback or inference is running.';
  });
  el('#sign-in').addEventListener('click', () => {
    const input = el<HTMLInputElement>('#demo-token'); const token = input.value; input.value = '';
    void remote?.login(token).catch(() => { el('#connection-status').textContent = 'Access denied or backend unavailable.'; });
  }, options);
  el('#send-message').addEventListener('click', () => {
    if (!remote || !frame || conversationBusy) return;
    const input = el<HTMLTextAreaElement>('#conversation-input'); const message = input.value.trim(); if (!message) return;
    const actorId = selected; conversationBusy = true; updateUi(true); el('#conversation-status').textContent = 'Waiting for the backend…';
    void remote.converse({ id: crypto.randomUUID(), worldId: frame.snapshot.worldId, actorId, message }).then(async result => {
      input.value = ''; if (actorId === selected) { proposalId = result.proposalId; el('#confirm-proposal').hidden = !proposalId; }
      el('#conversation-status').textContent = result.mode === 'mock' ? 'Mock fixture. No live reasoning or paid inference.' : 'Live Meta response. Proposed actions require confirmation.';
      await loadHistory();
    }).catch(error => { el('#conversation-status').textContent = (error as Error).message; }).finally(() => { conversationBusy = false; updateUi(true); });
  }, options);
  el('#confirm-proposal').addEventListener('click', () => {
    if (!remote || !frame || !proposalId) return;
    void remote.confirm({ id: crypto.randomUUID(), worldId: frame.snapshot.worldId, proposalId }).then(result => { el('#conversation-status').textContent = `Action validation: ${result.reason}`; }).catch(error => { el('#conversation-status').textContent = (error as Error).message; });
    proposalId = null; el('#confirm-proposal').hidden = true;
  }, options);

  el('#pause').addEventListener('click', () => { void command({ type: 'pause', paused: !(frame?.paused ?? true) }); }, options);
  el('#reset').addEventListener('click', () => {
    focused = false; scene.setFollow(false);
    void command({ type: 'reset', experiment: el<HTMLSelectElement>('#experiment').value as Experiment });
  }, options);
  el('#speed').addEventListener('change', () => { void command({ type: 'speed', speed: Number(el<HTMLSelectElement>('#speed').value) as 1 | 2 | 4 }); }, options);
  el('#focus').addEventListener('click', () => { focused = !focused; scene.setFollow(focused); updateUi(true); }, options);
  document.addEventListener('visibilitychange', () => { lastTime = 0; session.setVisible(!document.hidden && !lostContext); }, options);
  window.addEventListener('pagehide', event => { if (!(event as PageTransitionEvent).persisted) dispose(); }, options);
  scene.renderer.setAnimationLoop(time => {
    const seconds = lastTime ? (time - lastTime) / 1000 : 0; lastTime = time;
    if (disposed || document.hidden || lostContext) return;
    session.update(seconds);
    if (frame) scene.renderInhabitants(frame.snapshot, selected, seconds);
    if (seconds > 0) { elapsedFrames++; elapsedSeconds += seconds; }
    if (elapsedSeconds >= 1) { fps = Math.round(elapsedFrames / elapsedSeconds); elapsedFrames = 0; elapsedSeconds = 0; el('#fps').textContent = `${fps} FPS · shared simulation`; }
  });
  if (import.meta.env.DEV) Object.defineProperty(window, '__cityNeighbourhood', { configurable: true, get: () => ({ frame: structuredClone(frame), selected, fps, ...scene.metrics }) });
  import.meta.hot?.dispose(() => { dispose(); delete (window as unknown as Record<string, unknown>).__cityNeighbourhood; });
} catch {
  dispose(); el('#notice').textContent = 'The neighbourhood needs WebGL 2. Enable hardware acceleration and reload, or run npm run demo:neighbourhood.';
}
