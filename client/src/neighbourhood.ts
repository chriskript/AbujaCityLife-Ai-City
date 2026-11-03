import './neighbourhood.css';
import { NeighbourhoodScene } from './rendering/scene.js';
import { LocalNeighbourhoodSession } from './simulation/local-neighbourhood-session.js';
import { RemoteNeighbourhoodSession } from './simulation/remote-neighbourhood-session.js';
import { PresentationStore, type NeighbourhoodSession, type NeighbourhoodFrame, type ObservableEvent, type Experiment, type SessionCommand } from '../../shared/neighbourhood/presentation.js';
import type { NpcId } from '../../shared/neighbourhood/types.js';
import { ResidentPhone } from './resident-phone.js';
import { mapFor,buildingFor } from '../../shared/world/town-layout.js';
import { zoneFor, publicSpaces } from '../../shared/world/town-planning.js';
import { cityGate } from './rendering/town-scenery.js';

document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = 'Observe life in Unity Gardens, a fictional residential community in Abuja.';
document.querySelector('#experience')!.innerHTML = `
  <div id="world" aria-label="Living 3D neighbourhood with autonomous residents"></div>
  <div id="building-labels" aria-label="Select a town building"></div>
  <div id="labels" aria-hidden="true"></div><div id="inhabitant-labels" aria-label="Select an inhabitant in the scene"></div>
  <div class="scene-caption"><span class="eyebrow">ABUJA CITY LIFE · AI TOWN</span><h1>Unity Gardens<span class="title-dot">.</span></h1><p>Sixteen neighbours. A shared place to call home.</p></div>
  <nav class="town-navigation" aria-label="Explore Unity Gardens"><button data-panel="residents" aria-controls="residents-panel" aria-expanded="false">Residents <span>16</span></button><button data-panel="places" aria-controls="places-panel" aria-expanded="false">Places</button><button data-panel="activity" aria-controls="activity-panel" aria-expanded="false">Activity</button></nav>
  <section id="residents-panel" class="inhabitant-panel" aria-label="Inhabitants" hidden>
    <div class="panel-title"><h2>Your neighbours</h2><button data-close-panel aria-label="Close residents">×</button></div>
    <label class="sr-only" for="resident-search">Find a resident</label><input id="resident-search" type="search" placeholder="Find a neighbour…" autocomplete="off" />
    <div class="people" role="group" aria-label="Choose an inhabitant">
    </div>
    <div class="person-heading"><span id="person-avatar" class="portrait large amina">A</span><div><h2 id="person-name">Amina</h2><p id="person-role">Market trader</p></div><span class="local-tag">NEIGHBOUR</span></div>
    <div class="activity-line"><span></span><strong id="person-activity" role="status">Starting the day</strong></div>
    <p id="person-intention" class="intention">The neighbourhood is waking up.</p>
    <div class="person-facts"><span id="person-location">Market Square</span><span id="person-goods">No goods carried</span></div><p id="person-wallet" class="intention" hidden></p>
    <p id="person-address" class="intention"></p><div class="resident-tools"><button id="open-phone">Open phone</button><button id="show-home">Show home</button></div>
    <details id="town-buildings" class="conversation"><summary>Town buildings</summary><label for="building-picker">Choose a place</label><select id="building-picker"><option value="">Choose…</option></select><section id="building-inspector" hidden><h3 id="building-name"></h3><p id="building-address" class="intention"></p><div id="building-residents"></div></section><p class="intention">Drag to pan · scroll or pinch to zoom</p><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button></details>
    <div class="recent-heading">RECENTLY OBSERVED</div><ul id="person-recent" class="person-recent"></ul><p id="person-social" class="intention"></p>
    <details id="resident-communications" class="conversation"><summary>Calls &amp; messages <span id="communication-count"></span></summary><p id="resident-contacts" class="intention"></p><p class="intention">Observer history. Residents receive only their own delivered messages. Discussion is separate from a job commitment.</p><ol id="communication-history" class="person-recent"></ol></details>
    <details class="conversation"><summary>Talk to <span id="talk-name">Amina</span> <span id="conversation-mode" class="coming-soon">CONNECTING</span></summary><div id="transcript" aria-live="polite"></div><label for="conversation-input">Message</label><textarea id="conversation-input" maxlength="500" placeholder="Ask about their neighbourhood…"></textarea><button id="send-message">Send message</button><button id="confirm-proposal" hidden>Confirm proposed action</button><p id="conversation-status">Mock replies are labelled fixtures. Actions require separate validation.</p></details>
    <section id="backend-access" hidden><label for="demo-token">Local demo access token</label><input id="demo-token" type="password" autocomplete="off" /><button id="sign-in">Connect to backend</button><p id="connection-status" role="status"></p></section>
    <details class="experiments"><summary>Neighbourhood experiments</summary><button id="town-road">Close supply–market road</button><p id="road-status">Residents learn about closures locally. Occupied roads cannot close.</p><p id="progression-status"></p><label for="experiment">Mock decision policy</label><select id="experiment"><option value="cooperate">Cooperation</option><option value="decline">Driver declines</option><option value="wait">Trader waits</option><option value="self-collect">Trader collects supplies herself</option><option value="reduce-sales">Trader pauses sales</option></select><p>Choose an alternative, then reset. These are labelled mock policies, not guaranteed live AI outcomes.</p></details>
  </section>
  <div class="view-controls" role="group" aria-label="Neighbourhood controls"><button id="overview">Town overview</button><button id="focus" aria-pressed="false">◎ Focus Amina</button><button id="pause" aria-pressed="false">Ⅱ Pause</button></div>
  <div class="compass" aria-hidden="true"><span>↑</span>N</div>
  <section id="activity-panel" class="activity-feed" aria-label="Neighbourhood activity" hidden><div class="panel-title"><h2>Around the gardens</h2><button data-close-panel aria-label="Close activity">×</button></div><div class="feed-heading"><label for="activity-filter">Show</label><select id="activity-filter"><option value="all">All activity</option><option value="selected">Selected resident</option><option value="work">Work &amp; deliveries</option><option value="social">Social &amp; phone</option></select><span id="feed-mode">MOCK</span></div><ol id="activity-feed" aria-live="off"></ol><details id="event-inspection"><summary>Inspect recorded events</summary><pre id="event-details"></pre></details></section>
  <section class="neighbourhood-bar" aria-label="Shared world status"><div><span class="eyebrow">AT THE MARKET</span><strong id="market-stock">1 portion available</strong></div><div><span class="eyebrow">SUPPLY DESK</span><strong id="supplier-stock">8 goods</strong></div><div class="cooperation-status"><span class="eyebrow">NEIGHBOURS HELPING NEIGHBOURS</span><strong id="task-status" role="status">A new day begins</strong></div><div class="clock-controls"><span id="world-clock">00:00</span><label class="sr-only" for="speed">Simulation speed</label><select id="speed"><option value="1">1× time</option><option value="2" selected>2× time</option><option value="4">4× time</option></select><button id="reset">↻ Reset neighbourhood</button></div></section>
  <div id="notice" role="status">Activities use scripted mock decisions. No Meta requests are made.</div>`;

