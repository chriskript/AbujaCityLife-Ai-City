import { Neighbourhood } from './world.js';
import { prototypePopulation, townResidents } from './population.js';

export function createTown(id?: string, count: 8 | 16 = prototypePopulation): Neighbourhood {
  const world=new Neighbourhood(id,townResidents(count));
  world.enableTown(townResidents(count));
  return world;
}
