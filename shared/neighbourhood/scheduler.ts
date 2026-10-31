import { type NpcDecisionProvider } from './types.js';
import { NeighbourhoodMockProvider } from './mock-provider.js';
import { Neighbourhood } from './world.js';

export interface DecisionLimits { cooldownSeconds: number; perMinute: number; maximumDecisions: number }
export class DecisionScheduler {
  private inFlight = false;
  private cursor = 0;
  private readonly recent: number[] = [];
  private readonly lastDecision = new Map<string, number>();
  private count = 0;
  constructor(readonly world: Neighbourhood, private readonly provider: NpcDecisionProvider = new NeighbourhoodMockProvider(),
    private readonly limits: DecisionLimits = { cooldownSeconds: 20, perMinute: 6, maximumDecisions: 24 },private readonly eligible:(id:string)=>boolean=()=>true,private readonly epoch:(id:string)=>number=()=>0) {
    if (!Number.isFinite(limits.cooldownSeconds) || limits.cooldownSeconds < 0 || ![limits.perMinute, limits.maximumDecisions].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid decision limits');
  }
  get decisionCount(): number { return this.count; }
  async pump(): Promise<boolean> {
    if (this.inFlight || this.count >= this.limits.maximumDecisions) return false;
    const time = this.world.time;
    while (this.recent.length && this.recent[0]! <= time - 60) this.recent.shift();
    if (this.recent.length >= this.limits.perMinute) return false;
    const npcIds = this.world.residentIds;
    for (let index = 0; index < npcIds.length; index++) {
      const position = (this.cursor + index) % npcIds.length;
      const id = npcIds[position]!;
      if(!this.eligible(id))continue;
      if (time - (this.lastDecision.get(id) ?? -Infinity) < this.limits.cooldownSeconds) continue;
      const request = this.world.requestDecision(id); if (!request) continue;const epoch=this.epoch(id);
      this.cursor = (position + 1) % npcIds.length;
      this.inFlight = true; this.count++; this.recent.push(time); this.lastDecision.set(id, time);
      try {
        const result = await this.provider.decide(request);
        if(epoch===this.epoch(id) && this.eligible(id))this.world.applyDecision(request.id, result.decision, { mode: result.mode, model: result.model });else this.world.abandonDecision(request.id);
      } catch { this.world.abandonDecision(request.id); }
      finally { this.inFlight = false; }
      return true;
    }
    return false;
  }
}
