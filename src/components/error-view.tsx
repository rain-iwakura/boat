import { formatQueryError } from '~/api/utils/error';

export interface ErrorViewProps {
	error: unknown;
	onRetry?: () => void;
}

const ErrorView = (props: ErrorViewProps) => {
	const onRetry = props.onRetry;

	return (
		<div class="flex flex-col gap-4 p-4">
			<div>
				<p class="font-bold">Something went wrong</p>
				<p class="text-gray-600">{formatQueryError(props.error)}</p>
			</div>

			<div class="empty:hidden">
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						class="flex h-9 items-center rounded bg-purple-800 px-4 text-sm font-semibold text-white hover:bg-purple-700 active:bg-purple-700"
					>
						Try again
					</button>
				)}
			</div>
		</div>
	);
};

export default ErrorView;