// Reuse the existing inspector as an independent contextual places panel.
const placesPanel=document.createElement('section');placesPanel.id='places-panel';placesPanel.className='places-panel';placesPanel.hidden=true;placesPanel.setAttribute('aria-label','Town places');
placesPanel.innerHTML='<div class="panel-title"><h2>Explore the neighbourhood</h2><button data-close-panel aria-label="Close places">×</button></div><p class="panel-intro">Homes on Acacia Lane and Centre Gardens. Trade at Market Square. Meet at the green or lakeside.</p>';
const inspector=document.querySelector<HTMLDetailsElement>('#town-buildings')!;inspector.open=true;placesPanel.append(inspector);document.querySelector('#experience')!.append(placesPanel);
const debug=new URLSearchParams(location.search).get('debug')==='1';
const access=document.querySelector<HTMLElement>('#backend-access')!;access.className='connection-card';document.querySelector('#experience')!.append(access);
for(const selector of ['.experiments','#event-inspection','#reset'])document.querySelector<HTMLElement>(selector)!.hidden=!debug;
document.body.dataset.debug=String(debug);

const el = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const local = new URLSearchParams(location.search).get('authority') === 'local';
const remote = local ? null : new RemoteNeighbourhoodSession();
const session: NeighbourhoodSession = remote ?? new LocalNeighbourhoodSession();
const phone=new ResidentPhone(session);
let selectedBuilding:string|null=null;let buildingMap='';
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
function openPanel(name:string|null):void {
  for(const id of ['residents','places','activity']) {
    const open=id===name;el(`#${id}-panel`).hidden=!open;
    el(`[data-panel="${id}"]`).setAttribute('aria-expanded',String(open));
  }
}
const names: Record<string,string> = {};
const locations: Record<string, string> = { stand: 'Taxi Stand', centre: 'Community Centre', market: 'Market Square', overlook: 'Lake Overlook', hill: 'Hill Garden', west: 'West road', junction: 'Road junction', bridge: 'Lake junction' };

