import * as v from 'valibot';

import { At } from '@atcute/client/lexicons';

import { plcLogEntries } from '../types/plc';

export const getPlcAuditLogs = async ({ did, signal }: { did: At.DID; signal?: AbortSignal }) => {
	const response = await fetch(`https://plc.directory/${did}/log/audit`, { signal });
	if (!response.ok) {
		throw new Error(`got resposne ${response.status}`);
	}

	const json = await response.json();
	return v.parse(plcLogEntries, json);
};
