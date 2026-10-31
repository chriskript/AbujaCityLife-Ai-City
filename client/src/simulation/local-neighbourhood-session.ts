import { Neighbourhood } from '../../../shared/neighbourhood/world.js';
import { DecisionScheduler } from '../../../shared/neighbourhood/scheduler.js';
import { NeighbourhoodMockProvider } from '../../../shared/neighbourhood/mock-provider.js';
import { createTown } from '../../../shared/neighbourhood/town.js';
import { offlineTownLimits } from '../../../shared/neighbourhood/population.js';
import { PhoneControl,projectPhone,type PhoneControlInput,type PhoneActionInput,type PhoneView,type PhoneLease } from '../../../shared/neighbourhood/phone.js';
import { projectNeighbourhood, type NeighbourhoodSession, type NeighbourhoodFrame, type SessionCommand, type CommandReceipt, type Experiment } from '../../../shared/neighbourhood/presentation.js';

let sessions = 0;
export class LocalNeighbourhoodSession implements NeighbourhoodSession {
  private readonly id = `local-session-${++sessions}`;
  private epoch = 1;
  private world: Neighbourhood;
  private scheduler: DecisionScheduler;
  private sequence = 0;
  private paused = false;
  private visible = true;
  private speed: 1 | 2 | 4 = 2;
  private accumulator = 0;
  private busy = false;
  private disposed = false;
  private readonly listeners = new Set<(frame: NeighbourhoodFrame) => void>();
  private readonly receipts = new Map<string, CommandReceipt>();
  private readonly phoneControl=new PhoneControl();
  private readonly phoneReceipts=new Map<string,{hash:string;value:CommandReceipt}>();
  constructor(private readonly options: { legacy?: boolean;map?:'legacy-v1'|'town-v1' } = {}) {
    this.world=options.legacy ? new Neighbourhood(`${this.id}:world-1`) : createTown(`${this.id}:world-1`,16,{map:options.map ?? 'town-v1'});
    this.scheduler=this.makeScheduler();
  }
  private makeScheduler(provider?:NeighbourhoodMockProvider){return new DecisionScheduler(this.world,provider,this.world.hasTownEconomy?offlineTownLimits:undefined,id=>!this.phoneControl.controlled(this.world.id,id),id=>this.phoneControl.generation(id));}
  async phone(actorId:string):Promise<PhoneView>{if(this.disposed)throw new Error('Session disposed');return projectPhone(this.world,actorId,this.paused,this.phoneControl.status(this.world.id));}
  async controlPhone(input:PhoneControlInput):Promise<PhoneLease|null>{if(this.disposed)throw new Error('Session disposed');const lease=this.phoneControl.change(this.world,input);this.publish();return lease;}
  async phoneAction(input:PhoneActionInput):Promise<CommandReceipt>{
    if(this.disposed || input.worldId!==this.world.id)throw new Error('World changed');const hash=JSON.stringify(input),prior=this.phoneReceipts.get(input.id);
    if(prior){if(prior.hash!==hash)throw new Error('Request identifier collision');return {...prior.value};}
    if(!this.phoneControl.owns(this.world.id,input.actorId,input.leaseId))throw new Error('Phone control expired');
    if(this.phoneReceipts.size>=512)throw new Error('Session interaction limit reached');
    const outcome=this.paused?{accepted:false,reason:'The town is paused'}:this.world.applyPhoneAction(input.actorId,input.action),value={accepted:outcome.accepted,reason:outcome.reason};this.phoneReceipts.set(input.id,{hash,value});this.publish();return value;
  }

  private frame(): NeighbourhoodFrame {
    return { version: 2, sessionId: this.id, sequence: this.sequence, mode: 'mock', paused: this.paused,
      speed: this.speed, conversationAvailable: false, decisionBudget: { used: this.scheduler.decisionCount, limit: this.world.hasTownEconomy ? offlineTownLimits.maximumDecisions : 24 }, ...projectNeighbourhood(this.world.snapshot) };
  }
  private publish(): void {
    if (this.disposed) return;
    this.sequence++; const frame = this.frame();
    for (const listener of this.listeners) listener(structuredClone(frame));
  }
  subscribe(listener: (frame: NeighbourhoodFrame) => void): () => void {
    if (this.disposed) return () => {};
    this.listeners.add(listener); this.publish();
    return () => { this.listeners.delete(listener); };
  }

  async send(command: SessionCommand): Promise<CommandReceipt> {
    if (this.disposed) return { accepted: false, reason: 'session-disposed' };
    const prior = this.receipts.get(command.id); if (prior) return { ...prior };
    if (command.worldId !== this.world.snapshot.id) return { accepted: false, reason: 'stale-world' };
    if (command.type === 'pause' && typeof command.paused === 'boolean') this.paused = command.paused;
    else if (command.type === 'speed' && [1, 2, 4].includes(command.speed)) this.speed = command.speed;
    else if (command.type === 'reset' && ['cooperate', 'decline', 'wait', 'self-collect', 'reduce-sales'].includes(command.experiment)) this.reset(command.experiment);
    else if (command.type === 'road') {
      if (!this.world.setRoadBlocked(command.edgeId,command.blocked)) return { accepted:false,reason:'Road unchanged, invalid or currently occupied' };
    }
    else return { accepted: false, reason: 'unsupported-command' };
    this.accumulator = 0; this.publish();
    const receipt = { accepted: true, reason: 'accepted' };
    this.receipts.set(command.id, receipt);
    if (this.receipts.size > 64) this.receipts.delete(this.receipts.keys().next().value!);
    return { ...receipt };
  }
  private reset(experiment: Experiment): void {
    this.epoch++; this.world = this.options.legacy ? new Neighbourhood(`${this.id}:world-${this.epoch}`) : createTown(`${this.id}:world-${this.epoch}`,16,{map:this.options.map ?? 'town-v1'});
    this.scheduler = this.makeScheduler(new NeighbourhoodMockProvider({ trader: experiment === 'decline' ? 'cooperate' : experiment, driver: experiment === 'decline' ? 'decline' : 'accept' }));
    this.paused = false;
  }
  // One exact core step, also used for browser/headless parity tests.
  async step(): Promise<void> {
    if (this.disposed || this.paused || !this.visible || this.busy) return;
    this.busy = true; const world = this.world; const scheduler = this.scheduler;
    try {
      await scheduler.pump();
      if (this.disposed || this.paused || !this.visible || world !== this.world) return;
      world.advance(0.25); this.publish();
    } finally { this.busy = false; }
  }
  update(realSeconds: number): void {
    if (this.disposed || this.paused || !this.visible || !Number.isFinite(realSeconds) || realSeconds <= 0) return;
    this.accumulator = Math.min(0.5, this.accumulator + Math.min(realSeconds, 0.1) * this.speed);
    if (!this.busy && this.accumulator >= 0.25) { this.accumulator -= 0.25; void this.step(); }
  }
  setVisible(visible: boolean): void { this.visible = visible; this.accumulator = 0; }
  dispose(): void { this.disposed = true; this.epoch++; this.listeners.clear(); this.accumulator = 0; }
}
