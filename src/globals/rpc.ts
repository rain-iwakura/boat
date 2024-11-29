import { simpleFetchHandler, XRPC } from '@atcute/client';

const APPVIEW_URL = import.meta.env.VITE_APPVIEW_URL;
console.log(import.meta.env);
export const appViewRpc = new XRPC({ handler: simpleFetchHandler({ service: APPVIEW_URL }) });
