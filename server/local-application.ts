import { open, readdir, unlink, access } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { NeighbourhoodServerSession } from './session.js';
import { createNeighbourhoodHttp } from './http.js';
import { SelectiveNeighbourhoodProvider } from './inference/selective-provider.js';
import { townResidents } from '../shared/neighbourhood/population.js';
import type { NeighbourhoodProvider } from './inference/neighbourhood-provider.js';
import type { LocalMusePolicy } from './controls/local-policy.js';

// Same server, world, scheduler and authentication as normal mock operation.
export async function startLocalApplication(options:{checkpoint:string;provider:NeighbourhoodProvider;policy:LocalMusePolicy;accessToken:string;port:number;dist?:string;tick?:boolean}) {
  // Match the original backend's ownership lock, including during migration.
  const lockPath=options.checkpoint.replace(/\.json$/,'')+'.lock';
  let lock;
  try{lock=await open(lockPath,'wx',0o600);}catch{throw new Error('Society lock exists or is inaccessible: '+lockPath+'. Inspect its owner; never delete an active lock.');}
  let session:NeighbourhoodServerSession|undefined;
  let http:ReturnType<typeof createNeighbourhoodHttp>|undefined;
  try{
    await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));await lock.sync();
    const files=await readdir(dirname(options.checkpoint)),name=basename(options.checkpoint);
    if(files.some(f=>f.startsWith(name+'.')&&f.endsWith('.pending')))throw new Error('Unresolved checkpoint transaction; inspect recovery files');
    try{await access(options.checkpoint);}catch(error){
      if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
      if(files.some(f=>f.startsWith(name+'.')))throw new Error('Operating checkpoint missing with historical recovery files; restore it before startup');
    }
    session=await NeighbourhoodServerSession.open({checkpoint:options.checkpoint,provider:new SelectiveNeighbourhoodProvider(townResidents(16).map(r=>r.id),options.policy.wrap(options.provider,(await options.policy.read()).inputTokenLimit),undefined,true),operating:options.policy,townPopulation:16});
    http=createNeighbourhoodHttp(session,options.accessToken,{...(options.dist?{dist:options.dist}:{}),...(options.tick===undefined?{}:{tick:options.tick})});
    await new Promise<void>((resolve,reject)=>{http!.server.once('error',reject);http!.server.listen(options.port,'127.0.0.1',()=>{http!.server.off('error',reject);resolve();});});
    const port=(http.server.address() as {port:number}).port;
    let closing:Promise<void>|undefined;
    return {session,http,port,close:()=>closing??=(async()=>{await http!.close();await lock.close();await unlink(lockPath);})()};
  }catch(error){await http?.close();await session?.close();await lock.close();await unlink(lockPath);throw error;}
}
