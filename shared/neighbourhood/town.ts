import { Neighbourhood } from './world.js';
import { prototypePopulation, townResidents } from './population.js';

export function createTown(id?: string, count: 8 | 16 = prototypePopulation, options: {communication?:boolean;map?:'legacy-v1'|'town-v1'} = {}): Neighbourhood {
  const world=new Neighbourhood(id,townResidents(count));
  world.enableTown(townResidents(count));
  if(options.map!=='legacy-v1')world.upgradeTownMap({fresh:true});
  if(options.communication!==false)world.enableCommunications();
  return world;
}
