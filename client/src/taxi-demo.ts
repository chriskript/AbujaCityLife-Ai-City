import './style.css';
import { NeighbourhoodScene } from './rendering/scene.js';
import { TaxiJourney } from './simulation/taxi-journey.js';
import { createBrowserProvider } from './providers.js';
import { scenarios } from '../../shared/scenarios/scenarios.js';
import { destinations } from '../../shared/world/neighbourhood.js';
import type { Route } from '../../shared/navigation/routes.js';
import type { InferenceResult, DecisionRequest } from '../../shared/agent/contracts.js';
import type { AgentEvent } from '../../shared/agent/taxi-agent.js';

const element = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const journey = new TaxiJourney(createBrowserProvider('mock'));
const listeners = new AbortController();
const goal = element<HTMLTextAreaElement>('#goal');
const submit = element<HTMLButtonElement>('#submit');
const closeRoad = element<HTMLButtonElement>('#close-road');
const pause = element<HTMLButtonElement>('#pause');
const camera = element<HTMLButtonElement>('#camera');
const notice = element('#notice');
let signature = '';
let following = false;
let disposed = false;
let lostContext = false;
let lastTime = 0;
let frames = 0;
let frameDuration = 0;
let fps = 0;
let scene: NeighbourhoodScene;

function eventDescription(event: AgentEvent): { title: string; detail: string } {
  const data = event.data as Record<string, unknown>;
  switch (event.type) {
    case 'reset': return { title: 'A fresh start', detail: 'Taxi stand · roads open' };
    case 'instruction': return { title: 'Your instruction', detail: String(data.goal) };
    case 'observation': {
      const request = event.data as DecisionRequest;
      return { title: 'World observed', detail: `${request.observation.agentNode} · ${request.observation.routeCandidates.length} route choices · revision ${request.observation.worldRevision}` };
    }
    case 'decision': {
      const result = event.data as InferenceResult;
      const decision = result.decision as { action: string; destinationId: string | null };
      return { title: 'Mock decision', detail: `${decision.action}${decision.destinationId ? ` → ${decision.destinationId}` : ''} · scripted fixture` };
    }
    case 'validation': return { title: data.accepted ? 'Action validated' : 'Action rejected', detail: data.accepted ? 'Checked against the current roads and capabilities.' : String(data.reason) };
    case 'execution-started': return { title: 'Route ready', detail: `${Math.round((data.route as Route).distance)} m · local movement` };
    case 'edge-executed': return { title: 'Road travelled', detail: `${data.from} → ${data.to}` };
    case 'world-change': return { title: 'Road closed', detail: 'Lake shortcut is no longer available.' };
    case 'execution-interrupted': return { title: 'Stopped safely', detail: 'Waiting at the junction for a revised decision.' };
    case 'outcome': return { title: data.status === 'completed' ? 'You have arrived' : 'Journey update', detail: String(data.message ?? data.destinationId ?? data.reason ?? data.status) };
    default: return { title: event.type, detail: '' };
  }
}

function updateUi(force = false): void {
  const agent = journey.agent;
  const key = `${agent.status}:${agent.events.length}:${agent.events.at(-1)?.sequence}:${journey.paused}:${journey.blockedEdges.size}:${journey.occupyingShortcut}`;
  if (!force && key === signature) return;
  signature = key;
  const titles: Record<typeof agent.status, string> = {
    idle: 'Ready when you are', 'awaiting-decision': 'Considering your request…', executing: 'On the way',
    interrupted: 'Road closed · replanning', completed: 'You have arrived', clarification: 'Which destination?',
    unable: 'No route available', rejected: 'Decision could not be validated', failed: 'Journey unavailable',
  };
  element('#status').textContent = journey.paused ? 'Journey paused' : titles[agent.status];
  const observation = agent.observe();
  const destination = destinations.find(item => item.id === observation.selectedDestinationId);
  element('#destination').textContent = destination?.name ?? 'Choose your next stop';
  document.body.dataset.status = agent.status; document.body.dataset.node = agent.node;
  submit.disabled = agent.status === 'awaiting-decision';
  submit.firstChild!.textContent = agent.status === 'awaiting-decision' ? 'Thinking… ' : 'Let’s go ';
  closeRoad.disabled = journey.blockedEdges.has('bridge-overlook') || journey.occupyingShortcut;
  closeRoad.textContent = journey.blockedEdges.has('bridge-overlook') ? '⚑ Shortcut closed' : journey.occupyingShortcut ? 'Taxi on shortcut' : '⚑ Close lake shortcut';
  closeRoad.title = journey.occupyingShortcut ? 'Wait until the taxi leaves this road before closing it.' : 'Block the lake shortcut before the taxi enters it.';
  pause.setAttribute('aria-pressed', String(journey.paused)); pause.textContent = journey.paused ? '▷ Resume' : 'Ⅱ Pause';
  scene.setClosure(journey.blockedEdges.has('bridge-overlook'));
  const lastExecution = [...agent.events].reverse().find(event => event.type === 'execution-started');
  scene.setRoute(agent.status === 'executing' && lastExecution ? (lastExecution.data as { route: Route }).route : null);
  const timeline = element('#timeline'); timeline.replaceChildren();
  for (const event of agent.events) {
    const { title, detail } = eventDescription(event);
    const item = document.createElement('li'); const heading = document.createElement('strong');
    heading.textContent = title; item.append(heading, document.createTextNode(detail));
    if (event.type === 'observation' || event.type === 'decision' || event.type === 'validation') {
      const details = document.createElement('details'); const summary = document.createElement('summary');
      summary.textContent = 'Inspect details'; const code = document.createElement('pre');
      code.textContent = JSON.stringify(event.data, null, 2); details.append(summary, code); item.append(details);
    }
    timeline.append(item);
  }
  timeline.scrollTop = timeline.scrollHeight;
  element('#event-count').textContent = `${agent.events.length} ${agent.events.length === 1 ? 'event' : 'events'}`;
  if (agent.status === 'completed') notice.textContent = `Welcome to ${destination?.name ?? 'your destination'}. Try another journey or reset.`;
  else if (agent.status === 'interrupted' || agent.status === 'awaiting-decision' && journey.blockedEdges.size > 0) notice.textContent = 'The shortcut is closed. Your driver is finding another way.';
  else if (agent.status === 'clarification') notice.textContent = 'Mock mode recognises market or lake requests. Try one of the examples.';
  else if (agent.status === 'executing') notice.textContent = journey.autoClosure ? 'Detour experiment: the lake shortcut will close before the taxi enters it.' : 'Validated route ready. Enjoy the neighbourhood.';
  else if (agent.status === 'idle') notice.textContent = 'Try a lake view, a market trip, or a surprise detour.';
}

