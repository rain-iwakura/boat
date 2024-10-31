import * as v from 'valibot';

import { didString, serviceUrlString } from './strings';

const verificationMethod = v.object({
	id: v.string(),
	type: v.string(),
	controller: v.string(),
	publicKeyMultibase: v.optional(v.string()),
});

const service = v.object({
	id: v.string(),
	type: v.string(),
	serviceEndpoint: v.union([v.string(), v.record(v.string(), v.unknown())]),
});

export const didDocument = v.object({
	id: didString,
	alsoKnownAs: v.optional(v.array(v.pipe(v.string(), v.url())), []),
	verificationMethod: v.optional(v.array(verificationMethod), []),
	service: v.optional(v.array(service), []),
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

	const endpoint = found.serviceEndpoint;
	if (v.is(serviceUrlString, found.serviceEndpoint)) {
		return endpoint;
	}
};
