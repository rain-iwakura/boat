import * as v from 'valibot';

import { didString, serviceUrlString, urlString } from './strings';

const verificationMethod = v.object({
	id: v.string(),
	type: v.string(),
	controller: didString,
	publicKeyMultibase: v.optional(
		v.pipe(
			v.string(),
			v.regex(/^z[a-km-zA-HJ-NP-Z1-9]+$|^u[a-zA-Z0-9]+$/, 'must be a valid multibase value'),
		),
	),
});

const service = v.pipe(
	v.object({
		id: v.string(),
		type: v.string(),
		serviceEndpoint: v.union([urlString, v.record(v.string(), urlString), v.array(urlString)]),
	}),
	v.forward(
		v.check((input) => {
			switch (input.type) {
				case 'AtprotoPersonalDataServer':
				case 'AtprotoLabeler':
				case 'BskyFeedGenerator':
				case 'BskyNotificationService':
					return v.is(serviceUrlString, input.serviceEndpoint);
			}

			return true;
		}, 'must be a valid atproto service endpoint'),
		['serviceEndpoint'],
	),
);

export const didDocument = v.object({
	'@context': v.array(urlString),
	id: didString,
	alsoKnownAs: v.optional(v.array(urlString), []),
	verificationMethod: v.optional(v.array(verificationMethod), []),
	service: v.optional(
		v.pipe(
			v.array(service),
			v.rawCheck(({ dataset, addIssue }) => {
				if (dataset.typed) {
					const set = new Set<string>();
					const services = dataset.value;

					for (let idx = 0, len = services.length; idx < len; idx++) {
						const service = services[idx];
						const id = service.id;

						if (!set.has(id)) {
							set.add(id);
						} else {
							addIssue({
								message: `duplicate service id`,
								path: [
									{
										type: 'array',
										origin: 'value',
										input: services,
										key: idx,
										value: service,
									},
									{
										type: 'object',
										origin: 'value',
										input: service,
										key: 'id',
										value: id,
									},
								],
							});
						}
					}
				}
			}),
		),
		[],
	),
});

export type DidDocument = v.InferOutput<typeof didDocument>;

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
