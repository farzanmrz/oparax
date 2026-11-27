import {defineAgent,defineDynamic} from 'eve';
import {eveModel} from '../lib/eve-bridge.mjs';
export default defineAgent({model:defineDynamic(async ctx=>await eveModel(ctx))});
