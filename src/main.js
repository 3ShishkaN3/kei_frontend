import App from './App.svelte';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/build/pdf.worker.js';
const app = new App({
target: document.body,
});

export default app;