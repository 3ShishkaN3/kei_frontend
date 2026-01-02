<script>
    import { onMount } from 'svelte';
    import { fly } from 'svelte/transition';
    import { user } from '../stores/user.js';
    import {
        fetchDictionarySectionDetails,
        fetchDictionaryEntries,
        fetchDictionaryMetadata,
        markEntryAsLearned,
        unmarkEntryAsLearned,
        deleteDictionaryEntry
    } from '../api/dictionaryApi';
    import { addNotification } from '../stores/notifications.js';

    import EyeOutline from 'svelte-material-icons/EyeOutline.svelte';
    import EyeOffOutline from 'svelte-material-icons/EyeOffOutline.svelte';
    import Table from 'svelte-material-icons/Table.svelte';
    import CardMultipleOutline from 'svelte-material-icons/CardMultipleOutline.svelte';
    import PlusCircleOutline from 'svelte-material-icons/PlusCircleOutline.svelte';
    import ArrowLeft from 'svelte-material-icons/ArrowLeft.svelte';
    import ArrowRight from 'svelte-material-icons/ArrowRight.svelte';

    import LoadingIndicator from '../components/utils/LoadingIndicator.svelte';
    import ErrorMessage from '../components/utils/ErrorMessage.svelte';
    import EnhancedPagination from '../components/EnhancedPagination.svelte';
    import DictionaryCard from '../components/dictionary/DictionaryCard.svelte';
    import DictionaryTable from '../components/dictionary/DictionaryTable.svelte';
    import DictionaryEntryFormModal from '../components/dictionary/DictionaryEntryFormModal.svelte';

    export let courseId;
    export let practiceId;
    const sectionId = practiceId;

    let entries = [];
    let sectionDetails = null;
    let currentEntry = null;

    let isLoading = true;
    let error = null;

    let displayMode = 'cards'; // 'cards' or 'table'
    let isAdminView = false;
    let isPrivilegedUser = false;
    
    let currentCardIndex = 0;
    let visibleEntries = [];
    let previousCardIndex = 0;
    let totalCardsCount = 0;
    let metaData = null;
    
    let cardChunks = new Map();
    let currentChunkIndex = 0;
    const CARDS_CHUNK_SIZE = 10;
    const PRELOAD_CHUNKS = 1;
    let loadingChunks = new Set();
    
    user.subscribe(value => {
        isPrivilegedUser = value && value.isAuthenticated && ['admin', 'teacher', 'assistant'].includes(value.role);
        isAdminView = isPrivilegedUser;
    });

    let isModalOpen = false;
    let editingEntry = null;

    let currentPage = 1;
    let totalItems = 0;
    let totalPages = 1;
    const ITEMS_PER_PAGE = 10;

    $: tableEntries = isAdminView ? entries : entries.filter(e => !e.is_learned);
    
    $: {
        if (displayMode === 'cards' && metaData) {
            totalCardsCount = isAdminView ? metaData.total_count : metaData.unlearned_count;
            ensureChunkLoaded(Math.floor(currentCardIndex / CARDS_CHUNK_SIZE));
        } else if (displayMode === 'table') {
            visibleEntries = tableEntries;
        }
        
        if (currentCardIndex >= totalCardsCount && totalCardsCount > 0) {
            currentCardIndex = 0;
        }
    }

    onMount(async () => {
        if (!sectionId) return;
        isLoading = true;
        try {
            const sectionPromise = fetchDictionarySectionDetails(sectionId);
            const metaPromise = fetchDictionaryMetadata(sectionId);
            const entriesPromise = fetchDictionaryEntries(sectionId, {
                page: currentPage,
                page_size: ITEMS_PER_PAGE
            });

            const [sectionData, metaResponse, entriesData] = await Promise.all([sectionPromise, metaPromise, entriesPromise]);

            sectionDetails = sectionData;
            metaData = metaResponse;
            entries = entriesData.results;
            totalItems = entriesData.count;
            totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

            if (displayMode === 'cards') {
                await initializeCards();
            }

            if (entries.length > 0 && !currentEntry) {
                currentEntry = entries[0];
            }
        } catch (err) {
            error = err.message;
            addNotification(`Ошибка загрузки данных: ${err.message}`, 'error');
        } finally {
            isLoading = false;
        }
    });

    async function initializeCards() {
        console.log('🎴 Инициализация карточек, режим админа:', isAdminView);
        cardChunks.clear();
        loadingChunks.clear();
        currentChunkIndex = 0;
        currentCardIndex = 0;
        previousCardIndex = 0;
        
        totalCardsCount = isAdminView ? metaData.total_count : metaData.unlearned_count;
        console.log('📊 Общее количество карточек:', totalCardsCount);
        
        if (totalCardsCount > 0) {
            const firstChunk = await loadCardChunk(0);
            updateVisibleEntries();
            console.log('✅ Первый чанк загружен, записей в чанке:', firstChunk?.length || 0);
            console.log('🔄 Обновление visibleEntries завершено');
        } else {
            console.log('⚠️ Нет карточек для отображения');
        }
    }

    async function loadCardChunk(chunkIndex) {
        console.log(`📦 Загрузка чанка ${chunkIndex}...`);
        
        if (cardChunks.has(chunkIndex)) {
            console.log(`✅ Чанк ${chunkIndex} уже загружен`);
            return cardChunks.get(chunkIndex);
        }

        if (loadingChunks.has(chunkIndex)) {
            console.log(`⏳ Чанк ${chunkIndex} уже загружается, ждем...`);
            while (loadingChunks.has(chunkIndex)) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return cardChunks.get(chunkIndex) || [];
        }

        loadingChunks.add(chunkIndex);
        console.log(`🔒 Заблокирован чанк ${chunkIndex} для загрузки`);

        try {
            const entriesOffset = chunkIndex * CARDS_CHUNK_SIZE;
            const page = Math.floor(entriesOffset / CARDS_CHUNK_SIZE) + 1;
            
            console.log(`🌐 Запрос данных для чанка ${chunkIndex}, страница ${page}, include_learned: ${isAdminView ? 'true' : 'false'}`);
            
            const data = await fetchDictionaryEntries(sectionId, {
                page: page,
                page_size: CARDS_CHUNK_SIZE,
                include_learned: isAdminView ? 'true' : 'false'
            });

            console.log(`📡 Ответ от API для чанка ${chunkIndex}:`, data);
            
            const chunkEntries = data.results || [];
            console.log(`📥 Получено записей для чанка ${chunkIndex}:`, chunkEntries.length, chunkEntries);
            
            cardChunks.set(chunkIndex, chunkEntries);
            console.log(`💾 Сохранен чанк ${chunkIndex}, размер кеша:`, cardChunks.size);
            console.log(`🔍 Проверка сохранения чанка ${chunkIndex}:`, cardChunks.get(chunkIndex)?.length || 0);
            
            return chunkEntries;
        } catch (err) {
            console.error(`❌ Ошибка загрузки чанка ${chunkIndex}:`, err);
            return [];
        } finally {
            loadingChunks.delete(chunkIndex);
            console.log(`🔓 Разблокирован чанк ${chunkIndex}`);
        }
    }

    async function ensureChunkLoaded(chunkIndex) {
        console.log(`🔄 ensureChunkLoaded для чанка ${chunkIndex}`);
        
        if (!cardChunks.has(chunkIndex)) {
            console.log(`📦 Загружаем основной чанк ${chunkIndex}`);
            await loadCardChunk(chunkIndex);
        } else {
            console.log(`✅ Чанк ${chunkIndex} уже загружен`);
        }
        
        updateVisibleEntries();
        
        const totalChunks = Math.ceil(totalCardsCount / CARDS_CHUNK_SIZE);
        for (let i = 1; i <= PRELOAD_CHUNKS; i++) {
            const prevChunk = chunkIndex - i;
            const nextChunk = chunkIndex + i;
            
            if (prevChunk >= 0 && !cardChunks.has(prevChunk) && !loadingChunks.has(prevChunk)) {
                console.log(`📦 Предзагрузка чанка ${prevChunk}`);
                loadCardChunk(prevChunk);
            }
            
            if (nextChunk < totalChunks && !cardChunks.has(nextChunk) && !loadingChunks.has(nextChunk)) {
                console.log(`📦 Предзагрузка чанка ${nextChunk}`);
                loadCardChunk(nextChunk);
            }
        }
    }

    function updateVisibleEntries() {
        const chunkIndex = Math.floor(currentCardIndex / CARDS_CHUNK_SIZE);
        const chunk = cardChunks.get(chunkIndex) || [];
        console.log(`🔄 updateVisibleEntries: chunkIndex=${chunkIndex}, chunk.length=${chunk.length}`);
        visibleEntries = chunk;
        console.log(`📋 visibleEntries обновлены:`, visibleEntries.length, 'записей');
    }

    function getCurrentCardEntry() {
        const indexInChunk = currentCardIndex % CARDS_CHUNK_SIZE;
        const entry = visibleEntries[indexInChunk];
        
        console.log(`🃏 getCurrentCardEntry: currentCardIndex=${currentCardIndex}, indexInChunk=${indexInChunk}, visibleEntries.length=${visibleEntries.length}`);
        
        if (!entry) {
            const chunkIndex = Math.floor(currentCardIndex / CARDS_CHUNK_SIZE);
            console.log('❌ Карточка не найдена:', {
                currentCardIndex,
                chunkIndex,
                indexInChunk,
                visibleEntriesLength: visibleEntries.length,
                totalCardsCount,
                chunksLoaded: Array.from(cardChunks.keys()),
                loadingChunks: Array.from(loadingChunks)
            });
            
            if (visibleEntries.length > 0) {
                console.log(`🔍 Содержимое visibleEntries:`, visibleEntries.map((e, i) => `${i}: ${e.name || e.term}`));
            }
        }
        
        return entry;
    }

    async function loadEntries(page = 1) {
        isLoading = true;
        try {
            const data = await fetchDictionaryEntries(sectionId, {
                page: page,
                page_size: ITEMS_PER_PAGE
            });
            entries = data.results;
            totalItems = data.count;
            totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            currentPage = page;
        } catch (err) {
            addNotification(`Ошибка загрузки слов: ${err.message}`, 'error');
        } finally {
            isLoading = false;
        }
    }

    async function handleToggleLearned(event) {
        const entry = event.detail;
        try {
            if (entry.is_learned) {
                await unmarkEntryAsLearned(sectionId, entry.id);
                addNotification('Слово помечено как "не выучено"', 'success');
                entry.is_learned = false;
            } else {
                await markEntryAsLearned(sectionId, entry.id);
                addNotification('Слово помечено как "выучено"', 'success');
                entry.is_learned = true;
            }
            
            entries = entries.map(e => e.id === entry.id ? { ...e, is_learned: entry.is_learned } : e);
            
            if (displayMode === 'cards') {
                for (let [chunkIndex, chunk] of cardChunks) {
                    const updatedChunk = chunk.map(e => e.id === entry.id ? { ...e, is_learned: entry.is_learned } : e);
                    cardChunks.set(chunkIndex, updatedChunk);
                }
                
                if (!isAdminView && entry.is_learned) {
                    const metaResponse = await fetchDictionaryMetadata(sectionId);
                    metaData = metaResponse;
                    cardChunks.clear();
                    loadingChunks.clear();
                    const currentChunk = Math.floor(currentCardIndex / CARDS_CHUNK_SIZE);
                    await ensureChunkLoaded(currentChunk);
                    if (currentCardIndex < totalCardsCount - 1) {
                        await goToNextCard();
                    } else {
                        currentCardIndex = 0;
                    }
                }
            }

        } catch (err) {
            addNotification(`Ошибка: ${err.message}`, 'error');
        }
    }

    async function handleDelete(event) {
        const entryToDelete = event.detail;
        if (confirm(`Вы уверены, что хотите удалить слово "${entryToDelete.term}"?`)) {
            try {
                await deleteDictionaryEntry(sectionId, entryToDelete.id);
                addNotification('Слово успешно удалено', 'success');
                loadEntries(currentPage);
            } catch (err) {
                addNotification(`Ошибка удаления: ${err.message}`, 'error');
            }
        }
    }
    
    function handleEdit(event) {
        editingEntry = event.detail;
        isModalOpen = true;
    }
    
    function handleCreate() {
        editingEntry = null;
        isModalOpen = true;
    }

    async function onEntrySaved(event) {
        isModalOpen = false;
        const { entry: savedEntry, isNewEntry } = event.detail;
        
        if (isNewEntry) {
            addNotification('Слово успешно создано!', 'success');
        } else {
            addNotification('Слово успешно обновлено!', 'success');
        }
        
        await loadEntries(currentPage);
        
        if (isNewEntry && displayMode === 'cards') {
            setTimeout(() => {
                const newEntryIndex = visibleEntries.findIndex(e => e.id === savedEntry.id);
                if (newEntryIndex !== -1) {
                    navigateToCard(newEntryIndex);
                }
            }, 100);
        }
    }

    function handleCloseModal() {
        isModalOpen = false;
        editingEntry = null;
    }
    
    function onPageChange(event) {
        loadEntries(event.detail.page);
    }

    async function goToPrevCard() {
        if (currentCardIndex > 0) {
            previousCardIndex = currentCardIndex;
            currentCardIndex--;
            
            const newChunkIndex = Math.floor(currentCardIndex / CARDS_CHUNK_SIZE);
            await ensureChunkLoaded(newChunkIndex);
        }
    }

    async function goToNextCard() {
        if (currentCardIndex < totalCardsCount - 1) {
            previousCardIndex = currentCardIndex;
            currentCardIndex++;
            
            const newChunkIndex = Math.floor(currentCardIndex / CARDS_CHUNK_SIZE);
            await ensureChunkLoaded(newChunkIndex);
        }
    }

    async function navigateToCard(index) {
        if (index >= 0 && index < totalCardsCount) {
            previousCardIndex = currentCardIndex;
            currentCardIndex = index;
            
            const newChunkIndex = Math.floor(currentCardIndex / CARDS_CHUNK_SIZE);
            await ensureChunkLoaded(newChunkIndex);
        }
    }

    $: slideDirection = currentCardIndex > previousCardIndex ? 'next' : 'prev';

    $: if (displayMode === 'cards' && metaData) {
        console.log('🔄 Переключение в режим карточек, инициализация...');
        setTimeout(() => initializeCards(), 50);
    }

    $: if (displayMode === 'table') {
        loadEntries(currentPage);
    }

