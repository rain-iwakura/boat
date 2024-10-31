import { For } from 'solid-js';
import { createMutable } from 'solid-js/store';
import { assert } from '~/lib/utils/invariant';

interface LogEntry {
	typ: 'log' | 'info' | 'warn' | 'error';
	at: number;
	msg: string;
}

interface PendingLogEntry {
	msg: string;
}

export const createLogger = () => {
	const pending = createMutable<PendingLogEntry[]>([]);

	let backlog: LogEntry[] | undefined = [];
	let push = (entry: LogEntry) => {
		backlog!.push(entry);
	};

	return {
		internal: {
			get pending() {
				return pending;
			},
			attach(fn: (entry: LogEntry) => void) {
				if (backlog !== undefined) {
					for (let idx = 0, len = backlog.length; idx < len; idx++) {
						fn(backlog[idx]);
					}

					backlog = undefined;
				}

				push = fn;
			},
		},
		log(msg: string) {
			push({ typ: 'log', at: Date.now(), msg });
		},
		info(msg: string) {
			push({ typ: 'info', at: Date.now(), msg });
		},
		warn(msg: string) {
			push({ typ: 'warn', at: Date.now(), msg });
		},
		error(msg: string) {
			push({ typ: 'error', at: Date.now(), msg });
		},
		progress(initialMsg: string, throttleMs = 500) {
			pending.unshift({ msg: initialMsg });

			let entry: PendingLogEntry | undefined = pending[0];

			return {
				update: throttle((msg: string) => {
					if (entry !== undefined) {
						entry.msg = msg;
					}
				}, throttleMs),
				destroy() {
					if (entry !== undefined) {
						const index = pending.indexOf(entry);

						pending.splice(index, 1);
						entry = undefined;
					}
				},
				[Symbol.dispose]() {
					this.destroy();
				},
			};
		},
	};
};

export interface LoggerProps {
	logger: ReturnType<typeof createLogger>;
}

const Logger = ({ logger }: LoggerProps) => {
	const formatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short', hour12: false });

	return (
		<ul class="flex flex-col py-3 font-mono text-xs empty:hidden">
			<For each={logger.internal.pending}>
				{(entry) => (
					<li class="flex gap-2 whitespace-pre-wrap px-4 py-1">
						<span class="shrink-0 whitespace-pre-wrap font-medium text-gray-400">-----</span>
						<span class="break-words">{entry.msg}</span>
					</li>
				)}
			</For>

			<div
				ref={(node) => {
					logger.internal.attach(({ typ, at, msg }) => {
						let ecn = `flex gap-2 whitespace-pre-wrap px-4 py-1`;
						let tcn = `shrink-0 whitespace-pre-wrap font-medium`;
						if (typ === 'log') {
							tcn += ` text-gray-500`;
						} else if (typ === 'info') {
							ecn += ` bg-blue-200 text-blue-800`;
							tcn += ` text-blue-500`;
						} else if (typ === 'warn') {
							ecn += ` bg-amber-200 text-amber-800`;
							tcn += ` text-amber-500`;
						} else if (typ === 'error') {
							ecn += ` bg-red-200 text-red-800`;
							tcn += ` text-red-500`;
						}

						const item = (
							<li class={ecn}>
								<span class={tcn}>{/* @once */ formatter.format(at)}</span>
								<span class="break-words">{msg}</span>
							</li>
						);

						assert(item instanceof Node);
						node.after(item);
					});
				}}
			></div>
		</ul>
	);
};

export default Logger;

const throttle = <T extends (...args: any[]) => void>(func: T, wait: number) => {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	let lastArgs: Parameters<T> | null = null;
	let lastCallTime = 0;

	const invoke = () => {
		func(...lastArgs!);
		lastCallTime = Date.now();
		timeout = null;
	};

	return (...args: Parameters<T>) => {
		const now = Date.now();
		const timeSinceLastCall = now - lastCallTime;

		lastArgs = args;

		if (timeSinceLastCall >= wait) {
			if (timeout !== null) {
				clearTimeout(timeout);
			}

			invoke();
		} else if (timeout === null) {
			timeout = setTimeout(invoke, wait - timeSinceLastCall);
		}
	};
};
