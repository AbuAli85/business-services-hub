/*
  Usage:
  1) In one terminal: npm run start -- -p 3000
  2) In another terminal: node scripts/route-smoke.mjs
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const routes = [
	'/',
	'/about',
	'/contact',
	'/services',
	'/privacy',
	'/terms',
	// Auth routes
	'/auth/sign-in',
	'/auth/sign-up',
	// Dashboard roots (expected redirect when unauthenticated)
	'/dashboard',
	'/dashboard/client',
	'/dashboard/provider',
	// Common sub-pages
	'/dashboard/invoices',
	'/dashboard/services',
];

const expected = new Map([
	['/auth/sign-in', { status: 200 }],
	['/auth/sign-up', { status: 200 }],
	['/dashboard', { status: 307, locationIncludes: '/auth/sign-in' }],
	['/dashboard/client', { status: 307, locationIncludes: '/auth/sign-in' }],
	['/dashboard/provider', { status: 307, locationIncludes: '/auth/sign-in' }],
	['/dashboard/invoices', { status: 307, locationIncludes: '/auth/sign-in' }],
	['/dashboard/services', { status: 307, locationIncludes: '/auth/sign-in' }],
]);

async function waitForServer(url, timeoutMs = 15000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url, { redirect: 'manual' });
			return res.status >= 200 && res.status < 600;
		} catch (e) {
			await new Promise(r => setTimeout(r, 500));
		}
	}
	return false;
}

function format(row) {
	return row.map(String).join('\t');
}

(async () => {
	const ok = await waitForServer(BASE_URL);
	if (!ok) {
		console.error(`Server not reachable at ${BASE_URL}. Start it with: npm run start -- -p 3000`);
		process.exit(1);
	}

	console.log(format(['STATUS', 'ROUTE', 'LOCATION', 'RESULT']));
	for (const r of routes) {
		try {
			const res = await fetch(BASE_URL + r, { redirect: 'manual' });
			const status = res.status;
			const location = res.headers.get('location') || '';
			let result = 'OK';
			const exp = expected.get(r);
			if (exp) {
				if (typeof exp.status === 'number' && status !== exp.status) {
					result = `Unexpected status (expected ${exp.status})`;
				}
				if (exp.locationIncludes && !location.includes(exp.locationIncludes)) {
					result = `Unexpected redirect (expected to include ${exp.locationIncludes})`;
				}
			} else {
				if (status >= 400) result = 'Error status';
			}
			console.log(format([status, r, location, result]));
		} catch (e) {
			console.log(format(['ERR', r, '', e.message]));
		}
	}
})();


