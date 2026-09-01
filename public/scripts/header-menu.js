function initializeHeader(header) {
	if (header.dataset.menuInitialized === 'true') return;

	const menu = header.querySelector('[data-menu]');
	const toggle = menu?.querySelector('.menu-toggle');
	const navigation = header.querySelector('[data-navigation]');

	if (!menu || !toggle || !navigation) return;

	function setMenu(open) {
		menu.open = open;
		toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
	}

	menu.addEventListener('toggle', () => {
		toggle.setAttribute(
			'aria-label',
			menu.open ? 'Close navigation menu' : 'Open navigation menu',
		);
	});

	navigation.addEventListener('click', (event) => {
		if (event.target.closest('a')) setMenu(false);
	});

	document.addEventListener('click', (event) => {
		if (!header.contains(event.target)) setMenu(false);
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && menu.open) {
			setMenu(false);
			toggle.focus();
		}
	});

	window.addEventListener('resize', () => {
		if (window.innerWidth > 760) setMenu(false);
	});

	header.dataset.menuInitialized = 'true';
	setMenu(false);
}

function initializeHeaders() {
	document.querySelectorAll('[data-site-header]').forEach(initializeHeader);
}

initializeHeaders();
document.addEventListener('astro:page-load', initializeHeaders);
