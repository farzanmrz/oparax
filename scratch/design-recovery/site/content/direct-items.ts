import { sources, stories, type Source } from './stories';

export type DirectItem = {source:Source; date:string; headline:string; facts:string[]; image?:string; imageAlt?:string; credit?:string};
// Authored single-item card samples matching the writer's shape, not live Qwen outputs.
export const directItems:DirectItem[] = [
  {source:stories[2].sources[0],date:'Oct 23, 2024',headline:'Webb identifies brown dwarf candidates outside the Milky Way',facts:['Webb observations of NGC 602 reveal a population of brown dwarf candidates in the Small Magellanic Cloud.']},
  {source:stories[1].sources[0],date:'Oct 15, 2024',headline:'ESA reveals the first part of Euclid’s cosmic atlas',facts:['ESA has released the first piece of Euclid’s map of the Universe.']},
  {source:stories[1].sources[1],date:'Oct 15, 2024',headline:'Euclid’s first map contains around 100 million stars and galaxies',facts:['NASA reports that the first released portion of Euclid’s atlas contains around 100 million stars and galaxies.']},
  {source:sources[0],date:'Oct 14, 2024',headline:'NASA announces Europa Clipper’s launch',facts:['Europa Clipper launched from Kennedy Space Center on a SpaceX Falcon Heavy at 12:06pm ET.']},
  {source:sources[1],date:'Oct 14, 2024',headline:'Europa Clipper launches toward Jupiter’s ocean moon',facts:['Europa Clipper launched from Kennedy Space Center on a Falcon Heavy.','The mission will investigate Jupiter’s ocean moon Europa.'],image:stories[0].image,imageAlt:'Falcon Heavy carrying Europa Clipper lifts off from Kennedy Space Center',credit:stories[0].imageCredit},
  {source:sources[2],date:'Oct 14, 2024',headline:'Europa Clipper deploys both solar arrays',facts:['Mission controllers confirmed that both solar arrays unfolded after launch.']},
];