export function describeObservable(event: ObservableEvent): string {
  const name = event.actor ? names[event.actor] ?? 'Resident' : 'Neighbourhood';
  const descriptions: Record<string, string> = {
    'contact-offered': `${name} shared their own phone contact with ${names[String(event.data.recipient)] ?? 'a neighbour'}.`,
    'communication-sent': `${name} ${event.data.channel==='call'?'called':'texted'} ${names[String(event.data.recipient)] ?? 'a contact'}: ${event.detail}`,
    'text-delivered': `A text from ${name} was delivered; reading and responding remain optional.`,
    'phone-ringing': `${name}'s call is ringing. The recipient decides whether to answer.`,
    'communication-response-chosen': `${name} chose ${event.data.response}: ${event.detail}`,
    'communication-replied': `${name}'s reply arrived: ${event.detail}`,
    'communication-report': `${name} shared an attributed report: ${event.detail}`,
    'communication-closed': event.detail,
    'call-ended': `${name} ended the call.`,
    'remote-task-received': `${name}'s specific transport offer arrived. No commitment yet.`,
    'remote-task-response': event.detail,
    'paid-work-started': `${name} accepted funded work; payment awaits completion.`,
    'paid-work-completed': `${name} completed work, earning ${event.data.wage} demo credits${event.data.quantity ? ` and producing ${event.data.quantity} supplies` : ''}.`,
    'purchase-paid': `${name} paid ${event.data.coins} demo credits for food.`,
    'food-consumed': `${name} ate ${event.data.quantity} portion.`,
    'rest-started': `${name} chose time to rest.`,
    'rest-completed': `${name} finished resting.`,
    'transport-paid': `${name} received ${event.data.coins} demo credits for the completed delivery.`,
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
    'road-changed': `${event.subject}: ${event.detail}.`,
    'road-observed': `${name}: ${event.detail.toLowerCase()} (${event.subject}).`,
    'arrived': `${name} arrived at ${locations[event.subject] ?? event.subject}.`,
    'activity-started': `${name} ${event.subject === 'wait' ? 'is waiting' : 'started a local activity'}.`,
    'activity-completed': `${name} finished an activity.`,
  };
  return descriptions[event.type] ?? `${name}: ${event.detail}`;
}
function timeLabel(time: number): string { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }

