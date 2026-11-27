import { eveChannel } from 'eve/channels/eve';
import { eveCaller } from '../../lib/eve-bridge.mjs';
export default eveChannel({auth: [async request => await eveCaller(request)],turnPolicy:'queue'});
