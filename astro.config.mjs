// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://archi-pools.com',
	vite: {
		server: {
			allowedHosts: ['.trycloudflare.com'],
		},
	},
});
