import { spawn } from 'child_process';

import svelte from 'rollup-plugin-svelte';

import commonjs from '@rollup/plugin-commonjs';

import terser from '@rollup/plugin-terser';

import resolve from '@rollup/plugin-node-resolve';

import css from 'rollup-plugin-css-only';

import replace from '@rollup/plugin-replace';

import dotenv from 'dotenv';

const production = !process.env.ROLLUP_WATCH;


dotenv.config();


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

		sourcemap: true,

		format: 'iife',

		name: 'app',

		file: 'public/build/bundle.js'

	},

	onwarn(warning, warn) {
		// Ignore circular dependency warnings from d3-selection
		if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('d3-selection')) return;

		// Ignore eval warning from pdfjs-dist
		if (warning.code === 'EVAL' && warning.id && warning.id.includes('pdfjs-dist')) return;

		warn(warning);
	},
	plugins: [

		replace({

			preventAssignment: true,

			'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1')

		}),


		svelte({

			compilerOptions: {

				// enable run-time checks when not in production

				dev: !production

			}

		}),

		// we'll extract any component CSS out into

		// a separate file - better for performance

		css({ output: 'bundle.css' }),


		// If you have external dependencies installed from

		// npm, you'll most likely need these plugins. In

		// some cases you'll need additional configuration -

		// consult the documentation for details:

		// https://github.com/rollup/plugins/tree/master/packages/commonjs

		resolve({

			browser: true,

			dedupe: ['svelte'],

			exportConditions: ['svelte', 'import', 'module', 'browser', 'default'],
			extensions: ['.mjs', '.js', '.json', '.node', '.svelte']
		}),


		commonjs(),


		// If we're building for production (npm run build

		// instead of npm run dev), minify

		production && terser()

	],

	watch: {

		clearScreen: false,
		usePolling: true

	}

};