<script>
  import * as Sentry from "@sentry/svelte";
  import html2canvas from 'html2canvas';
  import { getKeiLogs } from './logger.js';
  import { onMount } from 'svelte';

  export let className = '';
  let sending = false;
  let success = false;
  let error = null;
  async function sendReport() {
    sending = true;
    error = null;
    try {
      const logs = getKeiLogs();
      const html = document.documentElement ? document.documentElement.outerHTML : '';

      let cssText = '';
      for (const sheet of Array.from(document.styleSheets || [])) {
        try {
          const rules = sheet.cssRules;
          if (!rules) continue;
          for (const r of Array.from(rules)) cssText += r.cssText + '\n';
        } catch (e) {
        }
      }

      let screenshot = null;
      try {
        const canvas = await html2canvas(document.documentElement, { scale: 1, logging: false });
        screenshot = canvas.toDataURL('image/png');
      } catch (e) {
      }

      Sentry.setExtra('page_html', html);
      Sentry.setExtra('page_css', cssText);
      Sentry.setExtra('console_logs', logs);
      if (screenshot) Sentry.setExtra('screenshot_base64', screenshot);

      const eventId = Sentry.captureMessage('User bug report');
      try {
        Sentry.showReportDialog({ eventId });
      } catch (e) {
      }

      success = true;
    } catch (e) {
      console.error('Failed to send bug report', e);
      error = String(e);
    } finally {
      sending = false;
    }
  }
</script>

<style>
  .bug-btn {
    background: var(--color-primary, #6D7FC9);
    color: var(--color-primary-contrast, #ffffff);
    border: none;
    padding: 8px 14px;
    border-radius: 14px;
    cursor: pointer;
    font-size: 0.95rem;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    box-shadow: 0 6px 18px rgba(0,0,0,0.06);
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .bug-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,0.08); }

  .modal-backdrop {
    position: fixed;
    left: 0; right: 0; top: 0; bottom: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 16px;
  }
  .modal {
    background: var(--color-bg-surface, #ffffff);
    padding: 20px 22px;
    border-radius: 8px;
    width: 560px;
    max-width: 100%;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18);
    position: relative;
    z-index: 1101;
  }
  textarea { width: 100%; min-height: 120px; border: 1px solid var(--color-border, #e3e6ef); padding:10px; border-radius:6px }
  .row { display:flex; gap:8px; justify-content:flex-end; margin-top:12px }
  .cancel-btn { background-color: var(--color-surface-muted, #f0f0f0); color: var(--color-text, #333); border: none; padding:8px 12px; border-radius:6px; cursor:pointer }
  .cancel-btn:hover { filter: brightness(0.97) }
  .save-btn { background-color: var(--color-primary); color: white; min-width: 140px; padding:8px 14px; border-radius:6px; border:none; cursor:pointer; font-weight:600 }
  .save-btn:hover { background-color: var(--color-primary-dark, #9d92f7) }
</style>


<button class={`bug-btn ${className}`} on:click={sendReport} disabled={sending}>{sending ? 'Отправка...' : 'Сообщить об ошибке'}</button>

