import { createEffect, createSignal } from 'solid-js';

import { createEventListener } from './event-listener';

const enum EventType {
	ENTER,
	OVER,
	LEAVE,
	DROP,
}

export interface CreateDropZoneOptions {
	dataTypes?: string[] | ((types: readonly string[]) => boolean);
	onDrop?: (files: File[] | null, event: DragEvent) => void;
	onEnter?: (files: File[] | null, event: DragEvent) => void;
	onLeave?: (files: File[] | null, event: DragEvent) => void;
	onOver?: (files: File[] | null, event: DragEvent) => void;
	multiple?: boolean;
	preventDefaultForUnhandled?: boolean;
}

export const createDropZone = ({
	dataTypes,
	onDrop,
	onEnter,
	onLeave,
	onOver,
	multiple = true,
	preventDefaultForUnhandled = false,
}: CreateDropZoneOptions = {}) => {
	let counter = 0;
	let isValid = true;

	const [targetEl, setTargetEl] = createSignal<HTMLElement>();
	const [isDropping, setIsDropping] = createSignal(false);

	const getFiles = (event: DragEvent) => {
		const list = Array.from(event.dataTransfer?.files ?? []);
		return list.length === 0 ? null : multiple ? list : [list[0]];
	};

	const checkDataTypes: (types: string[]) => boolean = dataTypes
		? typeof dataTypes === 'function'
			? dataTypes
			: (types) => types.every((type) => dataTypes.includes(type))
		: () => true;

	const checkValidity = (event: DragEvent) => {
		const items = Array.from(event.dataTransfer?.items ?? []);
		const types = items.map((item) => item.type);

		const dataTypesValid = checkDataTypes(types);
		const multipleFilesValid = multiple || items.length <= 1;

		return dataTypesValid && multipleFilesValid;
	};

	const handleDragEvent = (type: EventType, event: DragEvent) => {
		if (counter === 0) {
			isValid = checkValidity(event);
		}

		if (!isValid) {
			if (preventDefaultForUnhandled) {
				event.preventDefault();
			}
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'none';
			}

			return;
		}

		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}

		const currentFiles = getFiles(event);

		if (type === EventType.ENTER) {
			counter += 1;
			if (counter === 1) {
				setIsDropping(true);
			}

			onEnter?.(null, event);
		} else if (type === EventType.OVER) {
			onOver?.(null, event);
		} else if (type === EventType.LEAVE) {
			counter -= 1;
			if (counter === 0) {
				setIsDropping(false);
			}

			onLeave?.(null, event);
		} else if (type === EventType.DROP) {
			counter = 0;
			setIsDropping(false);

			if (isValid) {
				onDrop?.(currentFiles, event);
			}
		}
	};

	createEffect(() => {
		const target = targetEl();
		if (!target) {
			return;
		}

		createEventListener(target, 'dragenter', (event) => handleDragEvent(EventType.ENTER, event));
		createEventListener(target, 'dragover', (event) => handleDragEvent(EventType.OVER, event));
		createEventListener(target, 'dragleave', (event) => handleDragEvent(EventType.LEAVE, event));
		createEventListener(target, 'drop', (event) => handleDragEvent(EventType.DROP, event));
	});

	return { ref: setTargetEl, isDropping };
};
