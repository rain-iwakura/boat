import { createEffect, createSignal, JSX, Match, Show, Switch } from 'solid-js';
import { createMutable } from 'solid-js/store';

import { AtpSessionData, CredentialManager, XRPC, XRPCError } from '@atcute/client';
import { At, ComAtprotoIdentityGetRecommendedDidCredentials } from '@atcute/client/lexicons';
import * as CBOR from '@atcute/cbor';

import { Keypair, verifySignature } from '@atproto/crypto';
import * as uint8arrays from 'uint8arrays';

import { getDidDocument } from '~/api/queries/did-doc';
import { resolveHandleViaAppView } from '~/api/queries/handle';
import { getPlcAuditLogs } from '~/api/queries/plc';
import { DidDocument, getPdsEndpoint } from '~/api/types/did-doc';
import { PlcLogEntry } from '~/api/types/plc';
import { DID_OR_HANDLE_RE, isDid } from '~/api/utils/strings';

import { assert } from '~/lib/utils/invariant';

import { PdsData } from './foo.local';

const EMAIL_OTP_RE = /^([a-zA-Z0-9]{5})[- ]?([a-zA-Z0-9]{5})$/;

const PlcUpdatePage = () => {
	const [step, setStep] = createSignal(1);
	const [pending, setPending] = createSignal(false);

	const [error, setError] = createSignal<{ step: number; message: string }>();

	const states = createMutable<{
		didDoc?: DidDocument;
		logs?: Awaited<ReturnType<typeof getPlcKeying>>;

		rotationKeyType?: 'owned' | 'pds';
		ownedRotationKey?: {
			privateKey: Keypair;
			didPublicKey: string;
		};
		pdsData?: {
			service: string;
			session: AtpSessionData;
			recommendedDidDoc: ComAtprotoIdentityGetRecommendedDidCredentials.Output;
		};
		accountHasOtp?: boolean;
	}>({});

	return (
		<fieldset disabled={pending()} class="contents">
			<div class="p-4">
				<h1 class="text-lg font-bold text-purple-800">PLC operation applicator</h1>
				<p class="text-gray-600">Submit operations to your did:plc identity</p>
			</div>
			<hr class="mx-4 border-gray-300" />

			<StepPage
				step={1}
				title="Enter the did:plc identity you want to edit"
				current={step()}
				onSubmit={async (form) => {
					try {
						setPending(true);
						setError();

						const identifier = form.get('ident') as string;
						const rotation = form.get('rotation') as 'owned' | 'pds';

						let did: At.DID;
						if (isDid(identifier)) {
							did = identifier;
						} else {
							did = await resolveHandleViaAppView({ handle: identifier });
						}

						if (!did.startsWith('did:plc:')) {
							setError({ step: 1, message: `"${did}" is not did:plc` });
							return;
						}

						const [didDoc, logs] = await Promise.all([getDidDocument({ did }), getPlcAuditLogs({ did })]);

						states.didDoc = didDoc;
						states.logs = await getPlcKeying(logs);

						states.rotationKeyType = rotation;

						if (rotation === 'owned') {
							states.pdsData = undefined;
						} else if (rotation === 'pds') {
							states.ownedRotationKey = undefined;
						}

						if (states.pdsData) {
							if (states.pdsData.session.did !== did) {
								states.pdsData = undefined;
								states.accountHasOtp = false;
							}
						}

						setStep(2);
					} catch (err) {
						console.error(err);
						setError({ step: 1, message: `Something went wrong: ${err}` });
					} finally {
						setPending(false);
					}
				}}
			>
				<label class="flex flex-col gap-2">
					<span class="font-semibold text-gray-600">Handle or DID identifier</span>
					<input
						ref={(node) => {
							createEffect(() => {
								if (step() === 1) {
									setTimeout(() => node.focus(), 1);
								}
							});
						}}
						type="text"
						name="ident"
						required
						pattern={/* @once */ DID_OR_HANDLE_RE.source}
						placeholder="paul.bsky.social"
						class="rounded border border-gray-400 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-purple-800 focus:ring-1 focus:ring-purple-800 focus:ring-offset-0"
					/>
				</label>

				<fieldset class="mt-6 flex flex-col gap-2">
					<span class="font-semibold text-gray-600">I will be using...</span>

					<label class="flex items-center gap-3">
						<input
							type="radio"
							name="rotation"
							required
							value="pds"
							class="border-gray-400 text-purple-800 focus:ring-purple-800"
						/>
						<span class="text-sm">my PDS' rotation key (requires sign in)</span>
					</label>

					<label class="flex items-center gap-3">
						<input
							type="radio"
							name="rotation"
							required
							value="owned"
							class="border-gray-400 text-purple-800 focus:ring-purple-800"
						/>
						<span class="text-sm">my own rotation key</span>
					</label>
				</fieldset>

				<ErrorMessageView step={1} error={error()} />

				<div hidden={step() !== 1} class="mt-6 flex flex-wrap gap-4">
					<div class="grow"></div>

					<button
						type="submit"
						class="flex h-9 select-none items-center rounded bg-purple-800 px-4 text-sm font-semibold text-white hover:bg-purple-700 active:bg-purple-700"
					>
						Next
					</button>
				</div>
			</StepPage>

			<Switch>
				<Match when={states.rotationKeyType === 'pds'}>
					<StepPage
						step={2}
						title="Sign in to your PDS"
						current={step()}
						onSubmit={async (form) => {
							if (states.pdsData) {
								setStep(3);
								return;
							}

							// if (PdsData) {
							// 	states.pdsData = PdsData as any;
							// 	setStep(3);
							// 	return;
							// }

							assert(states.didDoc);

							try {
								setPending(true);
								setError();

								const service = form.get('service') as string;
								const pass = form.get('pass') as string;
								const otp = form.get('otp') as string | null;

								const manager = new CredentialManager({ service });
								const session = await manager.login({
									identifier: states.didDoc.id,
									password: pass,
									code: otp ? formatEmailOtpCode(otp) : undefined,
								});

								const rpc = new XRPC({ handler: manager });
								const { data: recommendedDidDoc } = await rpc.get(
									'com.atproto.identity.getRecommendedDidCredentials',
									{},
								);

								const data = {
									service,
									session,
									recommendedDidDoc,
								};

								console.log(data);
								states.pdsData = data;
								states.accountHasOtp = false;

								setStep(3);
							} catch (err) {
								let msg: string | undefined;

								if (err instanceof XRPCError) {
									if (err.kind === 'AuthFactorTokenRequired') {
										states.accountHasOtp = true;
										return;
									}

									if (err.message.includes('Token is invalid')) {
										msg = `Invalid one-time confirmation code`;
										states.accountHasOtp = true;
									}
								}

								console.error(err);
								setError({ step: 2, message: msg ?? `Something went wrong: ${err}` });
							} finally {
								setPending(false);
							}
						}}
					>
						<Show when={states.pdsData}>
							{(session) => (
								<p class="break-words">
									Signed in via <b>{session().service}</b>.{' '}
									<button
										type="button"
										onClick={() => (states.pdsData = undefined)}
										class="text-purple-800 hover:underline disabled:pointer-events-none"
									>
										Sign out?
									</button>
								</p>
							)}
						</Show>

						<Show when={!states.pdsData}>
							<label class="flex flex-col gap-2">
								<span class="font-semibold text-gray-600">PDS service</span>
								<input
									type="url"
									name="service"
									required
									value={states.didDoc ? getPdsEndpoint(states.didDoc) : ''}
									placeholder="https://bsky.social"
									class="rounded border border-gray-400 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-purple-800 focus:ring-1 focus:ring-purple-800 focus:ring-offset-0"
								/>
							</label>

							<label class="mt-6 flex flex-col gap-2">
								<span class="font-semibold text-gray-600">Main password</span>
								<input
									ref={(node) => {
										createEffect(() => {
											if (step() === 2) {
												setTimeout(() => node.focus(), 1);
											}
										});
									}}
									type="password"
									name="pass"
									required
									class="rounded border border-gray-400 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-purple-800 focus:ring-1 focus:ring-purple-800 focus:ring-offset-0"
								/>
							</label>

							<Show when={states.accountHasOtp}>
								<label class="mt-6 flex flex-col gap-2">
									<span class="font-semibold text-gray-600">Email one-time confirmation code</span>
									<input
										type="text"
										name="otp"
										required
										autocomplete="one-time-code"
										pattern={/* @once */ EMAIL_OTP_RE.source}
										placeholder="AAAAA-BBBBB"
										class="rounded border border-gray-400 px-3 py-2 font-mono text-sm tracking-wide placeholder:text-gray-400 focus:border-purple-800 focus:ring-1 focus:ring-purple-800 focus:ring-offset-0"
									/>
								</label>
							</Show>

							<p class="mt-2 text-[0.8125rem] leading-5 text-gray-500">
								The app runs locally on your browser, your credentials stays within your device. The app is
								open source and can be audited as necessary.
							</p>
						</Show>

						<ErrorMessageView step={2} error={error()} />

						<div hidden={step() !== 2} class="mt-6 flex flex-wrap gap-4">
							<div class="grow"></div>

							<button
								type="button"
								onClick={() => setStep(1)}
								class="flex h-9 select-none items-center rounded bg-gray-200 px-4 text-sm font-semibold text-black hover:bg-gray-300 active:bg-gray-300"
							>
								Previous
							</button>

							<button
								type="submit"
								class="flex h-9 select-none items-center rounded bg-purple-800 px-4 text-sm font-semibold text-white hover:bg-purple-700 active:bg-purple-700"
							>
								Next
							</button>
						</div>
					</StepPage>
				</Match>

				<Match when={states.rotationKeyType === 'owned'}>
					<StepPage
						step={2}
						title="Enter your private key"
						current={step()}
						onSubmit={() => {
							//
						}}
					>
						<label class="flex flex-col gap-2">
							<span class="font-semibold text-gray-600">Hex-encoded private key</span>
							<input
								ref={(node) => {
									createEffect(() => {
										if (step() === 2) {
											setTimeout(() => node.focus(), 1);
										}
									});
								}}
								type="text"
								name="key"
								required
								placeholder="a5973930f9d348..."
								pattern="[0-9a-f]+"
								class="rounded border border-gray-400 px-3 py-2 font-mono text-sm tracking-wide placeholder:text-gray-400 focus:border-purple-800 focus:ring-1 focus:ring-purple-800 focus:ring-offset-0"
							/>
						</label>
						<p class="mt-2 text-[0.8125rem] leading-5 text-gray-500">
							The app runs locally on your browser, your private key stays within your device. The app is open
							source and can be audited as necessary.
						</p>

						<div hidden={step() !== 2} class="mt-6 flex flex-wrap gap-4">
							<div class="grow"></div>

							<button
								type="button"
								onClick={() => setStep(1)}
								class="flex h-9 select-none items-center rounded bg-gray-200 px-4 text-sm font-semibold text-black hover:bg-gray-300 active:bg-gray-300"
							>
								Previous
							</button>

							<button
								type="submit"
								class="flex h-9 select-none items-center rounded bg-purple-800 px-4 text-sm font-semibold text-white hover:bg-purple-700 active:bg-purple-700"
							>
								Next
							</button>
						</div>
					</StepPage>
				</Match>
			</Switch>

			<StepPage
				step={3}
				title="Select which operation to use as foundation"
				current={step()}
				onSubmit={() => {
					//
				}}
			>
				<label class="mt-6 flex flex-col gap-2">
					<span class="font-semibold text-gray-600">Base operation</span>

					<select
						value=""
						required
						class="rounded border border-gray-400 px-3 py-2 text-sm focus:border-purple-800 focus:ring-1 focus:ring-purple-800 focus:ring-offset-0"
					>
						<option value="">Select an operation...</option>
						{(() => {
							const logs = states.logs;
							if (!logs) {
								return null;
							}

							const rotationKeyType = states.rotationKeyType;

							let ownKey: string | undefined;
							if (rotationKeyType === 'pds') {
								ownKey = states.pdsData?.recommendedDidDoc.rotationKeys?.[0];
							} else if (rotationKeyType === 'owned') {
								ownKey = states.ownedRotationKey?.didPublicKey;
							}

							const length = logs.length;
							const nodes = logs.map((entry, idx) => {
								const signers = getCurrentSignersFromEntry(entry);
								const last = idx === length - 1;

								let enabled = signers.includes(ownKey!);

								// If we're showing older operations for nullification,
								// check if our key has priority against the signer
								if (enabled && !last) {
									const holderKey = logs[idx + 1].signedBy;

									const holderIndex = signers.indexOf(holderKey);
									const ownIndex = signers.indexOf(ownKey!);

									enabled = ownIndex > holderIndex;
								}

								return (
									<option disabled={!enabled} value={/* @once */ entry.cid}>
										{/* @once */ entry.createdAt}
									</option>
								);
							});

							return nodes.reverse();
						})()}
					</select>
				</label>

				<p class="mt-2 text-[0.8125rem] leading-5 text-gray-500">
					Some operations can't be used as a base if the rotation key is insufficient for nullification, or if
					it is not listed.
				</p>

				<div hidden={step() !== 3} class="mt-6 flex flex-wrap gap-4">
					<div class="grow"></div>

					<button
						type="button"
						onClick={() => setStep(2)}
						class="flex h-9 select-none items-center rounded bg-gray-200 px-4 text-sm font-semibold text-black hover:bg-gray-300 active:bg-gray-300"
					>
						Previous
					</button>

					<button
						type="submit"
						class="flex h-9 select-none items-center rounded bg-purple-800 px-4 text-sm font-semibold text-white hover:bg-purple-700 active:bg-purple-700"
					>
						Next
					</button>
				</div>
			</StepPage>

			<StepPage
				step={4}
				title="Enter your payload"
				current={step()}
				onSubmit={() => {
					//
				}}
			>
				<div></div>
			</StepPage>

			<StepPage
				step={5}
				title="Review"
				current={step()}
				onSubmit={() => {
					//
				}}
			>
				<div></div>
			</StepPage>
		</fieldset>
	);
};

