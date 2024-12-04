import * as v from 'valibot';

import { didKeyString, didString, handleString, serviceUrlString } from './strings';

export const legacyGenesisOp = v.object({
	type: v.literal('create'),
	signingKey: didKeyString,
	recoveryKey: didKeyString,
	handle: handleString,
	service: serviceUrlString,
	prev: v.null(),
	sig: v.string(),
});
export type PlcLegacyGenesisOp = v.InferOutput<typeof legacyGenesisOp>;

export const tombstoneOp = v.object({
	type: v.literal('plc_tombstone'),
	prev: v.string(),
	sig: v.string(),
});
export type PlcTombstoneOp = v.InferOutput<typeof tombstoneOp>;

export const service = v.object({
	type: v.string(),
	endpoint: v.pipe(v.string(), v.url()),
});
export type Service = v.InferOutput<typeof service>;

const updateOp = v.object({
	type: v.literal('plc_operation'),
	prev: v.nullable(v.string()),
	sig: v.string(),
	rotationKeys: v.pipe(
		v.array(didKeyString),
		v.minLength(1),
		v.check((v) => new Set(v).size === v.length, `must contain unique keys`),
	),
	verificationMethods: v.record(v.string(), didKeyString),
	alsoKnownAs: v.array(v.pipe(v.string(), v.url())),
	services: v.record(
		v.string(),
		v.object({
			type: v.string(),
			endpoint: v.pipe(v.string(), v.url()),
		}),
	),
});
export type PlcUpdateOp = v.InferOutput<typeof updateOp>;

export const plcOperation = v.union([legacyGenesisOp, tombstoneOp, updateOp]);
export type PlcOperation = v.InferOutput<typeof plcOperation>;

export const plcLogEntry = v.object({
	did: didString,
	cid: v.string(),
	operation: plcOperation,
	nullified: v.boolean(),
	createdAt: v.pipe(
		v.string(),
		v.check((dateString) => {
			const date = new Date(dateString);
			return !Number.isNaN(date.getTime());
		}),
	),
});
export type PlcLogEntry = v.InferOutput<typeof plcLogEntry>;

export const plcLogEntries = v.array(plcLogEntry);

export const updatePayload = v.object({
	...v.omit(updateOp, ['type', 'prev', 'sig', 'services']).entries,
	services: v.record(
		v.string(),
		v.variant('type', [
			v.object({
				type: v.union([
					v.literal('AtprotoPersonalDataServer'),
					v.literal('AtprotoLabeler'),
					v.literal('BskyFeedGenerator'),
					v.literal('BskyNotificationService'),
				]),
				endpoint: v.pipe(
					serviceUrlString,
					v.transform((urlString) => urlString.replace(/\/$/, '')),
				),
			}),
			v.object({
				type: v.string(),
				endpoint: v.pipe(v.string(), v.url()),
			}),
		]),
	),
});
export type PlcUpdatePayload = v.InferOutput<typeof updatePayload>;
