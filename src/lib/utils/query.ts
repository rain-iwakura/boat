import { createRenderEffect, createSignal } from 'solid-js';

import { makeAbortable } from './abortable';
import { dequal } from './dequal';

export interface SuccessQueryReturn<R> {
	data: R;
	error: undefined;
	isSuccess: true;
	isError: false;
	isPending: false;
	isIdle: false;
	refetch(): void;
}
export interface ErrorQueryReturn {
	data: undefined;
	error: unknown;
	isSuccess: false;
	isError: true;
	isPending: false;
	isIdle: false;
	refetch(): void;
}
export interface PendingQueryReturn {
	data: undefined;
	error: undefined;
	isSuccess: false;
	isError: false;
	isPending: true;
	isIdle: false;
	refetch(): void;
}
export interface IdleQueryReturn {
	data: undefined;
	error: undefined;
	isSuccess: false;
	isError: false;
	isPending: false;
	isIdle: true;
	refetch(): void;
}

export type QueryReturn<R> = SuccessQueryReturn<R> | ErrorQueryReturn | PendingQueryReturn;

const enum QueryState {
	IDLE,
	PENDING,
	SUCCESS,
	ERROR,
}

const UNSET_QUERY_KEY = Symbol();

export const createQuery = <K, R>(
	keyFn: () => K | null | undefined,
	queryFn: (key: K, signal: AbortSignal) => Promise<R>,
): QueryReturn<R> => {
	let currKey: any = UNSET_QUERY_KEY;

	const [getSignal, cleanup] = makeAbortable();
	const [state, setState] = createSignal<{ s: QueryState; d?: any; e?: any }>(
		{ s: QueryState.IDLE },
		{ equals: (prev, next) => prev.s === next.s },
	);

	const refetch = (force: boolean) => {
		const nextKey = keyFn();
		const prevKey = currKey;
		currKey = nextKey;

		if (nextKey == null) {
			cleanup();
			setState({ s: QueryState.IDLE });
		} else if (force || !dequal(nextKey, prevKey)) {
			setState({ s: QueryState.PENDING });

			const signal = getSignal();

			new Promise((resolve) => resolve(queryFn(nextKey, signal))).then(
				(data) => {
					if (signal.aborted) {
						return;
					}

					setState({ s: QueryState.SUCCESS, d: data });
				},
				(err) => {
					if (signal.aborted) {
						return;
					}

					setState({ s: QueryState.ERROR, e: err });
				},
			);
		}
	};

	createRenderEffect(() => refetch(false));

	return {
		get data() {
			const $state = state();
			if ($state.s === QueryState.SUCCESS) {
				return $state.d;
			}
		},
		get error() {
			const $state = state();
			if ($state.s === QueryState.ERROR) {
				return $state.e;
			}
		},
		get isSuccess() {
			return state().s === QueryState.SUCCESS;
		},
		get isError() {
			return state().s === QueryState.ERROR;
		},
		get isPending() {
			return state().s === QueryState.PENDING;
		},
		get isIdle() {
			return state().s === QueryState.IDLE;
		},
		refetch() {
			refetch(true);
		},
	} as any;
};
