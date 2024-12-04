import * as v from 'valibot';

import { DID_RE, HANDLE_RE } from '../utils/strings';

export const didString = v.pipe(v.string(), v.regex(DID_RE, 'must be a valid did'));
export const handleString = v.pipe(v.string(), v.regex(HANDLE_RE, 'must be a valid handle'));

export const urlString = v.pipe(v.string(), v.url());

export const serviceUrlString = v.pipe(
	v.string(),
	v.check((urlString) => {
		const url = URL.parse(urlString);

		return (
			url !== null &&
			(url.protocol === 'https:' || url.protocol === 'http:') &&
			url.pathname === '/' &&
			url.search === '' &&
			url.hash === ''
		);
	}, 'must be a valid atproto service url'),
);

export const didKeyString = v.pipe(
	v.string(),
	v.regex(/^did:key:z[a-km-zA-HJ-NP-Z1-9]+$/, 'must be a valid did:key'),
);
