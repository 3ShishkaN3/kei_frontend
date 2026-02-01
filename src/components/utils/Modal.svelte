<script>
	import { createEventDispatcher, onMount, onDestroy } from "svelte";
	import { fly, fade } from "svelte/transition";
	import CloseIcon from "svelte-material-icons/Close.svelte";

	export let isOpen = false;
	export let modalTitle = "";
	export let size = "medium"; // 'small', 'medium', 'large', 'xlarge'
	export let showCloseButton = true;
	export let closeOnOverlayClick = false;
	export let closeOnEsc = true;

	const dispatch = createEventDispatcher();

	function closeModal() {
		dispatch("close");
	}

	function handleKeydown(event) {
		if (isOpen && closeOnEsc && event.key === "Escape") {
			closeModal();
		}
	}

	function handleOverlayClick(event) {
		if (closeOnOverlayClick && event.target === event.currentTarget) {
			closeModal();
		}
	}

	let modalContentElement;

	$: {
		if (typeof document !== "undefined") {
			if (isOpen) {
				document.body.style.overflow = "hidden";
			} else {
				document.body.style.overflow = "";
			}
		}
	}

	onDestroy(() => {
		if (typeof document !== "undefined") {
			document.body.style.overflow = "";
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div
		class="modal-overlay"
		on:click={handleOverlayClick}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 200 }}
	>
		<div
			bind:this={modalContentElement}
			class="modal-content size-{size}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title-id"
			in:fly={{ y: -30, duration: 300, delay: 50 }}
			out:fly={{ y: -30, duration: 200 }}
			on:click|stopPropagation
		>
			{#if modalTitle || showCloseButton}
				<div class="modal-header">
					{#if modalTitle}
						<h2 id="modal-title-id" class="modal-title-text">
							{modalTitle}
						</h2>
					{/if}
					{#if showCloseButton}
						<button
							class="modal-close-button"
							on:click={closeModal}
							aria-label="Закрыть модальное окно"
						>
							<CloseIcon size="24px" />
						</button>
					{/if}
				</div>
			{/if}

			<div class="modal-body">
				<slot />
			</div>

			{#if $$slots.footer}
				<div class="modal-footer">
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.65);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: var(--z-index-modal, 1050);
		padding: 20px;
		overflow-y: auto;
	}

	.modal-content {
		background-color: var(--color-bg-light, #fff);
		border-radius: var(--spacing-border-radius-block, 16px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
		position: relative;
		width: 100%;
		max-height: calc(100vh - 40px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-content.size-small {
		max-width: 400px;
	}
	.modal-content.size-medium {
		max-width: 600px;
	}
	.modal-content.size-large {
		max-width: 800px;
	}
	.modal-content.size-xlarge {
		max-width: 1000px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 20px;
		border-bottom: 1px solid var(--color-border-light, #eee);
		flex-shrink: 0;
	}

	.modal-title-text {
		margin: 0;
		font-size: 1.4rem;
		font-weight: var(--font-weight-semi-bold, 600);
		color: var(--color-text-dark, #333);
		line-height: 1.3;
	}

	.modal-close-button {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-muted, #888);
		padding: 5px;
		border-radius: 50%;
		transition:
			background-color 0.2s,
			color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.modal-close-button:hover {
		background-color: var(--color-simple-button-hover-bg, #f0f0f0);
		color: var(--color-text-dark, #333);
	}

	.modal-body {
		padding: 20px;
		overflow-y: auto;
		flex-grow: 1;
	}

	.modal-footer {
		padding: 15px 20px;
		border-top: 1px solid var(--color-border-light, #eee);
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		background-color: var(--color-bg-ultra-light, #f9f9f9);
		flex-shrink: 0;
	}
	.modal-footer :global(button) {
		padding: var(--spacing-padding-button-medium, 8px 15px);
		border-radius: var(--spacing-border-radius-button, 20px);
		font-weight: var(--font-weight-semi-bold, 600);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.9rem;
	}
</style>
