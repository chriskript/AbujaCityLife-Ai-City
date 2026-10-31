import { defaultResidents } from './initial-state.js';
import { initialPlaceFacts } from './knowledge.js';
import type { Business, Inhabitant } from './types.js';

// Population is seed data, not an executor/scheduler switch or a story sequence.
export const prototypePopulation: 8 | 16 = 16;
export const offlineTownLimits = { cooldownSeconds: 20, perMinute: 48, maximumDecisions: 2048 };
export const skills = ['general','retail','transport','supply','care','repair','teaching','tailoring','utility','food'];
interface Profile {
  id: string; name: string; occupation: string; home: string; node: string; workplace: string; leisure: string;
  skill: string; coins: number; food: number; rest: number; income: number; sociability: number;
  ambition: string; circumstances: string; people: string[];
}
const profiles: Profile[] = [
  { id:'fatima',name:'Fatima',occupation:'Community nurse',home:'centre',node:'centre',workplace:'centre',leisure:'overlook',skill:'care',coins:14,food:.35,rest:.65,income:.3,sociability:.65,ambition:'Keep the neighbourhood care desk dependable without neglecting rest',circumstances:'Lives near the centre and starts tired after a care shift; has savings but needs a meal later.',people:['halima','zainab'] },
  { id:'tunde',name:'Tunde',occupation:'Mechanic and workshop owner',home:'stand',node:'stand',workplace:'stand',leisure:'hill',skill:'repair',coins:22,food:.2,rest:.15,income:.5,sociability:.35,ambition:'Maintain the workshop and build a reliable customer base',circumstances:'Owns a small repair workshop with a finite customer-work budget; knows the taxi driver and Chris.',people:['musa','chris'] },
  { id:'halima',name:'Halima',occupation:'Supply cooperative organiser',home:'centre',node:'centre',workplace:'centre',leisure:'hill',skill:'supply',coins:12,food:.4,rest:.2,income:.55,sociability:.75,ambition:'Keep useful supplies moving while protecting the cooperative budget',circumstances:'Manages the supply desk, with finite raw inputs and a funded production budget; shares the centre with the care desk.',people:['fatima','ibrahim'] },
  { id:'ibrahim',name:'Ibrahim',occupation:'Grower and supply worker',home:'hill',node:'hill',workplace:'centre',leisure:'overlook',skill:'supply',coins:3,food:.55,rest:.25,income:.9,sociability:.45,ambition:'Turn available inputs into stock and earn enough for regular meals',circumstances:'Lives near Hill Garden and has little cash; knows Halima and must travel to the supply desk to take production work.',people:['halima'] },
  { id:'yusuf',name:'Yusuf',occupation:'Tutor',home:'centre',node:'centre',workplace:'centre',leisure:'overlook',skill:'teaching',coins:9,food:.3,rest:.25,income:.6,sociability:.7,ambition:'Make time for teaching and build useful local connections',circumstances:'Rents near the centre and knows about the learning desk; balances paid sessions with personal study.',people:['fatima','grace'] },
  { id:'ngozi',name:'Ngozi',occupation:'Market assistant and cook',home:'market',node:'market',workplace:'market',leisure:'hill',skill:'food',coins:5,food:.6,rest:.15,income:.85,sociability:.8,ambition:'Earn through useful kitchen work and learn how to run a stall',circumstances:'Works with Amina at the market, has limited cash and knows the supplier through past errands.',people:['amina','halima'] },
  { id:'emeka',name:'Emeka',occupation:'Electrical repair worker',home:'stand',node:'stand',workplace:'stand',leisure:'overlook',skill:'utility',coins:13,food:.4,rest:.35,income:.5,sociability:.4,ambition:'Keep a dependable repair service and avoid overcommitting',circumstances:'Shares the stand-side work area with Tunde; has a modest reserve and values finishing accepted work.',people:['tunde','musa'] },
  { id:'grace',name:'Grace',occupation:'Student and occasional helper',home:'hill',node:'hill',workplace:'centre',leisure:'overlook',skill:'general',coins:2,food:.7,rest:.25,income:.9,sociability:.8,ambition:'Cover everyday costs while leaving time for study and new friends',circumstances:'Lives in shared lodging near the garden and has almost no spare money; knows Yusuf but not the market trader.',people:['yusuf'] },
  { id:'ladi',name:'Ladi',occupation:'Walking courier',home:'market',node:'market',workplace:'centre',leisure:'hill',skill:'transport',coins:4,food:.25,rest:.3,income:.85,sociability:.55,ambition:'Find suitable delivery work and develop a record of reliability',circumstances:'Lives near the market and carries supplies on foot; has met Amina but has no automatic claim to her jobs.',people:['amina'] },
  { id:'sadiq',name:'Sadiq',occupation:'Repair apprentice',home:'stand',node:'centre',workplace:'stand',leisure:'hill',skill:'repair',coins:1,food:.5,rest:.2,income:.95,sociability:.6,ambition:'Earn through repair work and become more independent',circumstances:'Stays near the stand, is visiting the centre, and has only one credit; knows Tunde through apprenticeship.',people:['tunde'] },
  { id:'maryam',name:'Maryam',occupation:'Bookkeeper',home:'centre',node:'centre',workplace:'centre',leisure:'overlook',skill:'general',coins:18,food:.2,rest:.45,income:.35,sociability:.45,ambition:'Balance useful community work, savings and personal time',circumstances:'Has a small savings reserve and knows Halima through bookkeeping. There is no leadership role or election attached to this identity.',people:['halima','fatima'] },
  { id:'bisi',name:'Bisi',occupation:'Tailor',home:'market',node:'market',workplace:'market',leisure:'overlook',skill:'tailoring',coins:8,food:.45,rest:.2,income:.65,sociability:.65,ambition:'Build steady tailoring work while keeping time for neighbours',circumstances:'Lives near the market and runs a small tailoring desk with a finite customer-work budget; knows Ngozi from the stalls.',people:['ngozi'] },
];
export function townResidents(count: 8 | 16 = prototypePopulation): Inhabitant[] {
  const additions = profiles.slice(0,count - 4).map((p): Inhabitant => {
    const known = [...new Set([p.home,p.workplace,p.leisure,'market','centre'])];
    return { id:p.id,name:p.name,occupation:p.occupation,node:p.node,home:p.home,mobility:'walk',circumstances:p.circumstances,
      personality:[p.sociability >= .6 ? 'welcomes suitable social opportunities' : 'selective about interruptions','adapts plans to needs and available work'],
      revision:0,intention:null,activity:{kind:'idle'},inventory:{goods:0,rewards:0},
      goals:[{id:'livelihood',description:p.ambition},{id:'personal',description:'Meet personal needs and choose time for rest and neighbours'}],
      needs:{food:p.food,stock:0,income:p.income},priorities:['honour accepted commitments',p.ambition,'keep food and rest manageable'],
      capabilities:['travel','wait','work','buy','share','encounter','respond-encounter',...(p.skill === 'transport' ? ['respond-transport','fulfil-transport'] as const : []),...(p.skill==='food' ? ['collect-self','stock-stall','propose-transport'] as const : [])],
      knowledge:{places:known,placeFacts:initialPlaceFacts(known),people:p.people,transporters:[],blockedEdges:[],tasks:{},resources:{supplierGoods:null,marketGoods:null,salesOpen:null}},
      relationships:Object.fromEntries(p.people.map(id => [id,{successfulJobs:0}])),memories:[] };
  });
  const residents = [...defaultResidents(),...additions], ids = new Set(residents.map(npc => npc.id));
  for (const npc of residents) {
    npc.knowledge.people = npc.knowledge.people.filter(id => ids.has(id));
    npc.relationships = Object.fromEntries(Object.entries(npc.relationships).filter(([id]) => ids.has(id)));
  }
  return residents;
}
const originalPlans: Record<string,{skill:string;coins:number;home:string;workplace:string;leisure:string;sociability:number}> = {
  musa:{skill:'transport',coins:10,home:'stand',workplace:'stand',leisure:'hill',sociability:.35},
  amina:{skill:'retail',coins:24,home:'market',workplace:'market',leisure:'hill',sociability:.65},
  zainab:{skill:'general',coins:6,home:'centre',workplace:'centre',leisure:'overlook',sociability:.8},
  chris:{skill:'repair',coins:4,home:'hill',workplace:'stand',leisure:'market',sociability:.7},
};
export function residentPlan(id: string) {
  return originalPlans[id] ?? profiles.find(profile => profile.id === id) ?? {skill:'general',coins:6,home:'centre',workplace:'centre',leisure:'hill',sociability:.5};
}
export function townBusinesses(ids: readonly string[]): Record<string,Business> {
  const definitions: Business[] = [
    {id:'market',name:'Market stall',node:'market',owner:'amina',staff:['amina','ngozi'],coins:0,skill:'food',wage:1,seconds:60,slots:1,output:0},
    {id:'supply-desk',name:'Supply cooperative',node:'centre',owner:'halima',staff:['halima','ibrahim'],coins:100,skill:'supply',wage:2,seconds:45,slots:2,output:2},
    {id:'repair-workshop',name:'Repair workshop',node:'stand',owner:'tunde',staff:['tunde','chris','sadiq'],coins:60,skill:'repair',wage:2,seconds:60,slots:2,output:0},
    {id:'care-desk',name:'Community care desk',node:'centre',owner:'fatima',staff:['fatima'],coins:40,skill:'care',wage:2,seconds:90,slots:1,output:0},
    {id:'community-errands',name:'Community errands board',node:'centre',owner:'halima',staff:[],coins:80,skill:'general',wage:1,seconds:45,slots:2,output:0},
    {id:'learning-desk',name:'Learning desk',node:'centre',owner:'yusuf',staff:['yusuf'],coins:40,skill:'teaching',wage:2,seconds:90,slots:1,output:0},
    {id:'utility-work',name:'Electrical repair desk',node:'stand',owner:'emeka',staff:['emeka'],coins:40,skill:'utility',wage:2,seconds:75,slots:1,output:0},
    {id:'tailoring-desk',name:'Tailoring desk',node:'market',owner:'bisi',staff:['bisi'],coins:40,skill:'tailoring',wage:2,seconds:75,slots:1,output:0},
  ];
  return Object.fromEntries(definitions.filter(business => ids.includes(business.owner)).map(business => [business.id,{...business,staff:business.staff.filter(id=>ids.includes(id))}]));
}
