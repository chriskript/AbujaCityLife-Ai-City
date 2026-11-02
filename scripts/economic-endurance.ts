import { writeFile } from 'node:fs/promises';
import { createTown } from '../shared/neighbourhood/town.js';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { DecisionScheduler } from '../shared/neighbourhood/scheduler.js';
import { NeighbourhoodMockProvider } from '../shared/neighbourhood/mock-provider.js';
import { assertSnapshot } from '../shared/neighbourhood/snapshot.js';
import type { NpcDecisionProvider, NpcDecisionRequest, Action } from '../shared/neighbourhood/types.js';

// No environment, ledger, credentials, provider adapter or network imports.
// An explicitly labelled procurement fixture exercises capacity, not Muse autonomy.
const offline=new NeighbourhoodMockProvider();
function procurement():NpcDecisionProvider {return {async decide(r:NpcDecisionRequest){
  const o=r.observation;let action:Action|undefined;
  const offer=o.wholesale?.offers.find(f=>f.product==='food-portion');
  if(offer && o.actor.node===offer.node && (o.resources.marketGoods ?? 0)<4 && offer.canOrder && !o.tasks.some(t=>t.requester===r.actorId&&['accepted','collected','proposed'].includes(t.status)))action={type:'order-external',businessId:offer.businessId,quantity:Math.min(6,offer.sourceAvailable ?? 0,offer.balance)};
  if(action)return {mode:'mock',model:'explicit-procurement-stress-fixture',decision:{goalId:o.actor.goals[0]!.id,reason:'OFFLINE TEST FIXTURE: exercise optional paid replenishment; not live Muse reasoning',action}};
  return offline.decide(r);
}};}
function summary(world:Neighbourhood,decisions:number){const s=world.snapshot,jobs=Object.values(s.npcs).flatMap(n=>n.activity.kind==='work'&&n.activity.job?[n.activity.job]:[]);
  return {time:s.time,decisions,residents:Object.keys(s.npcs).length,market:s.resources.marketGoods,supplier:s.resources.supplierGoods,rawInputs:s.town!.rawInputs,produced:s.town!.produced,consumed:s.town!.consumed,
    money:{personal:Object.values(s.npcs).reduce((v,n)=>v+n.inventory.coins!,0),business:Object.values(s.town!.businesses).reduce((v,b)=>v+b.coins,0),heldWages:jobs.reduce((v,j)=>v+j.wage,0),transportEscrow:Object.values(s.tasks).reduce((v,t)=>v+(t.escrow ?? 0),0),externalSpent:s.trade!.spent,initial:s.town!.initialMoney},
    external:{remaining:s.trade!.sourceRemaining,importedFood:s.trade!.importedFood,importedInputs:s.trade!.importedInputs,pending:s.trade!.orders.filter(o=>o.status==='pending').length},
    hungry:Object.values(s.npcs).filter(n=>n.needs.food>=.9).map(n=>n.id),unfundedBusinesses:Object.values(s.town!.businesses).filter(b=>b.coins<b.wage).map(b=>b.id),zeroCashResidents:Object.values(s.npcs).filter(n=>n.inventory.coins===0).map(n=>n.id)};
}
const output=[];
for(const fixture of [false,true]) {
  let world=createTown(`endurance-${fixture?'procurement':'baseline'}`);world.enableSocialVisits();
  let scheduler=new DecisionScheduler(world,fixture?procurement():offline,{cooldownSeconds:20,perMinute:48,maximumDecisions:4096});
  const samples=[];let emptyMarketSeconds=0,firstEmpty:number|null=null;
  for(let i=0;i<3600;i++){
    // One-second samples; scheduler/timing remain deterministic and bounded.
    for(let q=0;q<4;q++){await scheduler.pump();world.advance(.25);if(world.snapshot.resources.marketGoods===0){emptyMarketSeconds+=.25;firstEmpty ??=world.time;}}
    if((i+1)%300===0){assertSnapshot(world.snapshot);samples.push(summary(world,scheduler.decisionCount));}
  }
  const before=world.snapshot;world=Neighbourhood.restore(world.serialize());assertSnapshot(world.snapshot);
  if(JSON.stringify(before.trade)!==JSON.stringify(world.snapshot.trade))throw new Error('Trade changed during recovery');
  output.push({fixture:fixture?'explicit-procurement-stress-fixture':'unchanged-town-offline-policy',simulatedSeconds:3600,maximumDecisions:4096,firstEmpty,emptyMarketSeconds,samples,final:summary(world,scheduler.decisionCount),recoveryVerified:true,interpretation:'Offline deterministic economic evidence only; no claim of Muse decisions or indefinite sustainability.'});
}
await writeFile('docs/economic-endurance-results.json',JSON.stringify({version:1,networkCalls:0,results:output},null,2)+'\n');
console.log(JSON.stringify(output.map(o=>({fixture:o.fixture,emptyMarketSeconds:o.emptyMarketSeconds,final:o.final})),null,2));
