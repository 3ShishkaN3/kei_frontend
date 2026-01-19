<script>
  import BugReportButton from "../lib/BugReportButton.svelte";

  const START_YEAR = 2024;
  const currentYear = new Date().getFullYear();
  $: yearText =
    currentYear <= START_YEAR
      ? String(START_YEAR)
      : `${START_YEAR}—${currentYear}`;
</script>

<footer>
  <div class="footer-inner">
    <div class="spacer"></div>

    <div class="copyright">&copy; {yearText} KeiSenpai</div>

    <div class="footer-actions">
      <div class="btn-wrapper">
        <BugReportButton />
      </div>
    </div>
  </div>
</footer>

<style>
  footer {
    width: 100%;
    background: transparent;
    color: var(--color-text-muted, #333);
    padding: 12px 24px;
    position: relative;
    box-sizing: border-box;
  }

  .footer-inner {
    width: 100%;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;
  }

  .copyright {
    color: var(--color-text-muted, #6b6b6b);
    grid-column: 2;
    text-align: center;
    white-space: nowrap;
  }

  .footer-actions {
    grid-column: 3;
    display: flex;
    justify-content: flex-end;
  }

  .btn-wrapper {
    display: inline-block;
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

    .copyright {
      order: 1;
      font-size: 0.92rem;
    }

    .footer-actions {
      order: 2;
      width: 100%;
      justify-content: center;
    }

    .btn-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
    }
  }
</style>
