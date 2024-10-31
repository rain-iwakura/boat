import { ErrorBoundary, Suspense } from 'solid-js';

import { RouterView } from '~/lib/navigation/router';

import ErrorPage from './views/_error';

const Shell = () => {
	return (
		<div class="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col-reverse">
			<div class="z-0 box-content flex min-h-0 grow flex-col overflow-clip bg-white shadow">
				<RouterView
					render={({ def }) => {
						return (
							<ErrorBoundary fallback={(error, reset) => <ErrorPage error={error} reset={reset} />}>
								<Suspense>
									<def.component />
								</Suspense>
							</ErrorBoundary>
						);
					}}
				/>
			</div>
		</div>
	);
};

export default Shell;
