const form = document.querySelector('[data-contact-form]');

if (form) {
	const status = form.querySelector('[data-form-status]');
	const submit = form.querySelector('button[type="submit"]');

	form.addEventListener('submit', async (event) => {
		event.preventDefault();

		if (!form.reportValidity()) return;

		const data = new FormData(form);
		const turnstileToken = data.get('cf-turnstile-response');

		if (!turnstileToken) {
			status.textContent = 'Please complete the security check.';
			status.dataset.state = 'error';
			return;
		}

		submit.disabled = true;
		status.textContent = 'Sending your request…';
		status.dataset.state = '';

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: data.get('name'),
					phone: data.get('phone'),
					email: data.get('email'),
					zip: data.get('zip'),
					service: data.get('service'),
					message: data.get('message'),
					company: data.get('company'),
					turnstileToken,
				}),
			});

			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.message || 'Unable to send your request.');
			}

			form.reset();
			window.turnstile?.reset();
			status.textContent = 'Thank you. We received your request and will contact you soon.';
			status.dataset.state = 'success';
		} catch (error) {
			status.textContent = error instanceof Error
				? error.message
				: 'Unable to send your request. Please call or email us instead.';
			status.dataset.state = 'error';
			window.turnstile?.reset();
		} finally {
			submit.disabled = false;
		}
	});
}
