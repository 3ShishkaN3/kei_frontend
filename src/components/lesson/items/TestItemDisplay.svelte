<script>
    import { createEventDispatcher, onMount, tick } from "svelte";
    import ImageItemDisplay from "./ImageItemDisplay.svelte";
    import AudioItemDisplay from "./AudioItemDisplay.svelte";
    import Refresh from "svelte-material-icons/Refresh.svelte";
    import McqTestDisplay from "./tests/McqTestDisplay.svelte";
    import DragDropTestDisplay from "./tests/DragDropTestDisplay.svelte";
    import WordOrderTestDisplay from "./tests/WordOrderTestDisplay.svelte";
    import FreeTextTestDisplay from "./tests/FreeTextTestDisplay.svelte";
    import AiConversationTestDisplay from "./tests/AiConversationTestDisplay.svelte";
    import { WS_SUBMISSION_BASE_URL } from "../../../config";

    export let testData = null;
    export let sectionItemId = null;
    export let viewMode = "student";
    export let studentSubmission = null;
    export let shouldRevealAnswers = false;

    const dispatch = createEventDispatcher();

    let localSelectedOptionsMap = {};
    let localSelectedRadioOption = null;
    let isSubmitting = false;
    let dndBasePoolForCurrentTest = [];
    let localStudentAnswerText = "";
    let isRefreshing = false;

    let isTestSubmittedByStudent = false;
    let canStudentInteract = false;
    let studentActualChoicesIds = [];

    let draggableItemsPoolForDisplay = [];
    let filledSlotsForDisplay = {};
    let currentWordSequence = [];
    let wordOrderAvailableOptionsInPool = [];
    let selectedDraggableOptionForSlot = null;

    let aiConversationComponent = null;
    let aiConversationState = {
        hasRecording: false,
        awaitingGrading: false,
        conversationStopped: false,
        errorMessage: "",
    };
    let aiConversationSubmission = null;
    let aiSubmitInFlight = false;

    let submissionSocket = null;

    function generateUiId() {
        return `ui_${Math.random().toString(36).substr(2, 9)}`;
    }

    function updateLocalSelectedOptionsMap(event) {
        localSelectedOptionsMap = event.detail;
    }

    function updateLocalSelectedRadioOption(event) {
        localSelectedRadioOption = event.detail;
    }

    function updateDraggableItemsPoolForDisplay(event) {
        console.log("Parent: updateDraggableItemsPoolForDisplay", event.detail);
        draggableItemsPoolForDisplay = event.detail;
    }

    function updateFilledSlotsForDisplay(event) {
        console.log("Parent: updateFilledSlotsForDisplay", event.detail);
        filledSlotsForDisplay = event.detail;
    }

    function updateSelectedDraggableOptionForSlot(event) {
        console.log(
            "Parent: updateSelectedDraggableOptionForSlot",
            event.detail,
        );
        selectedDraggableOptionForSlot = event.detail;
    }

    function updateCurrentWordSequence(event) {
        currentWordSequence = event.detail;
    }

    function updateWordOrderAvailableOptionsInPool(event) {
        wordOrderAvailableOptionsInPool = event.detail;
    }

    function updateLocalStudentAnswerText(event) {
        localStudentAnswerText = event.detail;
    }

    function handleAiConversationStateChange(event) {
        const detail = event.detail || {};
        aiConversationState = {
            ...aiConversationState,
            ...detail,
        };
        if (detail.errorMessage) {
            dispatch("notify", {
                type: "error",
                message: detail.errorMessage,
            });
        }
        if (typeof detail.lastSubmission !== "undefined") {
            aiConversationSubmission = detail.lastSubmission;
        }
        if (detail.awaitingGrading === false) {
            aiSubmitInFlight = false;
        }
    }

    function handleAiConversationSubmission(event) {
        const detail = event.detail || {};
        const { submission, sectionItemId: childSection } = detail;
        if (submission) {
            aiConversationSubmission = submission;
            studentSubmission = submission;
            isTestSubmittedByStudent = true;
            canStudentInteract = false;
            dispatch("submissionUpdated", {
                submission,
                sectionItemId: childSection || sectionItemId,
            });
            if (submission.status === "graded") {
                aiSubmitInFlight = false;
            }
        }
    }

    async function handleAiConversationSubmit() {
        if (!aiConversationComponent?.submitConversation || aiSubmitInFlight) {
            return;
        }
        aiSubmitInFlight = true;
        const success = await aiConversationComponent.submitConversation();
        if (!success) {
            aiSubmitInFlight = false;
        }
    }

    $: aiSubmitDisabled =
        aiConversationState.awaitingGrading ||
        !aiConversationState.hasRecording ||
        aiSubmitInFlight;

    async function refreshSubmissionStatus() {
        if (!studentSubmission?.id) return;

        isRefreshing = true;
        dispatch("refreshSubmission", { submissionId: studentSubmission.id });

        setTimeout(() => {
            if (isRefreshing) {
                isRefreshing = false;
            }
        }, 10000);
    }

    function handleTestReset() {
        if (testData?.test_type === "mcq-multi") {
            localSelectedOptionsMap = {};
            localSelectedOptionsMap = { ...localSelectedOptionsMap };
        } else if (testData?.test_type === "mcq-single") {
            localSelectedRadioOption = null;
        } else if (testData?.test_type === "drag-and-drop") {
            const allItemsFromSlots = Object.values(filledSlotsForDisplay);
            draggableItemsPoolForDisplay = [
                ...draggableItemsPoolForDisplay,
                ...allItemsFromSlots,
            ];
            filledSlotsForDisplay = {};
            selectedDraggableOptionForSlot = null;
        } else if (testData?.test_type === "word-order") {
            const allItemsFromSequence = [...currentWordSequence];
            wordOrderAvailableOptionsInPool = [
                ...wordOrderAvailableOptionsInPool,
                ...allItemsFromSequence,
            ];
            currentWordSequence = [];
        } else if (testData?.test_type === "free-text") {
            localStudentAnswerText = "";
        }
    }

    function syncStateWithProps(
        currentTestData,
        currentStudentSubmission,
        currentViewMode,
        currentIsSubmittingFlag,
    ) {
        const hasCurrentSubmission = !!currentStudentSubmission;
        const hasPastSubmission = !!(
            currentTestData && currentTestData.student_submission_details
        );
        const newIsTestSubmittedByStudent =
            (hasCurrentSubmission || hasPastSubmission) &&
            currentViewMode === "student";

        let newIsSubmittingState = currentIsSubmittingFlag;
        if (
            currentIsSubmittingFlag &&
            newIsTestSubmittedByStudent &&
            currentStudentSubmission?.id !== studentSubmission?.id
        ) {
            newIsSubmittingState = false;
        } else if (
            currentIsSubmittingFlag &&
            !currentStudentSubmission &&
            studentSubmission !== null
        ) {
            newIsSubmittingState = false;
        }

        isTestSubmittedByStudent = newIsTestSubmittedByStudent;
        isSubmitting = newIsSubmittingState;
        canStudentInteract = currentViewMode === "student" && !isSubmitting;

        if (
            testData?.id !== currentTestData?.id ||
            testData?.test_type !== currentTestData?.test_type
        ) {
            localSelectedOptionsMap = {};
            localSelectedRadioOption = null;
            studentActualChoicesIds = [];

            draggableItemsPoolForDisplay = [];
            filledSlotsForDisplay = {};
            currentWordSequence = [];
            wordOrderAvailableOptionsInPool = [];
            dndBasePoolForCurrentTest = [];
            selectedDraggableOptionForSlot = null;
            localStudentAnswerText = "";

            closeSocket();
        }

        if (studentSubmission?.id && viewMode === "student") {
            setupSubmissionSocket(studentSubmission.id);
        } else {
            closeSocket();
        }

        if (currentTestData) {
            function updatePoolWithStableIds(currentPool, newTexts) {
                const newItems = [];
                const existingItemsMap = new Map(
                    currentPool.map((item) => [item.text, item]),
                );

                for (const text of newTexts) {
                    if (existingItemsMap.has(text)) {
                        newItems.push(existingItemsMap.get(text));
                    } else {
                        newItems.push({ id: generateUiId(), text: text });
                    }
                }
                return newItems;
            }

            if (
                currentTestData.draggable_options_pool &&
                currentTestData.test_type === "drag-and-drop"
            ) {
                if (
                    testData?.id !== currentTestData.id ||
                    testData?.test_type !== currentTestData.test_type ||
                    draggableItemsPoolForDisplay.length === 0
                ) {
                    draggableItemsPoolForDisplay = updatePoolWithStableIds(
                        [],
                        currentTestData.draggable_options_pool,
                    );
                }
            }

            if (
                currentTestData.draggable_options_pool &&
                currentTestData.test_type === "word-order"
            ) {
                if (
                    testData?.id !== currentTestData.id ||
                    testData?.test_type !== currentTestData.test_type ||
                    dndBasePoolForCurrentTest.length === 0
                ) {
                    dndBasePoolForCurrentTest = updatePoolWithStableIds(
                        [],
                        currentTestData.draggable_options_pool,
                    );
                }
                wordOrderAvailableOptionsInPool =
                    dndBasePoolForCurrentTest.filter(
                        (poolItem) =>
                            !currentWordSequence.find(
                                (seqItem) => seqItem.id === poolItem.id,
                            ),
                    );
            }

            let submissionToUse = currentStudentSubmission;
            if (
                !submissionToUse &&
                currentTestData &&
                currentTestData.student_submission_details
            ) {
                submissionToUse = currentTestData.student_submission_details;
            }

            if (isTestSubmittedByStudent && submissionToUse) {
                const answersFromServer = submissionToUse.answers;

                if (
                    currentTestData.test_type === "mcq-multi" ||
                    currentTestData.test_type === "mcq-single"
                ) {
                    let mcqAnswerIds = [];
                    if (
                        answersFromServer &&
                        (answersFromServer.selected_option_ids ||
                            Array.isArray(answersFromServer))
                    ) {
                        mcqAnswerIds =
                            answersFromServer.selected_option_ids ||
                            (Array.isArray(answersFromServer)
                                ? answersFromServer.map((a) => a.id)
                                : []);
                    } else if (submissionToUse.mcq_answers) {
                        if (
                            Array.isArray(
                                submissionToUse.mcq_answers.selected_option_ids,
                            )
                        ) {
                            mcqAnswerIds =
                                submissionToUse.mcq_answers.selected_option_ids;
                        } else if (
                            Array.isArray(
                                submissionToUse.mcq_answers.selected_options,
                            )
                        ) {
                            mcqAnswerIds =
                                submissionToUse.mcq_answers.selected_options.map(
                                    (o) => o.id,
                                );
                        }
                    }

                    if (
                        Array.isArray(mcqAnswerIds) &&
                        mcqAnswerIds.length > 0
                    ) {
                        studentActualChoicesIds = mcqAnswerIds;
                        if (currentTestData.test_type === "mcq-multi") {
                            studentActualChoicesIds.forEach((id) => {
                                localSelectedOptionsMap[id] = true;
                            });
                        } else {
                            localSelectedRadioOption =
                                studentActualChoicesIds[0];
                        }
                    }
                }

                if (currentTestData.test_type === "drag-and-drop") {
                    let dndAnswersArray = [];
                    if (
                        answersFromServer &&
                        Array.isArray(answersFromServer.answers)
                    ) {
                        dndAnswersArray = answersFromServer.answers;
                    } else if (
                        Array.isArray(submissionToUse.drag_drop_answers)
                    ) {
                        dndAnswersArray = submissionToUse.drag_drop_answers.map(
                            (a) => ({
                                slot_id: a.slot_id,
                                dropped_option_text: a.dropped_option_text,
                            }),
                        );
                    }
                    if (
                        Array.isArray(dndAnswersArray) &&
                        dndAnswersArray.length > 0
                    ) {
                        dndAnswersArray.forEach((ans) => {
                            if (
                                ans &&
                                typeof ans.slot_id !== "undefined" &&
                                typeof ans.dropped_option_text !== "undefined"
                            ) {
                                const poolItem =
                                    draggableItemsPoolForDisplay.find(
                                        (pItem) =>
                                            pItem.text ===
                                            ans.dropped_option_text,
                                    );
                                filledSlotsForDisplay[ans.slot_id] = poolItem
                                    ? {
                                          id: poolItem.id,
                                          text: ans.dropped_option_text,
                                      }
                                    : {
                                          id: generateUiId(),
                                          text: ans.dropped_option_text,
                                      };
                            }
                        });
                        const selectedTexts = new Set(
                            dndAnswersArray.map((a) => a.dropped_option_text),
                        );
                        draggableItemsPoolForDisplay =
                            draggableItemsPoolForDisplay.filter(
                                (pItem) => !selectedTexts.has(pItem.text),
                            );
                    }
                }

                if (currentTestData.test_type === "word-order") {
                    let submittedOrder = [];
                    if (
                        answersFromServer &&
                        Array.isArray(answersFromServer.submitted_order_words)
                    ) {
                        submittedOrder =
                            answersFromServer.submitted_order_words;
                    } else if (
                        submissionToUse.word_order_answer &&
                        Array.isArray(
                            submissionToUse.word_order_answer
                                .submitted_order_words,
                        )
                    ) {
                        submittedOrder =
                            submissionToUse.word_order_answer
                                .submitted_order_words;
                    }
                    if (
                        Array.isArray(submittedOrder) &&
                        submittedOrder.length > 0
                    ) {
                        currentWordSequence = submittedOrder.map((text) => {
                            const poolItem = dndBasePoolForCurrentTest.find(
                                (p) => p.text === text,
                            );
                            return poolItem
                                ? { id: poolItem.id, text: text }
                                : { id: generateUiId(), text: text };
                        });
                        wordOrderAvailableOptionsInPool =
                            dndBasePoolForCurrentTest.filter(
                                (poolItem) =>
                                    !currentWordSequence.find(
                                        (seqItem) => seqItem.id === poolItem.id,
                                    ),
                            );
                    }
                }

                if (currentTestData.test_type === "free-text") {
                    let answerText = "";
                    if (
                        answersFromServer &&
                        typeof answersFromServer.answer_text === "string"
                    ) {
                        answerText = answersFromServer.answer_text;
                    } else if (
                        submissionToUse.free_text_answer &&
                        typeof submissionToUse.free_text_answer.answer_text ===
                            "string"
                    ) {
                        answerText =
                            submissionToUse.free_text_answer.answer_text;
                    }
                    if (answerText) {
                        localStudentAnswerText = answerText;
                    }
                }
            }
        }

        localSelectedOptionsMap = { ...localSelectedOptionsMap };
        filledSlotsForDisplay = { ...filledSlotsForDisplay };
        currentWordSequence = [...currentWordSequence];
        draggableItemsPoolForDisplay = [...draggableItemsPoolForDisplay];
        wordOrderAvailableOptionsInPool = [...wordOrderAvailableOptionsInPool];
        dndBasePoolForCurrentTest = [...dndBasePoolForCurrentTest];
        localStudentAnswerText = localStudentAnswerText;
    }

    onMount(() => {
        syncStateWithProps(testData, studentSubmission, viewMode, isSubmitting);
    });

    let prevTestDataString = "";
    let prevSubmissionString = "";
    let prevViewModeString = "";
    let prevIsSubmittingForEffect = false;

    $: {
        const sigTest = JSON.stringify(
            testData?.id +
                (testData?.test_type || "") +
                (testData?.mcq_options?.length || 0) +
                (testData?.drag_drop_slots?.length || 0) +
                (testData?.draggable_options_pool?.join(",") || ""),
        );
        const sigSub = JSON.stringify(
            studentSubmission?.id +
                (studentSubmission?.status || "") +
                JSON.stringify(studentSubmission?.answers),
        );
        if (
            sigTest !== prevTestDataString ||
            sigSub !== prevSubmissionString ||
            viewMode !== prevViewModeString ||
            isSubmitting !== prevIsSubmittingForEffect
        ) {
            if (isRefreshing && sigSub !== prevSubmissionString) {
                isRefreshing = false;
            }
            syncStateWithProps(
                testData,
                studentSubmission,
                viewMode,
                isSubmitting,
            );
            prevTestDataString = sigTest;
            prevSubmissionString = sigSub;
            prevViewModeString = viewMode;
            prevIsSubmittingForEffect = isSubmitting;
        }
    }

    async function handleSubmitTest() {
        if (!canStudentInteract) return;

        if (testData.test_type === "ai-conversation") {
            return;
        }

        let answersPayload = {};
        let formIsValid = true;

        if (testData.test_type === "mcq-multi") {
            const selectedIds = Object.keys(localSelectedOptionsMap)
                .filter((id) => localSelectedOptionsMap[id])
                .map((id) => parseInt(id));
            if (selectedIds.length === 0 && viewMode === "student")
                formIsValid = false;
            answersPayload = { selected_option_ids: selectedIds };
        } else if (testData.test_type === "mcq-single") {
            if (localSelectedRadioOption === null && viewMode === "student")
                formIsValid = false;
            answersPayload = {
                selected_option_ids:
                    localSelectedRadioOption !== null
                        ? [parseInt(localSelectedRadioOption)]
                        : [],
            };
        } else if (testData.test_type === "drag-and-drop") {
            const slotAnswers = [];
            let filledCount = 0;
            for (const slot of testData.drag_drop_slots || []) {
                if (filledSlotsForDisplay[slot.id]) {
                    slotAnswers.push({
                        slot_id: slot.id,
                        dropped_option_text:
                            filledSlotsForDisplay[slot.id].text,
                    });
                    filledCount++;
                }
            }
            if (
                filledCount < (testData.drag_drop_slots || []).length &&
                viewMode === "student"
            )
                formIsValid = false;
            answersPayload = { answers: slotAnswers };
        } else if (testData.test_type === "word-order") {
            if (
                currentWordSequence.length === 0 &&
                (testData.word_order_sentence?.correct_ordered_texts || [])
                    .length > 0 &&
                viewMode === "student"
            ) {
                formIsValid = false;
            }
            answersPayload = {
                submitted_order_words: currentWordSequence.map(
                    (item) => item.text,
                ),
            };
        } else if (testData.test_type === "free-text") {
            const trimmedAnswer = localStudentAnswerText.trim();
            if (!trimmedAnswer && viewMode === "student") {
                formIsValid = false;
            }
            answersPayload = { answer_text: trimmedAnswer };
        } else {
            return;
        }

        if (!formIsValid && viewMode === "student") {
            dispatch("notify", {
                type: "warning",
                message: "Пожалуйста, дайте ответ на все части задания.",
            });
            return;
        }
        isSubmitting = true;
        await tick();
        dispatch("submitTest", {
            testId: testData.id,
            sectionItemId,
            answers: answersPayload,
            fileData: null,
        });
    }

    function setupSubmissionSocket(submissionId) {
        if (!submissionId) return;

        closeSocket();

        const wsUrl = `${WS_SUBMISSION_BASE_URL}/ws/submission/${submissionId}/`;
        console.log("Connecting to WebSocket:", wsUrl);

        try {
            submissionSocket = new WebSocket(wsUrl);

            submissionSocket.onopen = () => {
                console.log(
                    "WebSocket connected for submission:",
                    submissionId,
                );
            };

            submissionSocket.onmessage = (event) => {
                handleSocketMessage(event);
            };

            submissionSocket.onerror = (error) => {
                console.error("WebSocket error:", error);
            };

            submissionSocket.onclose = () => {
                console.log("WebSocket closed for submission:", submissionId);
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
        }
    }

    function closeSocket() {
        if (submissionSocket) {
            submissionSocket.close();
            submissionSocket = null;
        }
    }

    function handleSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log("Received WebSocket message:", data);

            const submissionData = data.submission || data;

            if (
                submissionData.status ||
                submissionData.score !== undefined ||
                submissionData.feedback
            ) {
                studentSubmission = {
                    ...studentSubmission,
                    ...submissionData,
                };

                if (isRefreshing) {
                    isRefreshing = false;
                }

                dispatch("submissionUpdated", {
                    submission: studentSubmission,
                    sectionItemId,
                });
            }
        } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
        }
    }

    import { onDestroy } from "svelte";
    onDestroy(() => {
        closeSocket();
    });