function select(id: NpcId): void {
  void phone.close();
  selected = id; focused = true; proposalId = null; el('#confirm-proposal').hidden = true; scene.setFollow(true);openPanel('residents'); updateUi(true); void loadHistory();
}
function selectBuilding(id:string):void {selectedBuilding=id;focused=false;scene.focusBuilding(id.replace('place:',''));openPanel('places');el<HTMLDetailsElement>('#town-buildings').open=true;updateUi(true);}
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
  for(const place of mapFor(view.mapId).places)locations[place.id]=place.name;
  el('#person-address').textContent=actor.homeAddress?`Home: ${actor.homeAddress} · Work: ${actor.workplaceAddress ?? 'Mobile work'}`:'';
  el<HTMLButtonElement>('#open-phone').disabled=!actor.contacts;
  const buildings=mapFor(view.mapId).buildings;
  if(buildingMap!==view.mapId){buildingMap=view.mapId;el<HTMLSelectElement>('#building-picker').replaceChildren(new Option('Choose a destination',''),...publicSpaces.filter(place=>mapFor(view.mapId).nodes.some(node=>node.id===place.id)).map(place=>new Option(place.name,`place:${place.id}`)),...buildings.map(building=>new Option(`${zoneFor(building)} · ${building.name}`,building.id)));selectedBuilding=null;}
  const publicPlace=publicSpaces.find(place=>`place:${place.id}`===selectedBuilding);
  if(view.mapId==='town-v1'){
    const picker=el<HTMLSelectElement>('#building-picker');
    if(!Array.from(picker.options).some(option=>option.value===cityGate.id))picker.add(new Option('Landmark · Abuja City Gate',cityGate.id));
    if(selectedBuilding===cityGate.id){
      el('#building-inspector').hidden=false;el('#building-name').textContent='Abuja City Gate';
      el('#building-address').textContent='Landmark · A miniature tribute beside the western approach to Unity Gardens.';
      el('#building-residents').textContent='Twin swept pylons, a suspended green-and-white Nigeria silhouette and a welcome beam frame a small roadside garden.';
      picker.value=cityGate.id;
    }
  }
  const building=buildings.find(item=>item.id===selectedBuilding);el('#building-inspector').hidden=!building && !publicPlace && selectedBuilding!==cityGate.id;
  if(publicPlace){
    el('#building-name').textContent=publicPlace.name;el('#building-address').textContent=publicPlace.description;el<HTMLSelectElement>('#building-picker').value=`place:${publicPlace.id}`;
    const visitors=view.actors.filter(actor=>actor.node===publicPlace.id && !actor.moving);el('#building-residents').replaceChildren(...visitors.map(actor=>{const button=document.createElement('button');button.textContent=`${actor.name} · ${actor.activity}`;button.addEventListener('click',()=>select(actor.id));return button;}));
    if(!visitors.length)el('#building-residents').textContent='A public place to visit. Nobody is here right now.';
  }
  if(building){
    const assigned=view.actors.filter(person=>person.homeNode && building.units.includes(person.homeNode)).length;
    el('#building-name').textContent=building.name;el('#building-address').textContent=`${zoneFor(building)} · ${building.address}${building.units.length?` · ${building.units.length} homes · ${assigned} occupied · ${building.units.length-assigned} vacant`:''}`;
    el<HTMLSelectElement>('#building-picker').value=building.id;const residents=el('#building-residents');residents.replaceChildren();
    const occupants=view.actors.filter(person=>person.insideBuildingId===building.id || person.homeNode && buildingFor(person.homeNode,view.mapId)?.id===building.id);
    for(const person of occupants){const button=document.createElement('button');button.textContent=`${person.name} · ${person.insideBuildingId===building.id?'indoors':person.homeAddress ?? person.activity}`;button.addEventListener('click',()=>select(person.id));residents.append(button);}
    if(!occupants.length)residents.textContent='No residents currently inside.';
  }
  el('#person-name').textContent = actor.name; el('#person-role').textContent = actor.occupation;
  el('#person-activity').textContent = actor.activity;
  el('#person-intention').textContent = actor.intention ?? 'Choosing an activity from personal priorities.';
  el('#person-location').textContent = actor.moving ? `From ${locations[actor.node] ?? actor.node}` : locations[actor.node] ?? actor.node;
  el('#person-goods').textContent = actor.goods ? `Carrying ${actor.goods} goods` : actor.rewards ? `${actor.rewards} completed job` : 'No goods carried';
  el('#person-wallet').hidden=actor.coins===undefined;
  el('#person-wallet').textContent=actor.coins===undefined ? '' : `${actor.coins} demo credits · ${actor.food ?? 0} food portions carried`;
  el('#person-avatar').className = `portrait large ${selected}`; el('#person-avatar').textContent = actor.name[0]!;
  el('#talk-name').textContent = actor.name;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-person]')) button.setAttribute('aria-pressed', String(button.dataset.person === selected));
  const pause = el<HTMLButtonElement>('#pause'); pause.setAttribute('aria-pressed', String(frame.paused)); pause.textContent = frame.paused ? '▷ Resume' : 'Ⅱ Pause';
  const roadClosed = view.blockedEdges.includes('centre-market');
  el('#town-road').textContent = roadClosed ? 'Reopen supply–market road' : 'Close supply–market road';
  el('#road-status').textContent = roadClosed ? 'Supply–market road closed. Residents can discover it and seek another route.' : 'Supply–market road open. Occupied roads cannot close.';
  el('#progression-status').textContent = frame.progression ? `Server advances without an observer: ${Math.floor(frame.progression.used)} / ${frame.progression.limit} simulated seconds used. Pause stops the clock; restart and reset preserve this allowance.` : '';
  const focus = el<HTMLButtonElement>('#focus'); focus.setAttribute('aria-pressed', String(focused)); focus.textContent = focused ? '◎ Stop following' : `◎ Focus ${actor.name}`;
  el<HTMLSelectElement>('#speed').value = String(frame.speed);
  el('#market-stock').textContent = `${view.resources.marketGoods} ${view.resources.marketGoods === 1 ? 'portion' : 'portions'}${view.resources.salesOpen ? ' available' : ' · sales paused'}`;
  el('#supplier-stock').textContent = `${view.resources.supplierGoods} goods`;
  const task = view.tasks.at(-1);
  const statuses = { proposed: 'Transport requested', accepted: `${names[task?.recipient ?? ''] ?? 'Resident'} agreed to help`, declined: `${names[task?.recipient ?? ''] ?? 'Resident'} declined the request`, collected: 'Supplies on board', delivered: 'Delivery completed', expired: 'Request expired' };
  el('#task-status').textContent = task ? statuses[task.status] : 'Neighbours at work';
  const events = frame.events.filter(event => !['action-validated', 'action-proposed', 'intention-selected'].includes(event.type));
  const filter=el<HTMLSelectElement>('#activity-filter').value;
  const filteredEvents=events.filter(event=>filter==='selected'?event.actor===selected:filter==='work'?/work|transport|delivery|stock|purchase/.test(event.type):filter==='social'?/communication|call|contact|encounter|social|visit|introduced/.test(event.type):true);
  const feed = el('#activity-feed'); feed.replaceChildren();
  for (const event of filteredEvents.slice(-12).reverse()) {
    const item = document.createElement('li'); const timestamp = document.createElement('time');
    timestamp.textContent = timeLabel(event.time); item.append(timestamp, document.createTextNode(describeObservable(event))); feed.append(item);
  }
  if(!feed.children.length){const item=document.createElement('li');item.textContent='No activity in this view yet. Let the day unfold.';feed.append(item);}
  const relevant = events.filter(event => event.actor === selected || view.tasks.some(task => task.id === event.subject && (task.recipient === selected || task.requester === selected)));
  const recent = el('#person-recent'); recent.replaceChildren();
  for (const event of relevant.slice(-2).reverse()) { const item = document.createElement('li'); item.textContent = describeObservable(event); recent.append(item); }
  if (!recent.children.length) { const item = document.createElement('li'); item.textContent = 'Their day is just beginning.'; recent.append(item); }
  const encounter = view.encounters.filter(item => item.initiator === selected || item.recipient === selected).at(-1);
  el('#person-social').textContent = encounter ? `Encounter with ${names[encounter.initiator === selected ? encounter.recipient : encounter.initiator]}: ${encounter.status}. Job commitments are recorded separately.` : 'Nearby encounters are optional.';
  const conversations=(view.communications ?? []).filter(item=>item.initiator===selected || item.recipient===selected).slice(-8);
  el('#resident-communications').hidden=view.communications===undefined;
  el('#communication-count').textContent=String(conversations.length);
  el('#resident-contacts').textContent=`Phone contacts: ${actor.contacts?.map(id=>names[id] ?? id).join(', ') || 'none yet'}`;
  el('#communication-history').replaceChildren(...conversations.map(item=>{
    const line=document.createElement('li');line.textContent=`${timeLabel(item.createdAt)} · ${item.channel==='call'?'Call':'Text'} · ${names[item.initiator]} → ${names[item.recipient]} · ${item.status}: ${item.message}${item.reply ? ` Reply (${item.response}): ${item.reply}` : ''}${item.taskId ? ` Separate task: ${item.taskId} (${view.tasks.find(task=>task.id===item.taskId)?.status ?? 'recorded'}).` : ''}`;return line;
  }));
  el('#event-details').textContent = JSON.stringify({ mode: frame.mode, time: view.time, revision: view.revision, economy:view.economy,tasks: view.tasks, encounters: view.encounters, communications:view.communications,events: frame.events }, null, 2);
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
  if (frame.progression?.stopped) el('#notice').textContent = 'Controlled server advancement limit reached. The town is paused; reset and restart preserve this allowance.';
  else el('#notice').textContent = frame.mode === 'live-meta' ? 'Live Meta decisions. Actions are validated by the authoritative backend.' : local ? 'Local mock test mode. No backend or Meta requests.' : 'Authoritative backend · mock activities and labelled conversation fixtures · no Meta requests.';
}

