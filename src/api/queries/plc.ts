import { At } from '@atcute/client/lexicons';

import { plcLogEntries } from '../types/plc';

export const getPlcAuditLogs = async ({ did, signal }: { did: At.DID; signal?: AbortSignal }) => {
	const origin = import.meta.env.VITE_PLC_DIRECTORY_URL;
	const response = await fetch(`${origin}/${did}/log/audit`, { signal });
	if (!response.ok) {
		throw new Error(`got resposne ${response.status}`);
	}

	const json = await response.json();
	return plcLogEntries.parse(json);
};