export default PlcUpdatePage;

const formatEmailOtpCode = (code: string) => {
	code = code.toUpperCase();

	const match = EMAIL_OTP_RE.exec(code);
	if (match !== null) {
		return `${match[1]}-${match[2]}`;
	}

	return '';
};

const getPlcKeying = async (logs: PlcLogEntry[]) => {
	logs = logs.filter((entry) => !entry.nullified);

	const length = logs.length;
	const promises = logs.map(async (entry, idx) => {
		const operation = entry.operation;
		if (operation.type === 'plc_tombstone') {
			return;
		}

		const date = new Date(entry.createdAt);
		const diff = Date.now() - date.getTime();
		if (idx !== length - 1 && diff / (1000 * 60 * 60) <= 72) {
			return;
		}

		/** keys that potentially signed this operation */
		let signers: string[] | undefined;
		if (operation.prev === null) {
			if (operation.type === 'create') {
				signers = [operation.recoveryKey, operation.signingKey];
			} else if (operation.type === 'plc_operation') {
				signers = operation.rotationKeys;
			}
		} else {
			const prev = logs[idx - 1];
			assert(prev !== undefined, `missing previous entry from ${entry.createdAt}`);
			assert(prev.cid === operation.prev, `prev cid mismatch on ${entry.createdAt}`);

			const prevOp = prev.operation;

			if (prevOp.type === 'create') {
				signers = [prevOp.recoveryKey, prevOp.signingKey];
			} else if (prevOp.type === 'plc_operation') {
				signers = prevOp.rotationKeys;
			}
		}

		assert(signers !== undefined, `no signers found for ${entry.createdAt}`);

		const opBytes = CBOR.encode({ ...operation, sig: undefined });
		const sigBytes = uint8arrays.fromString(operation.sig, 'base64url');

		/** key that signed this operation */
		let signedBy: string | undefined;
		for (const key of signers) {
			const valid = await verifySignature(key, opBytes, sigBytes);
			if (valid) {
				signedBy = key;
				break;
			}
		}

		assert(signedBy !== undefined, `no valid signer for ${entry.createdAt}`);

		return {
			...entry,
			signers,
			signedBy,
		};
	});

	const fulfilled = await Promise.all(promises);
	return fulfilled.filter((entry) => entry !== undefined);
};