async function command(payload: Omit<Extract<SessionCommand, { type: 'pause' }>, 'id' | 'worldId'> | Omit<Extract<SessionCommand, { type: 'speed' }>, 'id' | 'worldId'> | Omit<Extract<SessionCommand, { type: 'reset' }>, 'id' | 'worldId'> | Omit<Extract<SessionCommand, { type: 'road' }>, 'id' | 'worldId'>): Promise<void> {
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
  phone.dispose();listeners.abort(); unsubscribe(); session.dispose(); scene?.dispose();
}

try {
  scene = new NeighbourhoodScene(el('#world'), el('#labels'), lost => {
    lostContext = lost; lastTime = 0; session.setVisible(!lost && !document.hidden);
    el('#notice').textContent = lost ? 'Graphics paused. Waiting for the scene to recover…' : 'Activities use scripted mock decisions. No Meta requests are made.';
  });
  scene.enableInhabitants(select,selectBuilding,()=>{focused=false;updateUi(true);});
  unsubscribe = session.subscribe(next => {
    if (!store.accept(next)) return; frame = store.frame!;
    if (previousWorld !== frame.snapshot.worldId) { scene.resetPresentation(); previousWorld = frame.snapshot.worldId; proposalId = null; el('#confirm-proposal').hidden = true; void loadHistory(); }
    updateUi();
  });
  const options = { signal: listeners.signal };
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]'))button.addEventListener('click',()=>openPanel(button.getAttribute('aria-expanded')==='true'?null:button.dataset.panel!),options);
  for(const button of document.querySelectorAll<HTMLButtonElement>('[data-close-panel]'))button.addEventListener('click',()=>{openPanel(null);el<HTMLButtonElement>(`[data-panel="${button.closest('section')!.id.replace('-panel','')}"]`).focus();},options);
  el('#resident-search').addEventListener('input',()=>{const query=el<HTMLInputElement>('#resident-search').value.trim().toLowerCase();for(const button of document.querySelectorAll<HTMLButtonElement>('[data-person]'))button.hidden=!button.textContent!.toLowerCase().includes(query);},options);
  el('#activity-filter').addEventListener('change',()=>updateUi(true),options);
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && !document.querySelector<HTMLDialogElement>('#resident-phone')?.open){const opener=document.querySelector<HTMLButtonElement>('[data-panel][aria-expanded="true"]');openPanel(null);opener?.focus();}},options);
  el('#open-phone').addEventListener('click',()=>{void phone.open(selected);},options);
  el('#show-home').addEventListener('click',()=>{const actor=frame?.snapshot.actors.find(person=>person.id===selected);if(actor?.homeNode && frame){const building=buildingFor(actor.homeNode,frame.snapshot.mapId);if(building)selectBuilding(building.id);}},options);
  el('#building-picker').addEventListener('change',()=>{const id=el<HTMLSelectElement>('#building-picker').value;if(id)selectBuilding(id);},options);
  el('#zoom-in').addEventListener('click',()=>scene.zoom(.8),options);el('#zoom-out').addEventListener('click',()=>scene.zoom(1.25),options);
  remote?.onConnection(state => {
    el('#backend-access').hidden = state === 'ready';
    el('#demo-token').hidden = state !== 'unauthorized'; el('#sign-in').hidden = state !== 'unauthorized';
    el('#connection-status').textContent = state === 'incompatible' ? 'A town update is ready. Restart the backend to load the new layout and migrate your saved town, then reload.' : state === 'unauthorized' ? 'Controlled local demonstration. Use the token from runtime/demo-access.json.' : state === 'offline' ? 'Backend unavailable. Start npm run backend, then reload. The visible snapshot is frozen.' : state === 'connecting' ? 'Connecting to authoritative backend…' : '';
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
  el('#town-road').addEventListener('click', () => { if (frame) void command({ type: 'road', edgeId: 'centre-market', blocked: !frame.snapshot.blockedEdges.includes('centre-market') }); }, options);
  el('#reset').addEventListener('click', () => {
    focused = false; scene.setFollow(false);
    void command({ type: 'reset', experiment: el<HTMLSelectElement>('#experiment').value as Experiment });
  }, options);
  el('#speed').addEventListener('change', () => { void command({ type: 'speed', speed: Number(el<HTMLSelectElement>('#speed').value) as 1 | 2 | 4 }); }, options);
  el('#focus').addEventListener('click', () => { focused = !focused; scene.setFollow(focused); updateUi(true); }, options);
  el('#overview').addEventListener('click',()=>{focused=false;scene.setFollow(false);updateUi(true);},options);
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
