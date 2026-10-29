import './neighbourhood.css';
import { NeighbourhoodScene } from './rendering/scene.js';
import { LocalNeighbourhoodSession } from './simulation/local-neighbourhood-session.js';
import { PresentationStore, type NeighbourhoodSession, type NeighbourhoodFrame, type ObservableEvent, type Experiment, type SessionCommand } from '../../shared/neighbourhood/presentation.js';
import type { NpcId } from '../../shared/neighbourhood/types.js';

document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = 'Observe three inhabitants working, travelling and cooperating in an original miniature neighbourhood inspired by Abuja.';
document.querySelector('#experience')!.innerHTML = `
  <div id="world" aria-label="Living 3D neighbourhood with three autonomous mock inhabitants"></div>
  <div id="labels" aria-hidden="true"></div><div id="inhabitant-labels" aria-label="Select an inhabitant in the scene"></div>
  <div class="scene-caption"><span class="eyebrow">THREE NEIGHBOURS. ONE SHARED WORLD.</span><h1>Life happens<br />around you.</h1><p>Watch their day unfold. Choose someone to get closer.</p></div>
  <section class="inhabitant-panel" aria-label="Inhabitants">
    <div class="people" role="group" aria-label="Choose an inhabitant">
      <button data-person="amina" aria-pressed="true"><span class="portrait amina">A</span>Amina</button>
      <button data-person="musa" aria-pressed="false"><span class="portrait musa">M</span>Musa</button>
      <button data-person="zainab" aria-pressed="false"><span class="portrait zainab">Z</span>Zainab</button>
    </div>
    <div class="person-heading"><span id="person-avatar" class="portrait large amina">A</span><div><h2 id="person-name">Amina</h2><p id="person-role">Market trader</p></div><span class="local-tag">NEIGHBOUR</span></div>
    <div class="activity-line"><span></span><strong id="person-activity" role="status">Starting the day</strong></div>
    <p id="person-intention" class="intention">The neighbourhood is waking up.</p>
    <div class="person-facts"><span id="person-location">Market Square</span><span id="person-goods">No goods carried</span></div>
    <div class="recent-heading">RECENTLY OBSERVED</div><ul id="person-recent" class="person-recent"></ul>
    <details class="conversation"><summary>Talk to <span id="talk-name">Amina</span> <span class="coming-soon">NOT CONNECTED</span></summary><label for="conversation-input">Conversation</label><textarea id="conversation-input" disabled placeholder="Natural conversation will be available after live Meta dialogue is connected."></textarea><button disabled>Send message</button><p>Mock mode runs activities, not unrestricted AI conversations.</p></details>
    <details class="experiments"><summary>Neighbourhood experiments</summary><label for="experiment">Mock decision policy</label><select id="experiment"><option value="cooperate">Cooperation</option><option value="decline">Driver declines</option><option value="wait">Trader waits</option><option value="self-collect">Trader collects supplies herself</option><option value="reduce-sales">Trader pauses sales</option></select><p>Choose an alternative, then reset. These are labelled mock policies, not guaranteed live AI outcomes.</p></details>
  </section>
  <div class="view-controls" role="group" aria-label="Neighbourhood controls"><button id="focus" aria-pressed="false">◎ Focus Amina</button><button id="pause" aria-pressed="false">Ⅱ Pause</button></div>
  <div class="compass" aria-hidden="true"><span>↑</span>N</div>
  <section class="activity-feed" aria-label="Neighbourhood activity"><div class="feed-heading"><span class="eyebrow">AROUND THE NEIGHBOURHOOD</span><span id="feed-mode">MOCK</span></div><ol id="activity-feed"></ol><details id="event-inspection"><summary>Inspect recorded events</summary><pre id="event-details"></pre></details></section>
  <section class="neighbourhood-bar" aria-label="Shared world status"><div><span class="eyebrow">AT THE MARKET</span><strong id="market-stock">1 portion available</strong></div><div><span class="eyebrow">SUPPLY DESK</span><strong id="supplier-stock">8 goods</strong></div><div class="cooperation-status"><span class="eyebrow">NEIGHBOURS HELPING NEIGHBOURS</span><strong id="task-status" role="status">A new day begins</strong></div><div class="clock-controls"><span id="world-clock">00:00</span><label class="sr-only" for="speed">Simulation speed</label><select id="speed"><option value="1">1× time</option><option value="2" selected>2× time</option><option value="4">4× time</option></select><button id="reset">↻ Reset neighbourhood</button></div></section>
  <div id="notice" role="status">Activities use scripted mock decisions. No Meta requests are made.</div>`;

const el = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const session: NeighbourhoodSession = new LocalNeighbourhoodSession();
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
let commandId = 0;
let previousWorld = '';
let uiKey = '';
let scene: NeighbourhoodScene;
const names = { amina: 'Amina', musa: 'Musa', zainab: 'Zainab' };
const locations: Record<string, string> = { stand: 'Taxi Stand', centre: 'Community Centre', market: 'Market Square', overlook: 'Lake Overlook', hill: 'Hill Garden', west: 'West road', junction: 'Road junction', bridge: 'Lake junction' };

