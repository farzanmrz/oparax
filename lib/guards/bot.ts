import "server-only";

import { checkBotId } from "botid/server";

export async function checkBot(request: Request) {
  return checkBotId({ advancedOptions: { headers: Object.fromEntries(request.headers) } });
}
