import path from 'node:path';

import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
	esbuild: {
		target: 'es2023',
	},
	build: {
		target: 'es2023',
		modulePreload: false,
		sourcemap: true,
		assetsInlineLimit: 0,
		minify: 'terser',
		rollupOptions: {
			output: {
				chunkFileNames: 'assets/[hash].js',
				manualChunks: {
					common: [
						'solid-js',
						'solid-js/store',
						'solid-js/web',

						'@atcute/client',
						'@mary/events',

						'src/globals/navigation.ts',
						'src/globals/preferences.ts',
						'src/globals/rpc.ts',
					],
					shell: ['src/shell.tsx'],
				},
			},
		},
		terserOptions: {
			compress: {
				passes: 3,
			},
		},
	},
	server: {
		port: 10555,
	},
	resolve: {
		alias: {
			'~': path.join(__dirname, './src'),
		},
	},
	plugins: [
		solid({
			babel: {
				parserOpts: {
					plugins: ['explicitResourceManagement'],
				},
			},
		}),
	],
});
