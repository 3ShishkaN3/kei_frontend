<script>
  import BugReportButton from "../lib/BugReportButton.svelte";

  const START_YEAR = 2024;
  const currentYear = new Date().getFullYear();
  // Показываем либо "2024", либо "2024—{текущий}" если год позже
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    font-size: 0.95rem;
  }
  .copyright { color: var(--color-text-muted, #6b6b6b); }
  .footer-bug-btn { /* небольшой отступ и выравнивание */ }
</style>

<footer>
  <div class="footer-inner">
    <div class="copyright">&copy; {yearText} KeiSenpai</div>
    <div>
      <BugReportButton className="footer-bug-btn" />
    </div>
  </div>
</footer>