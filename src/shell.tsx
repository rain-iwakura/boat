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
								<Suspense
									fallback={
										<div class="grid grow place-items-center">
											<svg viewBox="0 0 32 32" class="animate-spin" style="height:24px;width:24px">
												<circle
													cx="16"
													cy="16"
													fill="none"
													r="14"
													stroke-width="4"
													class="stroke-purple-600 opacity-20"
												/>
												<circle
													cx="16"
													cy="16"
													fill="none"
													r="14"
													stroke-width="4"
													stroke-dasharray="80px"
													stroke-dashoffset="60px"
													class="stroke-purple-600"
												/>
											</svg>
										</div>
									}
								>
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
