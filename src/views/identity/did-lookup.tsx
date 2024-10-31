import { Match, Switch } from 'solid-js';
import * as v from 'valibot';

import { At } from '@atcute/client/lexicons';

import { getDidDocument } from '~/api/queries/did-doc';
import { resolveHandleViaAppView } from '~/api/queries/handle';
import { DID_OR_HANDLE_RE, isDid } from '~/api/utils/strings';

import { createQuery } from '~/lib/utils/query';
import { asIdentifier, useSearchParams } from '~/lib/utils/search-params';

import CircularProgressView from '~/components/circular-progress-view';
import ErrorView from '~/components/error-view';
import { serviceUrlString } from '~/api/types/strings';

const DidLookupPage = () => {
	const [params, setParams] = useSearchParams({
		q: asIdentifier,
	});

	const query = createQuery(
		() => params.q,
		async (identifier, signal) => {
			let did: At.DID;
			if (isDid(identifier)) {
				did = identifier;
			} else {
				did = await resolveHandleViaAppView({ handle: identifier, signal });
			}

			const doc = await getDidDocument({ did, signal });

			return doc;
		},
	);

	return (
		<>
			<div class="p-4">
				<h1 class="text-lg font-bold text-purple-800">View identity info</h1>
				<p class="text-gray-600">Look up an account's DID document</p>
			</div>
			<hr class="mx-4 border-gray-200" />

			<form
				onSubmit={(ev) => {
					const formData = new FormData(ev.currentTarget);
					ev.preventDefault();

					const ident = formData.get('ident') as string;
					setParams({ q: ident });
				}}
				class="m-4 flex flex-col gap-4"
			>
				<label class="flex flex-col gap-2">
					<span class="font-semibold text-gray-600">Handle or DID identifier*</span>
					<input
						type="text"
						name="ident"
						required
						pattern={DID_OR_HANDLE_RE.source}
						placeholder="paul.bsky.social"
						value={params.q ?? ''}
						class="rounded border border-gray-300 px-3 py-2 text-sm outline-2 -outline-offset-1 outline-purple-600 placeholder:text-gray-400 focus:outline"
					/>
				</label>

				<div>
					<button
						type="submit"
						class="flex h-9 select-none items-center rounded bg-purple-800 px-4 text-sm font-semibold text-white hover:bg-purple-700 active:bg-purple-700"
					>
						Look up!
					</button>
				</div>
			</form>

			<hr class="mx-4 border-gray-200" />

			<Switch>
				<Match when={query.isPending}>
					<CircularProgressView />
				</Match>

				<Match when={query.isError}>
					<ErrorView error={query.error} onRetry={query.refetch} />
				</Match>

				<Match when={query.data} keyed>
					{(doc) => {
						const isDidPlc = doc.id.startsWith('did:plc:');

						return (
							<>
								<div class="flex flex-col gap-6 break-words p-4 text-gray-900">
									<div>
										<p class="font-semibold text-gray-600">DID identifier</p>
										<span>{doc.id}</span>
									</div>

									<div>
										<p class="font-semibold text-gray-600">Identifies as</p>
										<ol class="list-disc pl-4">
											{doc.alsoKnownAs.map((ident) => (
												<li>{ident}</li>
											))}
										</ol>
									</div>

									<div>
										<p class="font-semibold text-gray-600">Services</p>
										<ol class="list-disc pl-4">
											{doc.service.map(({ id, type, serviceEndpoint }, idx) => {
												const isString = typeof serviceEndpoint === 'string';
												const isURL = isString && URL.canParse('' + serviceEndpoint);
												const isServiceUrl = isString && v.is(serviceUrlString, serviceEndpoint);

												const isPDS = type === 'AtprotoPersonalDataServer';
												const isLabeler = type === 'AtprotoLabeler';

												return (
													<li class={idx !== 0 ? `mt-3` : ``}>
														<p class="font-medium">{id}</p>
														<p class="text-gray-600">{type}</p>

														{isURL ? (
															<a target="_blank" href={serviceEndpoint} class="text-purple-600 underline">
																{serviceEndpoint}
															</a>
														) : isString ? (
															<p class="text-gray-600">{serviceEndpoint}</p>
														) : null}

														<div class="mt-2 flex flex-wrap gap-2 empty:hidden">
															{isPDS && isServiceUrl && (
																<button
																	disabled
																	class="flex h-9 select-none items-center rounded border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
																>
																	View PDS info
																</button>
															)}

															{isPDS && isServiceUrl && (
																<button
																	disabled
																	class="flex h-9 select-none items-center rounded border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
																>
																	Explore account repository
																</button>
															)}

															{isLabeler && isServiceUrl && (
																<button
																	disabled
																	class="flex h-9 select-none items-center rounded border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
																>
																	View emitted labels
																</button>
															)}
														</div>
													</li>
												);
											})}
										</ol>
									</div>

									<div>
										<p class="font-semibold text-gray-600">Verification methods</p>
										<ol class="list-disc pl-4">
											{doc.verificationMethod.map(({ id, type, publicKeyMultibase }, idx) => {
												return (
													<li class={idx !== 0 ? `mt-3` : ``}>
														<p class="font-medium">{id.replace(doc.id, '')}</p>
														<p class="text-gray-600">{type}</p>

														{publicKeyMultibase && (
															<p class="font-mono text-gray-600">{publicKeyMultibase}</p>
														)}
													</li>
												);
											})}
										</ol>
									</div>
								</div>

								<div class="flex flex-wrap gap-4 p-4 pt-2">
									<button
										onClick={() => {
											navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
										}}
										class="flex h-9 select-none items-center rounded border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-100"
									>
										Copy DID document
									</button>

									{isDidPlc && (
										<a
											href={`/plc-oplogs?q=${params.q!}`}
											class="flex h-9 select-none items-center rounded border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-100"
										>
											View PLC operation logs
										</a>
									)}
								</div>
							</>
						);
					}}
				</Match>
			</Switch>
		</>
	);
};

export default DidLookupPage;
