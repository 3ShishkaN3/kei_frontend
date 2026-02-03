import * as Sentry from "@sentry/svelte";
import './lib/logger.js';
import App from './App.svelte';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

Sentry.init({

	dsn: process.env.SENTRY_DSN || '',

	sendDefaultPii: true,

});


pdfjsLib.GlobalWorkerOptions.workerSrc = '/build/pdfjs-dist/build/pdf.worker.js';

const app = new App({
    target: document.body,
});

export default app;