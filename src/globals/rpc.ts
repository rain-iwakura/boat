import { simpleFetchHandler, XRPC } from '@atcute/client';

export const APPVIEW_URL = 'https://public.api.bsky.app';

export const appViewRpc = new XRPC({ handler: simpleFetchHandler({ service: APPVIEW_URL }) });
