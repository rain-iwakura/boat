import * as v from '@badrap/valita';

import { didKeyString, didString, handleString, serviceUrlString, urlString } from './strings';

const legacyGenesisOp = v.object({
	type: v.literal('create'),
	signingKey: didKeyString,
	recoveryKey: didKeyString,
	handle: handleString,
	service: serviceUrlString,
	prev: v.null(),
	sig: v.string(),
});

const tombstoneOp = v.object({
	type: v.literal('plc_tombstone'),
	prev: v.string(),
	sig: v.string(),
});

const service = v.object({
	type: v.string(),
	endpoint: urlString,
});
export type Service = v.Infer<typeof service>;

const updateOp = v.object({
	type: v.literal('plc_operation'),
	prev: v.string().nullable(),
	sig: v.string(),
	rotationKeys: v.array(didKeyString).chain((input) => {
		if (input.length === 0) {
			return v.err({ message: `missing rotation keys` });
		}

		for (let i = 0, len = input.length; i < len; i++) {
			const key = input[i];

			for (let j = 0; j < i; j++) {
				if (input[j] === key) {
					return v.err({
						message: `duplicate rotation key`,
						path: [i],
					});
				}
			}
		}

		return v.ok(input);
	}),
	verificationMethods: v.record(didKeyString),
	alsoKnownAs: v.array(urlString),
	services: v.record(service),
});
export type PlcUpdateOp = v.Infer<typeof updateOp>;

const plcOperation = v.union(legacyGenesisOp, tombstoneOp, updateOp);

export const plcLogEntry = v.object({
	did: didString,
	cid: v.string(),
	operation: plcOperation,
	nullified: v.boolean(),
	createdAt: v
		.string()
		.assert((input) => !Number.isNaN(new Date(input).getTime()), `must be a valid datetime string`),
});
export type PlcLogEntry = v.Infer<typeof plcLogEntry>;

export const plcLogEntries = v.array(plcLogEntry);

export const updatePayload = updateOp.omit('type', 'prev', 'sig').extend({
	services: v.record(
		service.chain((input) => {
			switch (input.type) {
				case 'AtprotoPersonalDataServer':
				case 'AtprotoLabeler':
				case 'BskyFeedGenerator':
				case 'BskyNotificationService': {
					const endpoint = input.endpoint;
					const result = serviceUrlString.try(endpoint);

					if (!result.ok) {
						return v.err({
							message: `must be a valid atproto service url`,
							path: ['endpoint'],
						});
					}

					const trimmed = endpoint.replace(/\/$/, '');

					if (endpoint !== trimmed) {
						return v.ok({ ...input, endpoint: trimmed });
					}
				}
			}

			return v.ok(input);
		}),
	),
});
export type PlcUpdatePayload = v.Infer<typeof updatePayload>;
