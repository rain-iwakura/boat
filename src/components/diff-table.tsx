export interface DiffTableProps {
	fields: { title: string; prev?: string | null; next: string | null }[];
}

const DiffTable = (props: DiffTableProps) => {
	return (
		<div class="grid grid-cols-[min-content_minmax(0,1fr)]">
			{props.fields.map(({ title, prev, next }) => {
				if (prev === undefined) {
					prev = next;
				}

				return (
					<>
						<div class="w-20 py-1 pr-2 align-top font-medium text-gray-600">{`${title}:`}</div>
						<div class="font-mono">
							<div hidden={prev !== next} class="px-2 py-1">
								{next}
							</div>
							<div hidden={prev === next || prev === null} class="bg-red-200 px-2 py-1">
								{prev}
							</div>
							<div hidden={prev === next || next === null} class="bg-green-200 px-2 py-1">
								{next}
							</div>
						</div>
					</>
				);
			})}
		</div>
	);
};

export default DiffTable;
