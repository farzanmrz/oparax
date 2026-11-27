import { bot } from '../../../lib/domain.mjs';
import { activitySnapshot } from '../../../lib/research-activity.mjs';
import { Fault, failure, read, verifiedUser, withWorkspace } from '../../../lib/store.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const pollMs = 2500;
const heartbeatMs = 12000;
const encoder = new TextEncoder();

export async function GET(req) {
  const deadline = Date.now() + 50000;
  try {
    const { id: owner } = await verifiedUser(req);
    const params = new URL(req.url).searchParams;
    const id = params.get('id') || params.get('agent') || '';
    if (!uuid.test(id)) throw new Fault('Choose a valid research agent.', 400);
    const next = () => withWorkspace(owner, async () => {
      const { data } = await read();
      return activitySnapshot(bot(data, id));
    });
    // Resolve ownership and the first snapshot before committing streaming headers.
    const first = await next();
    let stop;
    const body = new ReadableStream({
      start(controller) {
        let closed = false, previous = '', lastWrite = 0, pollTimer, deadlineTimer;
        const send = (line) => {
          controller.enqueue(encoder.encode(line));
          lastWrite = Date.now();
        };
        const abort = () => stop(true);
        stop = (closeController) => {
          if (closed) return;
          closed = true;
          clearTimeout(pollTimer);
          clearTimeout(deadlineTimer);
          req.signal.removeEventListener('abort', abort);
          if (closeController) controller.close();
        };
        const publish = (snapshot) => {
          if (closed) return;
          const json = JSON.stringify(snapshot);
          if (json !== previous) {
            send('event: snapshot\ndata: ' + json + '\n\n');
            previous = json;
          } else if (Date.now() - lastWrite >= heartbeatMs) {
            send(': heartbeat\n\n');
          }
          if (snapshot.finished) stop(true);
          else pollTimer = setTimeout(poll, pollMs);
        };
        async function poll() {
          try {
            publish(await next());
          } catch {
            // A fresh connection retries authorization and reloads the durable snapshot.
            stop(true);
          }
        }
        req.signal.addEventListener('abort', abort, { once: true });
        if (req.signal.aborted) return stop(true);
        deadlineTimer = setTimeout(abort, Math.max(0, deadline - Date.now()));
        send('retry: 1500\n\n');
        publish(first);
      },
      cancel() { stop(false); }
    });
    return new Response(body, { headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'private, no-store, no-transform',
      'Vary': 'Authorization',
      'X-Accel-Buffering': 'no'
    } });
  } catch (error) {
    const response = failure(error);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
