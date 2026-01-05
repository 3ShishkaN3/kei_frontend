<script>
  import BugReportButton from "../lib/BugReportButton.svelte";

  const START_YEAR = 2024;
  const currentYear = new Date().getFullYear();
  $: yearText = currentYear <= START_YEAR ? String(START_YEAR) : `${START_YEAR}—${currentYear}`;
</script>

<style>
  footer {
    width: 100%;
    background: transparent;
    color: var(--color-text-muted, #333);
    position: relative;
    padding: 12px 16px;
  }

  .footer-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr; 
    align-items: center;
    gap: 16px;
    font-size: 0.95rem;
  }

  .copyright { 
    color: var(--color-text-muted, #6b6b6b);
    grid-column: 2;
    text-align: center;
  }

  .footer-actions {
    grid-column: 3;
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 640px) {
    .footer-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 6px 0;
      text-align: center;
    }
    .copyright { font-size: 0.92rem; }
    .footer-bug-btn {
      display: block;
      width: 100%;
      max-width: 320px;
      margin: 0 auto;
    }
  }

  @media (max-width: 400px) {
    footer { padding: 10px 12px; }
    .footer-inner { gap: 8px; }
    .copyright { font-size: 0.9rem; }
  }
</style>

<footer>
  <div class="footer-inner">
    <div class="spacer"></div>

    <div class="copyright">&copy; {yearText} KeiSenpai</div>

    <div class="footer-actions">
      <BugReportButton className="footer-bug-btn" />
    </div>
  </div>
</footer>