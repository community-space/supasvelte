import { writable, get } from 'svelte/store';


export function makeConstructors(client, config = { log: 'error' }) {
	const logLevels = {
		'silent': 0,
		'error': 1,
		'info': 2,
		'log': 3,
		'verbose': 100
	}
	const logLevel = logLevels[config.log];

	function err(prefix, message) { if (logLevel >= 1) console.error(`[supasvelte] ${prefix} - ${message}`) };
	function info(prefix, message) { if (logLevel >= 2) console.info(`[supasvelte] ${prefix} - ${message}`) };
	function log(prefix, message) { if (logLevel >= 3) console.log(`[supasvelte] ${prefix} - ${message}`) };

	info('constructors', 'initialized')

	function makeSessionStore() {
		const scope = 'session store';

		function probeState() {
			let state, data, error;
			try {
				data = client.auth.session();
			} catch (e) {
				data = error = e;
			}
			state = error ? 'error' : data ? 'signed-in' : 'signed-out';
			return { state, data };
		};

		const store = writable(probeState());
		info(scope, 'initialized');

		client.auth.onAuthStateChange((event, session) => {
			log(scope, `detected ${event} event`);
			const current = probeState();
			store.set(current);
			log(scope, `state set to ${current.state} and data updated`)

		});

		async function signin(email, password) {
			log(scope, `signin for ${email} triggered`);
			store.set({ state: 'pending', data: null });
			log(scope, 'state set to pending');
			const { user, error } = await client.auth.signIn({ email, password });
			if (error) {
				store.set({ state: 'error', data: error });
				err(scope, 'state set to error')
				err(scope, error.message);
			}
			return { user, error }
		};

		async function signout() {
			log(scope, `signout for ${get(store).data.user.email} triggered`);
			store.set({ state: 'pending', data: null });
			log(scope, 'state set to pending');
			const { error } = await client.auth.signOut();
			if (error) {
				store.set({ state: 'error', data: error });
				err(scope, 'state set to error')
				err(scope, error.message);
			}
			return { error }
		};

		async function reset() {
			log(scope, 'reset triggered')
			store.set({ state: 'signed-out', data: null });
			log(scope, 'state set to signed-out and data cleared');
		};

		return {
			subscribe: store.subscribe,
			signin,
			signout,
			reset
		};
	};

	function makeRegistrationStore() {
		const scope = 'registration store';

		const store = writable({ state: 'idle', data: null });
		info(scope, 'initialized');

		async function signup(email, password) {
			log(scope, 'signup triggered');
			store.set({ state: 'pending', data: null });
			log(scope, 'state set to pending');
			const { user, error } = await client.auth.signUp({ email, password });
			if (!error) {
				store.set({ state: 'success', data: user });
				log(scope, 'state set to success and data set with user');
			} else {
				store.set({ state: 'error', data: error });
				err(scope, 'state set to error and data set with error')
				err(scope, error.message);
			}
		};

		async function reset() {
			log(scope, 'reset triggered');
			store.set({ state: 'idle', data: null });
			log(scope, 'state set to idle and data cleared');
		};

		return {
			subscribe: store.subscribe,
			signup,
			reset
		};
	};

	function makeRecordStore(table) {
		const scope = `record store - ${table}`;

		const store = writable({ state: 'idle', data: null });
		info(scope, 'initialized');

		async function checkRecord(record) {
			log(scope, 'checking record')
			const { data, error } = await client.from(table).select().match(record);
			let checkError;
			if (error) {
				checkError = error;
			} else if (data.length === 0) {
				checkError = Error("no record matched the pattern provided")
			} else if (data.length > 1) {
				let checkError = Error("multiple records match the pattern provided, but a unique match is expected")
			}
			return { checkData: data, checkError };
		}

		async function createRecord(record) {
			log(scope, 'create record triggered')
			store.update((s) => {
				return { ...s, state: 'pending' };
			});
			log(scope, 'state set to pending');
			const { data, error } = await client.from(table).insert([record]);
			if (!error) {
				store.set({ state: 'success', data: data[0] });
				log(scope, 'state set to success and data set with record');
			} else {
				store.set({ state: 'error', data: error });
				err(scope, 'state set to error and data set with error')
			}
			return { data: data[0], error }
		}

		async function readRecord(record) {
			log(scope, 'read record triggered')
			store.update((s) => {
				return { ...s, state: 'pending' };
			});
			log(scope, 'state set to pending');
			const { checkData, checkError } = await checkRecord(record);
			if (!checkError) {
				store.set({ state: 'success', data: checkData[0] });
				log(scope, 'state set to success and data set with record');
			} else {
				store.set({ state: 'error', data: checkError });
				err(scope, 'state set to error and data set with error')
			}
			return { data: checkData[0], error: checkError };
		}

		async function updateRecord(record) {
			log(scope, 'update record triggered')
			store.update((s) => {
				return { ...s, state: 'pending' };
			});
			log(scope, 'state set to pending');
			const { checkData, checkError } = await checkRecord(record);
			if (!checkError) {
				const { data, error } = await client.from(table).update(record).match(record);
				if (!error) {
					store.set({ state: 'success', data: data[0] });
					log(scope, 'state set to success and data set with record');
				} else {
					store.set({ state: 'error', data: error });
					err(scope, 'state set to error and data set with error')
				}
				return { data: data[0], error }
			} else {
				store.set({ state: 'error', data: checkError })
				err(scope, 'state set to error and data set with error')
				return { data: checkData[0], error: checkError };
			}
		}

		async function deleteRecord(record) {
			log(scope, 'delete record triggered')
			store.update((s) => {
				return { ...s, state: 'pending' };
			});
			log(scope, 'state set to pending');
			const { checkData, checkError } = await checkRecord(record);
			if (!checkError) {
				const { data, error } = await client.from(table).delete(record).match(record);
				if (!error) {
					store.set({ state: 'success', data: data[0] });
					log(scope, 'state set to success and data set with record');
				} else {
					store.set({ state: 'error', data: error });
					err(scope, 'state set to error and data set with error')
				}
				return { data: data[0], error }
			} else {
				store.set({ state: 'error', data: checkError })
				err(scope, 'state set to error and data set with error')
				return { data: checkData[0], error: checkError };
			}
		};

		return {
			subscribe: store.subscribe,
			create: createRecord,
			read: readRecord,
			update: updateRecord,
			delete: deleteRecord
		};
	}

	function makeQueryStore(table, query, trigger = '*') {
		const scope = `query store - ${table} - ${query}`;

		const store = writable({ state: 'idle', data: [] }, () => {
			return () => {
				client.removeSubscription(sub);
				log(scope, 'Realtime subscription removed')
			};
		});
		info(scope, 'initialized');

		function makeSub(callback, trigger = '*') {
			const sub = client.from(table).on(trigger, callback).subscribe();
			log(scope, 'Realtime subscription created')
			return sub;
		}

		async function fetch() {
			log(scope, 'fetch triggered')
			store.update((s) => {
				return { ...s, state: 'pending' };
			});
			log(scope, 'state set to pending');
			const { data, error } = await client.from(table).select().or(query);
			if (!error) {
				store.set({ state: 'success', data: data });
				log(scope, 'state set to success and data set with results');
			} else {
				store.set({ state: 'error', data: error });
				err(scope, 'state set to error and data set with error')
			}
			return { data, error };
		}

		let sub = makeSub(fetch, trigger);

		fetch();

		return {
			subscribe: store.subscribe,
			fetch
		};
	};

	return {
		makeSessionStore,
		makeRegistrationStore,
		makeRecordStore,
		makeQueryStore
	};
};
