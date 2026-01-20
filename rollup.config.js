import { spawn } from 'child_process';

import svelte from 'rollup-plugin-svelte';

import commonjs from '@rollup/plugin-commonjs';

import terser from '@rollup/plugin-terser';

import resolve from '@rollup/plugin-node-resolve';

import css from 'rollup-plugin-css-only';

import replace from '@rollup/plugin-replace';

import dotenv from 'dotenv';

const production = !process.env.ROLLUP_WATCH;
const apiBase = production ? '/api/v1' : 'http://localhost:8000/api/v1';


dotenv.config()


function serve() {

	let server;


	function toExit() {

		if (server) server.kill(0);

	}


	return {

		writeBundle() {

			if (server) return;

			server = spawn('npm', ['run', 'start', '--', '--dev'], {

				stdio: ['ignore', 'inherit', 'inherit'],

				shell: true

			});


			process.on('SIGTERM', toExit);

			process.on('exit', toExit);

		}

	};

}


export default {

	input: 'src/main.js',

	output: {

		sourcemap: false,

		format: 'iife',

		name: 'app',

		file: 'public/build/bundle.js',

		globals: {
			'@sentry/svelte': 'Sentry',
			'html2canvas': 'html2canvas'
		}

	},

	onwarn(warning, warn) {
		if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('d3-selection')) return;

		if (warning.code === 'EVAL' && warning.id && warning.id.includes('pdfjs-dist')) return;

		warn(warning);
	},
	plugins: [

		replace({
			preventAssignment: true,
			'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBase),
			'process.env.VITE_API_BASE_URL': JSON.stringify(apiBase),
			'process.env.SENTRY_DSN': JSON.stringify('https://0b5f39fd7c79eed36e50fdfb148be5c2@o4510416287236096.ingest.de.sentry.io/4510416321642576')
		}),

		svelte({

			compilerOptions: {

				dev: !production

			}

		}),


		css({ output: 'bundle.css' }),

		resolve({
			browser: true,
			dedupe: ['svelte', 'three', '@pixiv/three-vrm'],
			exportConditions: ['svelte', 'import', 'module', 'browser', 'default'],
			extensions: ['.mjs', '.js', '.json', '.node', '.svelte'],
			preferBuiltins: false
		}),

		commonjs({
			requireReturnsDefault: 'auto'
		}),

		production && terser()

	],

	watch: {

		clearScreen: false,
		usePolling: true

	}

};