</script>

<div
    class="test-item-display-wrapper"
    data-testid={"test-item-" + (testData?.id || "unknown")}
    aria-labelledby={"test-title-" + (testData?.id || "unknown")}
>
    <h4 class="test-title" id={"test-title-" + (testData?.id || "unknown")}>
        {testData?.title || "Тест"}
    </h4>
    {#if testData?.description}
        <div class="test-description">
            {@html testData.description.replace(/\n/g, "<br>")}
        </div>
    {/if}

    {#if testData?.attached_image_details}
        <div class="test-attachment test-attached-image">
            <ImageItemDisplay
                contentDetails={testData.attached_image_details}
            />
        </div>
    {/if}
    {#if testData?.attached_audio_details}
        <div class="test-attachment test-attached-audio">
            <AudioItemDisplay
                contentDetails={testData.attached_audio_details}
            />
        </div>
    {/if}

    <form
        class="test-form-display"
        on:submit|preventDefault={handleSubmitTest}
        aria-live="polite"
    >
        {#if testData?.test_type === "mcq-single" || testData?.test_type === "mcq-multi"}
            <McqTestDisplay
                {testData}
                {sectionItemId}
                {viewMode}
                {studentActualChoicesIds}
                {canStudentInteract}
                bind:localSelectedOptionsMap
                bind:localSelectedRadioOption
                isTestSubmittedByStudent={shouldRevealAnswers}
                on:update:localSelectedOptionsMap={updateLocalSelectedOptionsMap}
                on:update:localSelectedRadioOption={updateLocalSelectedRadioOption}
                on:testReset={handleTestReset}
            />
        {:else if testData?.test_type === "drag-and-drop"}
            <DragDropTestDisplay
                {testData}
                {sectionItemId}
                {viewMode}
                {canStudentInteract}
                bind:draggableItemsPoolForDisplay
                bind:filledSlotsForDisplay
                bind:selectedDraggableOptionForSlot
                isTestSubmittedByStudent={shouldRevealAnswers}
                {studentSubmission}
                on:update:draggableItemsPoolForDisplay={updateDraggableItemsPoolForDisplay}
                on:update:filledSlotsForDisplay={updateFilledSlotsForDisplay}
                on:update:selectedDraggableOptionForSlot={updateSelectedDraggableOptionForSlot}
                on:testReset={handleTestReset}
            />
        {:else if testData?.test_type === "word-order"}
            <WordOrderTestDisplay
                {testData}
                {sectionItemId}
                {viewMode}
                {canStudentInteract}
                bind:currentWordSequence
                bind:wordOrderAvailableOptionsInPool
                {dndBasePoolForCurrentTest}
                isTestSubmittedByStudent={shouldRevealAnswers}
                on:update:currentWordSequence={updateCurrentWordSequence}
                on:update:wordOrderAvailableOptionsInPool={updateWordOrderAvailableOptionsInPool}
                on:testReset={handleTestReset}
            />
        {:else if testData?.test_type === "free-text"}
            <FreeTextTestDisplay
                {testData}
                {sectionItemId}
                {viewMode}
                {canStudentInteract}
                isTestSubmittedByStudent={shouldRevealAnswers}
                studentAnswerText={localStudentAnswerText}
                on:update:studentAnswerText={updateLocalStudentAnswerText}
                on:testReset={handleTestReset}
            />
        {:else if testData?.test_type === "ai-conversation"}
            <AiConversationTestDisplay
                bind:this={aiConversationComponent}
                {testData}
                {sectionItemId}
                {viewMode}
                {canStudentInteract}
                on:stateChange={handleAiConversationStateChange}
                on:submissionUpdate={handleAiConversationSubmission}
            />
        {/if}

        {#if canStudentInteract}
            {#if testData?.test_type !== "ai-conversation"}
                <div class="test-actions-display">
                    <button
                        type="submit"
                        class="btn-submit-test-display"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Отправка..." : "Отправить ответ"}
                    </button>
                </div>
            {/if}
        {/if}

        {#if viewMode === "student" && studentSubmission}
            <div
                class="submission-result-display status-{studentSubmission.status.toLowerCase()}"
            >
                <div class="result-header">
                    <h4>Результаты:</h4>
                    <button
                        class="btn-refresh-status"
                        on:click={refreshSubmissionStatus}
                        disabled={isRefreshing}
                        title="Обновить статус проверки"
                    >
                        <Refresh
                            class={isRefreshing ? "rotating" : ""}
                            size="20px"
                        />
                    </button>
                </div>
                <p>
                    Статус:
                    <strong>
                        {studentSubmission.status === "graded"
                            ? "Оценено"
                            : studentSubmission.status === "auto_passed" ||
                                studentSubmission.status === "auto_correct"
                              ? "Зачтено"
                              : studentSubmission.status === "auto_failed" ||
                                  studentSubmission.status === "auto_incorrect"
                                ? "Не зачтено"
                                : studentSubmission.status === "grading_pending"
                                  ? "На проверке"
                                  : "Отправлено"}
                    </strong>
                </p>
                {#if typeof studentSubmission.score === "number"}
                    <p>Оценка: <strong>{studentSubmission.score}</strong></p>
                {/if}
                {#if studentSubmission.feedback}
                    <p class="feedback-text">
                        Комментарий: <strong
                            >{@html studentSubmission.feedback.replace(
                                /\n/g,
                                "<br>",
                            )}</strong
                        >
                    </p>
                {/if}
            </div>
        {/if}
        {#if viewMode === "admin" && studentSubmission}
            <div
                class="submission-result-display admin-view status-{studentSubmission.status.toLowerCase()}"
            >
                <h4>Ответ студента (ID отправки: {studentSubmission.id}):</h4>
                <p>
                    Статус: <strong>{studentSubmission.status}</strong>. Оценка:
                    <strong
                        >{typeof studentSubmission.score === "number"
                            ? studentSubmission.score
                            : "N/A"}</strong
                    >
                </p>
            </div>
        {/if}
    </form>
</div>

<style>
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
    .test-item-display-wrapper {
        background-color: #fff;
        border: 1px solid #e7eaf3;
        border-radius: 12px;
        padding: clamp(15px, 3vw, 25px);
        margin-bottom: 25px;
        box-shadow: 0 4px 12px
            rgba(var(--color-primary-rgb, 175, 164, 255), 0.07);
    }
    .test-title {
        font-size: clamp(1.25em, 3vw, 1.6em);
        font-weight: 700;
        color: var(--color-text-dark);
        margin-top: 0;
        margin-bottom: 10px;
    }
    .test-description {
        font-size: clamp(0.9em, 2.2vw, 1em);
        color: var(--color-text-muted);
        margin-bottom: 20px;
        line-height: 1.7;
    }
    .test-attachment {
        margin-bottom: 20px;
        border-radius: 8px;
        overflow: hidden;
    }
    .test-attachment :global(.image-item-display),
    .test-attachment :global(.audio-item-display-enhanced) {
        border: none;
        box-shadow: none;
        margin-bottom: 0;
        padding: 0;
    }
    .test-form-display {
        margin-top: 15px;
    }

    .test-actions-display {
        margin-top: 25px;
        text-align: right;
    }
    .btn-submit-test-display {
        background-color: var(--color-primary, #afa4ff);
        color: white;
        padding: 10px 22px;
        border: none;
        border-radius: 25px;
        font-weight: 500;
        cursor: pointer;
        transition:
            background-color 0.2s ease,
            transform 0.1s ease;
        font-size: 0.95rem;
    }
    .btn-submit-test-display:hover:not(:disabled) {
        background-color: var(--color-primary-dark, #8679f0);
    }
    .btn-submit-test-display:active:not(:disabled) {
        transform: translateY(1px);
    }
    .btn-submit-test-display:disabled {
        background-color: #ccc;
        cursor: not-allowed;
        opacity: 0.8;
    }

    .btn-start-conversation {
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
        color: white;
        width: 56px;
        height: 56px;
        border: none;
        border-radius: 50%;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
    }
    .btn-start-conversation:hover:not(:disabled) {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
    }
    .btn-start-conversation:active:not(:disabled) {
        transform: translateY(0);
    }
    .btn-start-conversation:disabled {
        background: #ccc;
        cursor: not-allowed;
        opacity: 0.6;
        box-shadow: none;
    }

    .submission-result-display {
        margin-top: 25px;
        padding: 15px 20px;
        background-color: #f8f6ff;
        border: 1px solid #d1c9ff;
        border-radius: 12px;
    }
    .submission-result-display h4 {
        margin-top: 0;
        margin-bottom: 12px;
        color: #5845d8;
        font-size: 1.1em;
    }
    .submission-result-display p {
        margin-bottom: 8px;
        font-size: 0.95em;
    }
    .submission-result-display strong {
        font-weight: 600;
    }
    .submission-result-display.status-auto_passed strong,
    .submission-result-display.status-graded strong,
    .submission-result-display.status-auto_correct strong {
        color: #27ae60;
    }
    .submission-result-display.status-auto_failed strong,
    .submission-result-display.status-auto_incorrect strong {
        color: #e74c3c;
    }
    .submission-result-display.status-grading_pending strong,
    .submission-result-display.status-submitted strong {
        color: #6d7fc9;
    }
    .submission-result-display .feedback-text strong {
        color: #343a40;
        font-weight: normal;
        display: block;
        margin-top: 4px;
        padding: 8px;
        background-color: #fff;
        border-radius: 4px;
    }
    .submission-result-display.admin-view {
        background-color: #e9ecef;
        border-color: #ced4da;
    }
    .submission-result-display.admin-view h4 {
        color: #495057;
    }

    .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .result-header h4 {
        margin-bottom: 0;
    }

    .btn-refresh-status {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary, #afa4ff);
        transition:
            background-color 0.2s ease,
            transform 0.2s ease;
    }

    .btn-refresh-status:hover:not(:disabled) {
        background-color: rgba(var(--color-primary-rgb, 175, 164, 255), 0.1);
    }

    .btn-refresh-status:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .rotating {
        animation: spin 1s linear infinite;
    }

    .test-attachment {
        margin-bottom: 20px;
        text-align: center;
    }

    .test-attached-image {
        max-width: min(70%, 500px);
        margin: 0 auto 20px;
    }

    .test-attached-image :global(img) {
        border-radius: var(--spacing-border-radius-block, 12px);
    }
</style>
