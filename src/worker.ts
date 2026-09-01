interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> };
	RESEND_API_KEY?: string;
	TURNSTILE_SECRET_KEY?: string;
}

interface ContactPayload {
	name?: unknown;
	phone?: unknown;
	email?: unknown;
	zip?: unknown;
	service?: unknown;
	message?: unknown;
	company?: unknown;
	turnstileToken?: unknown;
}

const CONTACT_EMAIL = 'info@archi-pools.com';
const SENDER_EMAIL = 'website@notifications.archi-pools.com';
const CANONICAL_HOST = 'archi-pools.com';
const REDIRECT_HOSTS = new Set([
	'www.archi-pools.com',
	'archipools.dontomitasm.workers.dev',
]);
const SERVICES = new Set([
	'Weekly pool service',
	'Pool recovery',
	'Equipment concern',
	'Other',
]);

const json = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
		},
	});

const clean = (value: unknown, maxLength: number) =>
	typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const escapeHtml = (value: string) =>
	value.replace(/[&<>'"]/g, (character) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		"'": '&#39;',
		'"': '&quot;',
	})[character] ?? character);

async function verifyTurnstile(token: string, secret: string, remoteIp?: string) {
	const body = new FormData();
	body.set('secret', secret);
	body.set('response', token);
	if (remoteIp) body.set('remoteip', remoteIp);

	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		body,
	});

	if (!response.ok) return false;
	const result = await response.json() as { success?: boolean };
	return result.success === true;
}

async function handleContact(request: Request, env: Env) {
	if (request.method !== 'POST') {
		return json({ success: false, message: 'Method not allowed.' }, 405);
	}

	const requestUrl = new URL(request.url);
	const origin = request.headers.get('Origin');
	if (origin && origin !== requestUrl.origin) {
		return json({ success: false, message: 'Invalid request origin.' }, 403);
	}

	const contentLength = Number(request.headers.get('Content-Length') || 0);
	if (contentLength > 20_000) {
		return json({ success: false, message: 'Request is too large.' }, 413);
	}

	if (!request.headers.get('Content-Type')?.includes('application/json')) {
		return json({ success: false, message: 'Invalid request format.' }, 415);
	}

	let payload: ContactPayload;
	try {
		const rawBody = await request.text();
		if (rawBody.length > 20_000) {
			return json({ success: false, message: 'Request is too large.' }, 413);
		}
		payload = JSON.parse(rawBody) as ContactPayload;
	} catch {
		return json({ success: false, message: 'Invalid request format.' }, 400);
	}

	if (clean(payload.company, 200)) {
		return json({ success: true });
	}

	const name = clean(payload.name, 100);
	const phone = clean(payload.phone, 30);
	const email = clean(payload.email, 254).toLowerCase();
	const zip = clean(payload.zip, 10);
	const service = clean(payload.service, 80);
	const message = clean(payload.message, 1500);
	const turnstileToken = clean(payload.turnstileToken, 2048);

	if (name.length < 2 || !/^[0-9()+.\-\s]{7,30}$/.test(phone)) {
		return json({ success: false, message: 'Please provide a valid name and phone number.' }, 400);
	}
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ success: false, message: 'Please provide a valid email address.' }, 400);
	}
	if (!/^\d{5}(-\d{4})?$/.test(zip) || !SERVICES.has(service)) {
		return json({ success: false, message: 'Please provide a valid ZIP code and service.' }, 400);
	}
	if (!turnstileToken || !env.TURNSTILE_SECRET_KEY) {
		return json({ success: false, message: 'The security check is unavailable. Please call us instead.' }, 503);
	}
	if (!env.RESEND_API_KEY) {
		return json({ success: false, message: 'Online requests are temporarily unavailable. Please call us instead.' }, 503);
	}

	let isHuman = false;
	try {
		isHuman = await verifyTurnstile(
			turnstileToken,
			env.TURNSTILE_SECRET_KEY,
			request.headers.get('CF-Connecting-IP') || undefined,
		);
	} catch (error) {
		console.error('Turnstile verification failed', error);
		return json({ success: false, message: 'The security check is temporarily unavailable.' }, 503);
	}
	if (!isHuman) {
		return json({ success: false, message: 'Security check failed. Please try again.' }, 400);
	}

	const safe = {
		name: escapeHtml(name),
		phone: escapeHtml(phone),
		email: escapeHtml(email || 'Not provided'),
		zip: escapeHtml(zip),
		service: escapeHtml(service),
		message: escapeHtml(message || 'Not provided').replace(/\n/g, '<br>'),
	};

	try {
		const emailResponse = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				to: [CONTACT_EMAIL],
				from: `Archipools Website <${SENDER_EMAIL}>`,
				reply_to: email || undefined,
				subject: `New pool service request — ${service} — ${zip}`,
				text: [
				'New request from the Archipools website',
				'',
				`Name: ${name}`,
				`Phone: ${phone}`,
				`Email: ${email || 'Not provided'}`,
				`ZIP code: ${zip}`,
				`Service: ${service}`,
				'',
				`Message: ${message || 'Not provided'}`,
				].join('\n'),
				html: `
				<h2>New request from the Archipools website</h2>
				<table cellpadding="6" cellspacing="0" border="0">
					<tr><td><strong>Name</strong></td><td>${safe.name}</td></tr>
					<tr><td><strong>Phone</strong></td><td>${safe.phone}</td></tr>
					<tr><td><strong>Email</strong></td><td>${safe.email}</td></tr>
					<tr><td><strong>ZIP code</strong></td><td>${safe.zip}</td></tr>
					<tr><td><strong>Service</strong></td><td>${safe.service}</td></tr>
				</table>
				<h3>Message</h3>
				<p>${safe.message}</p>
				`,
			}),
		});

		const result = await emailResponse.json() as { id?: string; message?: string };
		if (!emailResponse.ok || !result.id) {
			console.error('Resend rejected contact notification', {
				status: emailResponse.status,
				message: result.message,
			});
			return json({
				success: false,
				message: 'We could not send your request. Please call (945) 382-3896 instead.',
			}, 502);
		}

		console.log('Contact notification sent', { messageId: result.id });
		return json({ success: true });
	} catch (error) {
		console.error('Contact notification failed', error);
		return json({
			success: false,
			message: 'We could not send your request. Please call (945) 382-3896 instead.',
		}, 502);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (REDIRECT_HOSTS.has(url.hostname)) {
			url.hostname = CANONICAL_HOST;
			url.protocol = 'https:';
			return Response.redirect(url.toString(), 308);
		}
		if (url.pathname === '/api/contact') return handleContact(request, env);
		return env.ASSETS.fetch(request);
	},
};