</script>

<svelte:head>
    <title>{sectionDetails ? sectionDetails.title : 'Словарь'} - Kei</title>
</svelte:head>

<div class="page-container">
    <DictionaryEntryFormModal
        bind:isOpen={isModalOpen}
        entry={editingEntry}
        {sectionId}
        on:save={onEntrySaved}
        on:close={handleCloseModal}
    />

    <header class="page-header">
        <h1>{sectionDetails ? sectionDetails.title : 'Словарь'}</h1>
        <div class="header-controls">
            {#if isPrivilegedUser}
                <button class="control-button" on:click={() => isAdminView = !isAdminView} title={isAdminView ? 'Режим студента' : 'Режим администратора'}>
                    {#if isAdminView}
                        <EyeOffOutline /><span>Студент</span>
                    {:else}
                        <EyeOutline /><span>Админ</span>
                    {/if}
                </button>
                <button class="control-button primary" on:click={handleCreate} disabled={isLoading}>
                    <PlusCircleOutline /> Добавить слово
                </button>
            {/if}
        </div>
    </header>

    <div class="view-mode-toggle">
        <button class:active={displayMode === 'cards'} on:click={() => displayMode = 'cards'}>
            <CardMultipleOutline /> Карточки
        </button>
        <button class:active={displayMode === 'table'} on:click={() => displayMode = 'table'}>
            <Table /> Таблица
        </button>
    </div>

    <div class="content-area">
        {#if isLoading}
            <LoadingIndicator />
        {:else if error}
            <ErrorMessage message={error} />
        {:else if entries.length === 0}
            <div class="empty-state">
                <p>В этом разделе пока нет слов.</p>
                {#if isPrivilegedUser && isAdminView}
                    <button class="control-button primary" on:click={handleCreate}>Добавить первое слово</button>
                {/if}
            </div>
        {:else}
            {#if displayMode === 'cards'}
                {#if totalCardsCount === 0}
                    <div class="empty-state learned-all">
                        <p>Отличная работа! Все слова изучены.</p>
                        <p>Вы можете посмотреть все слова, включая изученные, в режиме таблицы.</p>
                    </div>
                {:else}
                    <div class="carousel-container">
                        <div class="carousel-wrapper">
                            <button 
                                class="carousel-arrow carousel-arrow-prev" 
                                on:click={goToPrevCard}
                                disabled={currentCardIndex === 0}
                                aria-label="Предыдущая карточка"
                            >
                                <ArrowLeft size="24px" />
                            </button>
                            
                            <div class="carousel-track">
                                {#if getCurrentCardEntry()}
                                    {#key currentCardIndex}
                                        <div class="carousel-slide" 
                                             in:fly="{{ x: slideDirection === 'next' ? 300 : -300, duration: 400, delay: 100 }}"
                                             out:fly="{{ x: slideDirection === 'next' ? -300 : 300, duration: 300 }}">
                                            <DictionaryCard 
                                                entry={getCurrentCardEntry()}
                                                {isAdminView}
                                                on:toggleLearned={handleToggleLearned}
                                                on:edit={handleEdit}
                                                on:delete={handleDelete}
                                            />
                                        </div>
                                    {/key}
                                {/if}
                            </div>
                            
                            <button 
                                class="carousel-arrow carousel-arrow-next" 
                                on:click={goToNextCard}
                                disabled={currentCardIndex === totalCardsCount - 1}
                                aria-label="Следующая карточка"
                            >
                                <ArrowRight size="24px" />
                            </button>
                        </div>
                        
                        <div class="carousel-smart-indicators">
                            {#if totalCardsCount > 20}
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div 
                                            class="progress-fill" 
                                            style="width: {((currentCardIndex + 1) / totalCardsCount) * 100}%"
                                        ></div>
                                    </div>
                                    <div class="progress-labels">
                                        <span>1</span>
                                        <span>{totalCardsCount}</span>
                                    </div>
                                </div>
                            {:else}
                                <div class="carousel-indicators">
                                    {#each Array(totalCardsCount) as _, index}
                                        <button 
                                            class="carousel-dot" 
                                            class:active={index === currentCardIndex}
                                            on:click={() => navigateToCard(index)}
                                            aria-label="Перейти к карточке {index + 1}"
                                        ></button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        
                        <div class="carousel-counter">
                            {currentCardIndex + 1} из {totalCardsCount}
                        </div>
                    </div>
                {/if}
            {/if}

            {#if displayMode === 'table'}
                <div class="table-view">
                    <DictionaryTable
                        entries={tableEntries}
                        {isAdminView}
                        on:toggleLearned={handleToggleLearned}
                        on:edit={handleEdit}
                        on:delete={handleDelete}
                    />
                    
                    {#if totalPages > 1}
                        <EnhancedPagination 
                            {currentPage} 
                            {totalPages} 
                            showPageJump={true}
                            on:pageChange={onPageChange} 
                        />
                    {/if}
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    .page-container {
        max-width: var(--max-width-page, 1400px);
        margin: 0 auto;
        padding: var(--spacing-padding-page, 20px);
        background: linear-gradient(135deg, var(--color-bg-ultra-light) 0%, rgba(194, 182, 252, 0.05) 100%);
        min-height: 100vh;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        padding: 1.5rem;
        border-radius: var(--spacing-border-radius-large, 16px);
        border: 1px solid rgba(194, 182, 252, 0.2);
    }

    .page-header h1 {
        font-size: var(--font-size-h1);
        font-weight: var(--font-weight-extra-bold);
        color: var(--color-text-dark);
        background: linear-gradient(45deg, var(--color-purple-active), var(--color-pink-active));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .header-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .control-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.8rem 1.5rem;
        border-radius: var(--spacing-border-radius-button);
        border: 1px solid var(--color-purple-light);
        background: linear-gradient(135deg, rgba(194, 182, 252, 0.1), rgba(235, 199, 242, 0.1));
        color: var(--color-purple-active);
        font-weight: var(--font-weight-semi-bold);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(5px);
    }
    
    .control-button:hover {
        background: linear-gradient(135deg, rgba(194, 182, 252, 0.2), rgba(235, 199, 242, 0.2));
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(194, 182, 252, 0.3);
    }

    .control-button.primary {
        background: linear-gradient(135deg, var(--color-purple-active), var(--color-pink-active));
        color: var(--color-text-light);
        border-color: transparent;
    }

    .control-button.primary:hover {
        background: linear-gradient(135deg, var(--color-purple-hover), var(--color-pink-hover));
        box-shadow: 0 8px 25px rgba(194, 182, 252, 0.4);
    }

    .view-mode-toggle {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        border-radius: var(--spacing-border-radius-large, 16px);
        padding: 8px;
        border: 1px solid rgba(194, 182, 252, 0.3);
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
        box-shadow: 0 4px 20px rgba(194, 182, 252, 0.15);
    }

    .view-mode-toggle button {
        padding: 0.8rem 2rem;
        border: none;
        background-color: transparent;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        border-radius: var(--spacing-border-radius-button);
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--color-text-muted);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .view-mode-toggle button.active {
        background: linear-gradient(135deg, var(--color-purple-light), var(--color-pink-light));
        color: var(--color-text-light);
        box-shadow: 0 4px 15px rgba(194, 182, 252, 0.4);
        transform: translateY(-1px);
    }
    
    .content-area {
        padding-top: 1rem;
    }

    .carousel-container {
        max-width: 900px;
        margin: 0 auto;
        position: relative;
        animation: slideInUp 0.6s ease-out;
        overflow: visible;
        padding: 2rem 0 4rem 0;
    }

    .carousel-wrapper {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        position: relative;
    }

    .carousel-track {
        flex: 1;
        display: flex;
        justify-content: center;
        min-height: 450px;
        overflow: visible;
        position: relative;
    }

    .carousel-slide {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .carousel-arrow {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        border: 3px solid var(--color-purple-light);
        border-radius: 50%;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--color-purple-active);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10;
        animation: bounceIn 0.6s ease-out;
    }

    .carousel-arrow:hover:not(:disabled) {
        background: linear-gradient(135deg, var(--color-purple-light), var(--color-pink-light));
        color: var(--color-text-light);
        transform: scale(1.15);
        border-color: transparent;
    }

    .carousel-arrow:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        transform: none;
        background: rgba(200, 200, 200, 0.5);
        border-color: rgba(200, 200, 200, 0.3);
    }

    .carousel-smart-indicators {
        margin-top: 2rem;
        animation: slideInUp 0.8s ease-out;
    }

    .carousel-indicators {
        display: flex;
        justify-content: center;
        gap: 12px;
    }

    .carousel-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: none;
        background: rgba(194, 182, 252, 0.4);
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .carousel-dot:hover {
        background: rgba(194, 182, 252, 0.6);
        transform: scale(1.2);
    }

    .carousel-dot.active {
        background: linear-gradient(135deg, var(--color-purple-active), var(--color-pink-active));
        transform: scale(1.4);
    }

    .progress-bar-container {
        max-width: 400px;
        margin: 0 auto;
    }

    .progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(194, 182, 252, 0.2);
        border-radius: 10px;
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(194, 182, 252, 0.1);
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-purple-active), var(--color-pink-active));
        border-radius: 10px;
        transition: width 0.3s ease-out;
        box-shadow: 0 0 10px rgba(194, 182, 252, 0.4);
    }

    .progress-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: var(--color-text-muted);
        font-weight: 600;
    }

    .carousel-counter {
        text-align: center;
        margin-top: 1.5rem;
        font-size: 1rem;
        color: var(--color-text-muted);
        font-weight: 600;
        animation: slideInUp 1s ease-out;
    }
    
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        border-radius: var(--spacing-border-radius-large);
        color: var(--color-text-muted);
        border: 1px solid rgba(194, 182, 252, 0.2);
        box-shadow: 0 4px 20px rgba(194, 182, 252, 0.1);
    }
    
    .empty-state.learned-all {
        background: linear-gradient(135deg, rgba(194, 182, 252, 0.1), rgba(235, 199, 242, 0.1));
    }

    .table-view {
        margin-top: 1rem;
    }

    /* Animations */
    @keyframes slideInUp {
        0% {
            transform: translateY(30px);
            opacity: 0;
        }
        100% {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes fadeInScale {
        0% {
            transform: scale(0.8);
            opacity: 0;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }

    @keyframes bounceIn {
        0% {
            transform: scale(0.3);
            opacity: 0;
        }
        50% {
            transform: scale(1.05);
        }
        70% {
            transform: scale(0.9);
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }



    /* Responsive Design */
    @media (max-width: 768px) {
        .page-container {
            padding: 1rem;
        }

        .page-header {
            flex-direction: column;
            text-align: center;
            padding: 1rem;
        }

        .header-controls {
            flex-direction: column;
            width: 100%;
        }

        .control-button {
            width: 100%;
            justify-content: center;
        }

        .view-mode-toggle {
            width: 100%;
            margin-bottom: 1.5rem;
        }

        .view-mode-toggle button {
            flex: 1;
            padding: 0.6rem 1rem;
        }

        .carousel-container {
            max-width: 100%;
        }

        .carousel-wrapper {
            gap: 1rem;
        }

        .carousel-arrow {
            width: 50px;
            height: 50px;
            border-width: 2px;
        }

        .carousel-track {
            min-height: 420px;
        }

        .carousel-indicators {
            margin-top: 1.5rem;
            gap: 10px;
        }

        .carousel-dot {
            width: 12px;
            height: 12px;
        }
    }

    @media (max-width: 480px) {
        .carousel-container {
            max-width: 100%;
            padding: 0 0.5rem;
        }

        .carousel-wrapper {
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
        }

        .carousel-arrow {
            position: static;
            width: 200px;
            height: 50px;
            border-radius: var(--spacing-border-radius-button);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
        }

        .carousel-arrow-prev {
            order: -1;
        }

        .carousel-arrow-next {
            order: 1;
        }

        .carousel-track {
            order: 0;
            min-height: 380px;
            width: 100%;
        }

        .carousel-indicators {
            margin-top: 1rem;
            gap: 8px;
        }

        .carousel-dot {
            width: 10px;
            height: 10px;
        }

        .carousel-counter {
            margin-top: 1rem;
            font-size: 0.9rem;
        }
    }
</style>