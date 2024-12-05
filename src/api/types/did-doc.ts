import * as v from '@badrap/valita';

import { didString, serviceUrlString, urlString } from './strings';

const PUBLIC_KEY_MULTIBASE_RE = /^z[a-km-zA-HJ-NP-Z1-9]+$/;

const verificationMethod = v.object({
	id: v.string(),
	type: v.string(),
	controller: didString,
	publicKeyMultibase: v
		.string()
		.assert((input) => PUBLIC_KEY_MULTIBASE_RE.test(input), `must be a valid base58btc multibase key`),
});

const service = v
	.object({
		id: v.string(),
		type: v.string(),
		serviceEndpoint: v.union(urlString, v.record(urlString), v.array(urlString)),
	})
	.chain((input) => {
		switch (input.type) {
			case 'AtprotoPersonalDataServer':
			case 'AtprotoLabeler':
			case 'BskyFeedGenerator':
			case 'BskyNotificationService': {
				const result = serviceUrlString.try(input.serviceEndpoint);
				if (!result.ok) {
					return v.err({
						message: `must be a valid atproto service url`,
						path: ['serviceEndpoint'],
					});
				}
			}
		}

		return v.ok(input);
	});

export const didDocument = v.object({
	'@context': v.array(urlString),
	id: didString,
	alsoKnownAs: v.array(urlString).optional(() => []),
	verificationMethod: v.array(verificationMethod).optional(() => []),
	service: v.array(service).chain((input) => {
		for (let i = 0, len = input.length; i < len; i++) {
			const service = input[i];
			const id = service.id;

			for (let j = 0; j < i; j++) {
				if (input[j].id === id) {
					return v.err({
						message: `duplicate service id`,
						path: [i, 'id'],
					});
				}
			}
		}

		return v.ok(input);
	}),
});

export type DidDocument = v.Infer<typeof didDocument>;

export const getPdsEndpoint = (doc: DidDocument): string | undefined => {
	return getServiceEndpoint(doc, '#atproto_pds', 'AtprotoPersonalDataServer');
};

export const getServiceEndpoint = (
	doc: DidDocument,
	serviceId: string,
	serviceType: string,
): string | undefined => {
	const did = doc.id;

	const didServiceId = did + serviceId;
	const found = doc.service?.find((service) => service.id === serviceId || service.id === didServiceId);

	if (!found || found.type !== serviceType || typeof found.serviceEndpoint !== 'string') {
		return undefined;
	}

	return found.serviceEndpoint;
};