const getCurrentSignersFromEntry = (entry: PlcLogEntry): string[] => {
	const operation = entry.operation;

	/** keys that can sign the next operation */
	let nextSigners: string[] | undefined;
	if (operation.type === 'create') {
		nextSigners = [operation.recoveryKey, operation.signingKey];
	} else if (operation.type === 'plc_operation') {
		nextSigners = operation.rotationKeys;
	}

	assert(nextSigners !== undefined, `no signers found for ${entry.createdAt}`);
	return nextSigners;
};

const ErrorMessageView = (props: { step: number; error: { step: number; message: string } | undefined }) => {
	return (
		<Show
			when={(() => {
				const error = props.error;
				if (error && props.step === error.step) {
					return error;
				}
			})()}
		>
			{(error) => <p class="mt-4 text-[0.8125rem] font-medium leading-5 text-red-800">{error().message}</p>}
		</Show>
	);
};

const StepPage = (props: {
	step: number;
	title: string;
	current: number;
	onSubmit: (formData: FormData) => void;
	children: JSX.Element;
}) => {
	const onSubmit = props.onSubmit;

	const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (ev) => {
		ev.preventDefault();

		const formData = new FormData(ev.currentTarget);
		onSubmit(formData);
	};

	return (
		<Show when={props.step <= props.current}>
			<form onSubmit={handleSubmit} class="contents">
				<fieldset disabled={props.step !== props.current} class="flex min-w-0 gap-4 px-4 disabled:opacity-50">
					<div class="flex flex-col items-center gap-1 pt-4">
						<div class="grid h-6 w-6 place-items-center rounded-full bg-gray-200 py-1 text-center text-sm font-medium leading-none text-black">
							{'' + props.step}
						</div>

						<div hidden={!(props.current > props.step)} class="-mb-3 grow border-l border-gray-400"></div>
					</div>

					<div class="min-w-0 grow py-4">
						<h3 class="mb-[1.125rem] mt-0.5 text-sm font-semibold">{props.title}</h3>
						{props.children}
					</div>
				</fieldset>
			</form>
		</Show>
	);
};
