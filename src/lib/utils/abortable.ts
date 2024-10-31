import { onCleanup } from 'solid-js';

type Abortable = [signal: () => AbortSignal, cleanup: () => void];

export const makeAbortable = (): Abortable => {
	let controller: AbortController | undefined;

	const cleanup = (): void => {
		controller?.abort();
		return (controller = undefined);
	};

	const signal = (): AbortSignal => {
		cleanup();

		controller = new AbortController();
		return controller.signal;
	};

	onCleanup(cleanup);

	return [signal, cleanup];
};
