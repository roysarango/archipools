const DEFAULT_AUTOPLAY_DELAY = 5000;
const MINIMUM_AUTOPLAY_DELAY = 1000;

function initializeShowcase(root) {
	if (root.dataset.initialized === 'true') return;

	const slides = Array.from(root.querySelectorAll('[data-slide]'));
	const dots = Array.from(root.querySelectorAll('[data-dot]'));
	const previousButton = root.querySelector('[data-previous]');
	const nextButton = root.querySelector('[data-next]');
	const slidesRegion = root.querySelector('[data-slides]');

	if (slides.length < 2 || !previousButton || !nextButton || !slidesRegion) {
		root.dataset.carouselStatus = 'missing-elements';
		console.error('[Service carousel] Initialization failed: required elements are missing.');
		return;
	}

	const requestedDelay = Number(root.dataset.autoplayDelay);
	const autoplayDelay =
		Number.isFinite(requestedDelay) && requestedDelay >= MINIMUM_AUTOPLAY_DELAY
			? requestedDelay
			: DEFAULT_AUTOPLAY_DELAY;

	let activeIndex = Math.max(
		0,
		slides.findIndex((slide) => !slide.hidden),
	);
	let autoplayTimer;
	let touchStartX = 0;
	let touchStartY = 0;
	let pointerStartX = 0;

	function showSlide(newIndex, announce = false) {
		activeIndex = (newIndex + slides.length) % slides.length;

		slides.forEach((slide, index) => {
			slide.hidden = index !== activeIndex;
		});

		dots.forEach((dot, index) => {
			dot.setAttribute('aria-current', String(index === activeIndex));
		});

		slidesRegion.setAttribute('aria-live', announce ? 'polite' : 'off');
		root.dataset.activeSlide = String(activeIndex);
	}

	function stopAutoplay() {
		if (autoplayTimer !== undefined) {
			window.clearTimeout(autoplayTimer);
			autoplayTimer = undefined;
		}
	}

	function startAutoplay() {
		stopAutoplay();

		if (document.hidden) {
			root.dataset.carouselStatus = 'paused-hidden-tab';
			return;
		}

		root.dataset.carouselStatus = 'autoplay-running';
		autoplayTimer = window.setTimeout(() => {
			showSlide(activeIndex + 1);
			startAutoplay();
		}, autoplayDelay);
	}

	function manuallyShow(newIndex) {
		showSlide(newIndex, true);
		startAutoplay();
	}

	previousButton.addEventListener('click', () => manuallyShow(activeIndex - 1));
	nextButton.addEventListener('click', () => manuallyShow(activeIndex + 1));

	dots.forEach((dot, index) => {
		dot.addEventListener('click', () => manuallyShow(index));
	});

	root.addEventListener(
		'touchstart',
		(event) => {
			touchStartX = event.changedTouches[0]?.clientX ?? 0;
			touchStartY = event.changedTouches[0]?.clientY ?? 0;
			stopAutoplay();
		},
		{ passive: true },
	);

	root.addEventListener(
		'touchend',
		(event) => {
			const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
			const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
			const deltaX = touchEndX - touchStartX;
			const deltaY = touchEndY - touchStartY;

			if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
				manuallyShow(activeIndex + (deltaX < 0 ? 1 : -1));
			} else {
				startAutoplay();
			}
		},
		{ passive: true },
	);

	root.addEventListener('pointerdown', (event) => {
		if (event.pointerType === 'mouse') pointerStartX = event.clientX;
	});

	root.addEventListener('pointerup', (event) => {
		if (event.pointerType !== 'mouse') return;

		const deltaX = event.clientX - pointerStartX;
		if (Math.abs(deltaX) > 70) {
			manuallyShow(activeIndex + (deltaX < 0 ? 1 : -1));
		}
	});

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) stopAutoplay();
		else startAutoplay();
	});

	root.dataset.initialized = 'true';
	showSlide(activeIndex);
	startAutoplay();

	console.info(`[Service carousel] Initialized with a ${autoplayDelay}ms autoplay delay.`);
}

function initializeAllShowcases() {
	document.querySelectorAll('[data-showcase]').forEach(initializeShowcase);
}

initializeAllShowcases();
document.addEventListener('astro:page-load', initializeAllShowcases);