export function describeObservable(event: ObservableEvent): string {
  const name = event.actor ? names[event.actor] : 'Neighbourhood';
  const descriptions: Record<string, string> = {
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
  selected = id; focused = true; scene.setFollow(true); updateUi(true);
}
function updateUi(force = false): void {
  if (!frame) return;
  const view = frame.snapshot;
  el('#world-clock').textContent = `${timeLabel(view.time)}${frame.paused ? ' · paused' : ''}`;
  const key = `${view.worldId}:${frame.eventCursor}:${selected}:${frame.paused}:${frame.speed}:${focused}`;
  if (!force && key === uiKey) return; uiKey = key;
  const actor = view.actors.find(actor => actor.id === selected)!;
  el('#person-name').textContent = actor.name; el('#person-role').textContent = actor.occupation;
  el('#person-activity').textContent = actor.activity;
  el('#person-intention').textContent = actor.intention ?? 'Choosing an activity from personal priorities.';
  el('#person-location').textContent = actor.moving ? `From ${locations[actor.node] ?? actor.node}` : locations[actor.node] ?? actor.node;
  el('#person-goods').textContent = actor.goods ? `Carrying ${actor.goods} goods` : selected === 'musa' && actor.rewards ? `${actor.rewards} completed job` : 'No goods carried';
  el('#person-avatar').className = `portrait large ${selected}`; el('#person-avatar').textContent = actor.name[0]!;
  el('#talk-name').textContent = actor.name;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-person]')) button.setAttribute('aria-pressed', String(button.dataset.person === selected));
  const pause = el<HTMLButtonElement>('#pause'); pause.setAttribute('aria-pressed', String(frame.paused)); pause.textContent = frame.paused ? '▷ Resume' : 'Ⅱ Pause';
  const focus = el<HTMLButtonElement>('#focus'); focus.setAttribute('aria-pressed', String(focused)); focus.textContent = focused ? '◎ Whole neighbourhood' : `◎ Focus ${actor.name}`;
  el<HTMLSelectElement>('#speed').value = String(frame.speed);
  el('#market-stock').textContent = `${view.resources.marketGoods} ${view.resources.marketGoods === 1 ? 'portion' : 'portions'}${view.resources.salesOpen ? ' available' : ' · sales paused'}`;
  el('#supplier-stock').textContent = `${view.resources.supplierGoods} goods`;
  const task = view.tasks.at(-1);
  const statuses = { proposed: 'Transport requested', accepted: 'Musa agreed to help', declined: 'Musa declined the request', collected: 'Supplies on board', delivered: 'Delivery completed', expired: 'Request expired' };
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
  el('#event-details').textContent = JSON.stringify({ mode: frame.mode, time: view.time, revision: view.revision, tasks: view.tasks, events: frame.events.slice(-12) }, null, 2);
  const mode = el('.mode-pill'); mode.replaceChildren(); const dot = document.createElement('i');
  mode.title = frame.mode === 'mock' ? 'Scripted local decisions. No model API calls.' : 'Decisions supplied by the live Meta provider.';
  mode.append(dot, document.createTextNode(frame.mode === 'mock' ? 'Mock mode / local' : 'Live Meta'));
  el('#feed-mode').textContent = frame.mode === 'mock' ? 'MOCK' : 'LIVE META';
  document.body.dataset.worldId = view.worldId; document.body.dataset.task = task?.status ?? 'none';
  document.body.dataset.selected = selected; document.body.dataset.paused = String(frame.paused);
  document.body.dataset.marketGoods = String(view.resources.marketGoods);
  if (frame.decisionBudget.used >= frame.decisionBudget.limit) el('#notice').textContent = 'This mock day has reached its decision limit. Reset to explore a fresh neighbourhood.';
  else el('#notice').textContent = 'Activities use scripted mock decisions. No Meta requests are made.';
}

async function command(payload: Omit<Extract<SessionCommand, { type: 'pause' }>, 'id' | 'worldId'> | Omit<Extract<SessionCommand, { type: 'speed' }>, 'id' | 'worldId'> | Omit<Extract<SessionCommand, { type: 'reset' }>, 'id' | 'worldId'>): Promise<void> {
  if (!frame) return;
  const receipt = await session.send({ ...payload, id: `ui-${++commandId}`, worldId: frame.snapshot.worldId });
  if (!receipt.accepted) el('#notice').textContent = 'The world changed. Please try that control again.';
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
    if (previousWorld !== frame.snapshot.worldId) { scene.resetPresentation(); previousWorld = frame.snapshot.worldId; }
    updateUi();
  });
  const options = { signal: listeners.signal };
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-person]')) button.addEventListener('click', () => select(button.dataset.person as NpcId), options);
  el('#pause').addEventListener('click', () => { void command({ type: 'pause', paused: !frame!.paused }); }, options);
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
