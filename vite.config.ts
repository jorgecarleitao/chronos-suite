import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [preact()],
	define: {
		'import.meta.env.VITE_API_URL': JSON.stringify(
			process.env.VITE_API_URL || 'http://localhost:3000'
		),
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8080',
				changeOrigin: true,
			},
		},
	},
});
