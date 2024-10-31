import * as v from 'valibot';

import { didString, serviceUrlString } from '~/api/types/strings';

const hexColorString = v.pipe(v.string(), v.regex(v.HEX_COLOR_REGEX));

const multiagentAccountData = v.object({
	did: v.pipe(didString, v.readonly()),
	service: serviceUrlString,
	session: v.unknown(),
	scope: v.union([v.literal('full'), v.literal('privileged'), v.literal('limited')]),
	name: v.string(),
	color: hexColorString,
});

const multiagentStorage = v.object({
	active: v.optional(didString),
	accounts: v.array(multiagentAccountData),
});

console.log(multiagentStorage);