async function start(goalText: string, id: string, closure = false): Promise<void> {
  if (!goalText.trim()) { goal.reportValidity(); return; }
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button => button.classList.toggle('active', button.dataset.scenario === id));
  try {
    const pending = journey.start(goalText, id, closure); updateUi(true); await pending;
    if (!disposed) updateUi(true);
  } catch { notice.textContent = 'The journey could not start. Reset and try again.'; }
}

function dispose(): void {
  if (disposed) return;
  disposed = true; listeners.abort(); journey.dispose(); scene.dispose();
}

try {
  scene = new NeighbourhoodScene(element('#world'), element('#labels'), lost => {
    lostContext = lost; lastTime = 0;
    notice.textContent = lost ? 'Graphics paused. Waiting for your browser to restore the scene…' : 'Scene restored. Your journey can continue.';
  });
  const options = { signal: listeners.signal };
  element<HTMLFormElement>('#goal-form').addEventListener('submit', event => { event.preventDefault(); void start(goal.value, 'custom'); }, options);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-scenario]')) {
    button.addEventListener('click', () => {
      const scenario = scenarios.find(item => item.id === button.dataset.scenario)!;
      goal.value = scenario.goal; void start(scenario.goal, scenario.id, scenario.closure);
    }, options);
  }
  element('#reset').addEventListener('click', () => {
    journey.reset(); document.querySelectorAll('[data-scenario]').forEach(button => button.classList.remove('active')); updateUi(true);
  }, options);
  closeRoad.addEventListener('click', () => { journey.closeShortcut(); updateUi(true); }, options);
  pause.addEventListener('click', () => { journey.paused = !journey.paused; updateUi(true); }, options);
  camera.addEventListener('click', () => {
    following = !following; scene.setFollow(following); camera.setAttribute('aria-pressed', String(following));
    camera.textContent = following ? '◎ Neighbourhood' : '◎ Follow taxi';
  }, options);
  document.addEventListener('visibilitychange', () => { lastTime = 0; }, options);
  window.addEventListener('pagehide', event => { if (!(event as PageTransitionEvent).persisted) dispose(); }, options);
  updateUi(true);
  scene.renderer.setAnimationLoop(time => {
    const seconds = lastTime ? (time - lastTime) / 1000 : 0; lastTime = time;
    if (document.hidden || lostContext) return;
    journey.tick(seconds); scene.render(journey.pose, seconds); updateUi();
    if (seconds > 0) { frames++; frameDuration += seconds; }
    if (frameDuration >= 1) {
      fps = Math.round(frames / frameDuration); frames = 0; frameDuration = 0;
      element('#fps').textContent = `${fps} FPS · ${journey.paused ? 'paused' : 'local simulation'}`;
    }
  });
  if (import.meta.env.DEV) {
    Object.defineProperty(window, '__cityLab', { configurable: true, get: () => ({
      status: journey.agent.status, node: journey.agent.node, pose: { ...journey.pose },
      events: structuredClone(journey.agent.events), blockedEdges: [...journey.blockedEdges], fps,
      ...scene.metrics,
    }) });
  }
  import.meta.hot?.dispose(() => { dispose(); delete (window as unknown as Record<string, unknown>).__cityLab; });
} catch {
  const card = document.createElement('div'); card.className = 'error-card';
  const title = document.createElement('h2'); title.textContent = 'Your neighbourhood needs WebGL 2';
  const text = document.createElement('p'); text.textContent = 'Enable hardware acceleration or try a recent Chrome, Edge, Firefox or Safari browser, then reload. You can still run the headless simulation with npm run demo.';
  card.append(title, text); element('#experience').append(card);
}
