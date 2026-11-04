import { access, open, readFile, unlink } from 'node:fs/promises';
import { initializeProbeBudget } from '../server/controls/probe-budget.js';
import { createHash } from 'node:crypto';
import { Neighbourhood } from '../shared/neighbourhood/world.js';
import { defaultLocalPolicy, durableJson, LocalMusePolicy, validateLocalPolicy, type LocalPolicy } from '../server/controls/local-policy.js';

const path='runtime/muse-policy.json',usagePath='runtime/muse-usage.json';
try {
  const [command,...args]=process.argv.slice(2);
  const flags=Object.fromEntries(args.map(a=>{const m=/^--([\w-]+)=(.+)$/.exec(a);if(!m)throw new Error('Use --name=value options');return [m[1]!,m[2]!];}));
  if(command==='init-meta-ledger') {
    if(args.length)throw new Error('init-meta-ledger takes no options');
    for(const suffix of ['.lock','.pending']){try{await access('runtime/meta-probe-budget.json'+suffix);throw new Error('Existing Meta recovery artifact; initialization refused');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
    await initializeProbeBudget('runtime/meta-probe-budget.json');console.log('Created a new Meta ledger exclusively. Existing ledgers cannot be overwritten. Never use this to replace lost historical consumption.');
  } else if(command==='init') {
    if(args.length)throw new Error('init takes no options');
    await durableJson(path,defaultLocalPolicy,true);
    await durableJson(usagePath,{version:1,reservations:[]},true);
    console.log('Created disabled local policy and empty application usage ledger. Existing Meta ledger is unchanged.');
  } else if(command==='status') {
    const control=new LocalMusePolicy(path,usagePath);const p=await control.read();
    console.log(JSON.stringify({policy:p,allowances:await control.refresh()},null,2));
  } else if(['configure','authorize','authorize-migration','disable'].includes(command??'')) {
    const lock=await open(path+'.lock','wx',0o600);
    try {
      const p=JSON.parse(await readFile(path,'utf8')) as LocalPolicy;validateLocalPolicy(p);
      if(command==='authorize-migration') {
        if(args.length)throw new Error('authorize-migration takes no source path or options; only the canonical legacy operating world is eligible');
        try{await access('runtime/neighbourhood-session.lock');throw new Error('Stop the operating backend before reviewing migration');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
        const text=await readFile('runtime/neighbourhood-session.json','utf8'),saved=JSON.parse(text),world=Neighbourhood.restore(saved.world);
        if(saved.version!==1||saved.operating||!saved.plan||saved.plan.profile||!/^server-[a-f0-9-]+$/.test(world.id))throw new Error('Only a legacy canonical operating server checkpoint with retained plan history can be authorized; evaluation worlds are excluded');
        p.migrationCheckpointHash=createHash('sha256').update(text).digest('hex');
        p.enabled=false;p.authorizedAt=null;p.stoppedReason=null;
        console.log(JSON.stringify({migration:'Exact canonical legacy checkpoint authorized for next startup; rollback copy and plan consumption will be retained',residents:world.residentIds.length,simulationSeconds:world.time,priorRequests:saved.requests,priorPlanRequests:saved.plan.used,priorPlanReservedUsd:saved.plan.reservedUsd}));
      }else if(command==='configure') {
        const names:Record<string,keyof LocalPolicy>={'daily-usd':'dailyUsd','total-usd':'totalUsd','requests':'maximumRequests','tokens':'maximumTokens','input-tokens':'inputTokenLimit','rate':'requestsPerMinute','concurrency':'concurrency','run-requests':'runRequests','run-usd':'runUsd'};
        for(const [key,value]of Object.entries(flags)){if(!names[key])throw new Error('Unknown policy option: '+key);(p as unknown as Record<string,unknown>)[names[key]!]=value==='none'?null:Number(value);}
        p.enabled=false;p.authorizedAt=null;p.stoppedReason=null;
      }else if(command==='authorize') {
        if(Object.keys(flags).some(k=>k!=='until'))throw new Error('authorize accepts only --until=ISO-date');
        p.enabled=true;p.authorizedAt=new Date().toISOString();p.expiresAt=flags.until??null;p.stoppedReason=null;
        if(p.expiresAt&&Date.parse(p.expiresAt)<=Date.now())throw new Error('Authorization expiry must be in the future');
      }else{if(args.length)throw new Error('disable takes no options');p.enabled=false;p.stoppedReason='Disabled by owner';}
      validateLocalPolicy(p);await durableJson(path,p);
      console.log(command==='authorize'?'Owner authorization saved. Existing application and upstream consumption counters remain in force.':'Policy saved; paid inference disabled.');
    }finally{await lock.close();await unlink(path+'.lock');}
  }else throw new Error('Use muse:policy init | init-meta-ledger (new installations only) | status | configure --daily-usd=.25 --total-usd=1 --requests=48 --tokens=500000 --rate=6 [--run-requests=12 --run-usd=.25] | authorize [--until=ISO-date] | authorize-migration | disable');
}catch(error){console.error(error instanceof SyntaxError?'Invalid local policy JSON; preserve files and inspect configuration':(error as Error).message);process.exitCode=1;}
