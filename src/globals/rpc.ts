import { simpleFetchHandler, XRPC } from '@atcute/client';

const APPVIEW_URL = import.meta.env.VITE_APPVIEW_URL;

export const appViewRpc = new XRPC({ handler: simpleFetchHandler({ service: APPVIEW_URL }) });
