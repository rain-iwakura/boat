import { describe, it, expect } from 'bun:test';

import * as v from 'valibot';

import { updatePayload, PlcUpdatePayload } from '../src/api/types/plc.ts';

describe('update payload', () => {
	it('does not allow atproto service endpoints containing paths', () => {
		const payload: PlcUpdatePayload = {
			alsoKnownAs: [],
			rotationKeys: ['did:key:zQ3shhCGUqDKjStzuDxPkTxN6ujddP4RkEKJJouJGRRkaLGbg'],
			verificationMethods: {},
			services: {
				atproto_pds: {
					type: 'AtprotoPersonalDataServer',
					endpoint: 'https://pds.test/hello',
				},
			},
		};

		expect(() => v.assert(updatePayload, payload)).toThrow(/must be a valid atproto service endpoint/);
	});
});
