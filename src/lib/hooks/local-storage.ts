import { createEffect } from 'solid-js';
import { type StoreNode, createMutable, modifyMutable, reconcile } from 'solid-js/store';

import { createEventListener } from './event-listener';

type ProduceFn<T> = (prev: unknown) => T;

/** Useful for knowing whether an effect occured by external writes */
export let isExternalWriting = false;

const parse = <T>(raw: string | null, produce: ProduceFn<T>): T => {
	if (raw !== null) {
		try {
			const persisted = JSON.parse(raw);

			if (persisted != null) {
				return produce(persisted);
			}
		} catch {}
	}

	return produce(null);
};

export const createReactiveLocalStorage = <T extends StoreNode>(name: string, produce: ProduceFn<T>) => {
	const mutable = createMutable<T>(parse(localStorage.getItem(name), produce));

	createEffect((inited) => {
		const json = JSON.stringify(mutable);

		if (inited && !isExternalWriting) {
			localStorage.setItem(name, json);
		}

		return true;
	}, false);

	createEventListener(window, 'storage', (ev) => {
		if (ev.key === name) {
			// Prevent our own effects from running, since this is already persisted.

			try {
				isExternalWriting = true;
				modifyMutable(mutable, reconcile(parse(ev.newValue, produce), { merge: true }));
			} finally {
				isExternalWriting = false;
			}
		}
	});

	return mutable;
};
