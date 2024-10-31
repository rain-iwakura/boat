import { simpleFetchHandler, XRPC } from '@atcute/client';
import { At } from '@atcute/client/lexicons';

import { appViewRpc } from '~/globals/rpc';

export const resolveHandleViaAppView = async ({
	handle,
	signal,
}: {
	handle: string;
	signal?: AbortSignal;
}): Promise<At.DID> => {
	const { data } = await appViewRpc.get('com.atproto.identity.resolveHandle', {
		signal: signal,
		params: { handle: handle },
	});

	return data.did;
};

export const resolveHandleViaPds = async ({
	service,
	handle: handle,
	signal,
}: {
	service: string;
	handle: string;
	signal?: AbortSignal;
}): Promise<At.DID> => {
	const rpc = new XRPC({ handler: simpleFetchHandler({ service }) });

	const { data } = await rpc.get('com.atproto.identity.resolveHandle', {
		signal,
		params: { handle },
	});

	return data.did;
};
