export function assert(condition: any, message?: string): asserts condition {
	if (!condition) {
		if (import.meta.env.DEV) {
			throw new Error(`Assertion failed` + (message ? `: ${message}` : ``));
		} else {
			throw new Error(`Assertion failed`);
		}
	}
}
