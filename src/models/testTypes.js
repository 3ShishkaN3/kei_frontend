

/**
 * Базовый класс для всех типов тестов.
 */
export class BaseTestModel {
    constructor({
        id = null,
        title = "",
        description = "",
        test_type,
        attached_image_id = null,
        attached_audio_id = null
        // aspect_ratio_for_test_image = null
    }) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.test_type = test_type;
        this.attached_image_id = attached_image_id;
        this.attached_audio_id = attached_audio_id;
        // this.aspect_ratio_for_test_image = aspect_ratio_for_test_image;
    }

    toPayload() {
        const payload = {
            title: this.title,
            description: this.description,
            test_type: this.test_type,
            attached_image: this.attached_image_id,
            attached_audio: this.attached_audio_id,
            // aspect_ratio_for_test_image: this.aspect_ratio_for_test_image,
        };
        return payload;
    }
}

/**
 * Модель для опции в MCQ тесте.
 */
export class MCQOptionModel {
    constructor({ id = null, text = "", is_correct = false, explanation = "", order = 0 }) {
        this.id = id;
        this.text = text;
        this.is_correct = is_correct;
        this.explanation = explanation;
        this.order = order;
    }

    toPayload() {
        const payload = {
            text: this.text,
            is_correct: this.is_correct,
            explanation: this.explanation,
            order: this.order,
        };
        if (this.id && typeof this.id !== 'string' || (typeof this.id === 'string' && !this.id.startsWith('temp_'))) {
            payload.id = this.id;
        }
        return payload;
    }
}

/**
 * Модель для MCQ тестов.
 */
export class MCQTestModel extends BaseTestModel {
    constructor({ mcq_options = [], ...baseData }) {
        super(baseData);
        this.mcq_options = mcq_options.map(opt => opt instanceof MCQOptionModel ? opt : new MCQOptionModel(opt));
    }

    addOption(optionData) {
        this.mcq_options.push(new MCQOptionModel(optionData));
    }

    removeOption(index) {
        this.mcq_options.splice(index, 1);
    }

    toPayload() {
        const payload = super.toPayload();
        payload.mcq_options = this.mcq_options.map(opt => opt.toPayload());
        return payload;
    }
}

/**
 * Модель для теста со свободным текстовым ответом.
 */
export class FreeTextTestModel extends BaseTestModel {
    constructor({
        reference_answer = "",
        explanation = "",
        prompt_text = "",
        prompt_image_file = null,
        prompt_audio_file = null,
        ...baseData
    }) {
        super({ ...baseData, test_type: 'free-text' });
        this.free_text_question = {
            reference_answer: reference_answer,
            explanation: explanation,
            prompt_text: prompt_text,
            prompt_image_file: prompt_image_file,
            prompt_audio_file: prompt_audio_file,
        };
    }

    toPayload() {
        const payload = super.toPayload();
        payload.free_text_question = this.free_text_question;
        return payload;
    }
}

/**
 * Модель для слота/ячейки в Drag-and-Drop тесте
 */
export class DragDropSlotModel {
    constructor({
        id = null,
        prompt_text = "",
        prompt_image_file = null,
        prompt_audio_file = null,
        correct_answer_text = "",
        explanation = "",
        order = 0
    }) {
        this.id = id;
        this.prompt_text = prompt_text;
        this.prompt_image_file = prompt_image_file;
        this.prompt_audio_file = prompt_audio_file;
        this.correct_answer_text = correct_answer_text;
        this.explanation = explanation;
        this.order = order;
    }

    toPayload() {
        const payload = {
            prompt_text: this.prompt_text,
            prompt_image_file: null, // Файл передается отдельно в multipart/form-data
            prompt_audio_file: null, // Файл передается отдельно в multipart/form-data
            correct_answer_text: this.correct_answer_text,
            explanation: this.explanation,
            order: this.order,
        };
        if (this.id && typeof this.id !== 'string' || (typeof this.id === 'string' && !this.id.startsWith('temp_'))) {
            payload.id = this.id;
        }
        return payload;
    }
}

/**
 * Модель для Drag-and-Drop теста.
 */
export class DragDropTestModel extends BaseTestModel {
    constructor({
        draggable_options_pool = [],
        drag_drop_slots = [],
        ...baseData
    }) {
        super({ ...baseData, test_type: 'drag-and-drop' });
        this.draggable_options_pool = Array.isArray(draggable_options_pool) ? [...draggable_options_pool] : [];
        this.drag_drop_slots = drag_drop_slots.map(slot => slot instanceof DragDropSlotModel ? slot : new DragDropSlotModel(slot));
    }

    addOptionToPool(optionText) {
        if (optionText && !this.draggable_options_pool.includes(optionText)) {
            this.draggable_options_pool.push(optionText);
        }
    }
    removeOptionFromPool(optionText) {
        this.draggable_options_pool = this.draggable_options_pool.filter(opt => opt !== optionText);
        this.drag_drop_slots.forEach(slot => {
            if (slot.correct_answer_text === optionText) {
                slot.correct_answer_text = "";
            }
        });
    }
    addSlot(slotData = {}) {
        this.drag_drop_slots.push(new DragDropSlotModel(slotData));
    }
    removeSlot(index) {
        this.drag_drop_slots.splice(index, 1);
    }

    toPayload() {
        const payload = super.toPayload();
        payload.draggable_options_pool = [...this.draggable_options_pool];
        payload.drag_drop_slots = this.drag_drop_slots.map(slot => slot.toPayload());
        return payload;
    }
}


/**
 * Модель для теста на порядок слов
 */
export class WordOrderTestModel extends BaseTestModel {
    constructor({
        correct_ordered_texts = [],
        display_prompt = "",
        explanation = "",
        draggable_options_pool = [],
        ...baseData
    }) {
        super({ ...baseData, test_type: 'word-order' });
        this.word_order_sentence = {
            correct_ordered_texts: Array.isArray(correct_ordered_texts) ? [...correct_ordered_texts] : [],
            display_prompt: display_prompt,
            explanation: explanation,
        };
        this.draggable_options_pool = Array.isArray(draggable_options_pool) ? [...draggable_options_pool] : [];
    }

    addOptionToPool(optionText) {
        if (optionText && !this.draggable_options_pool.includes(optionText)) {
            this.draggable_options_pool.push(optionText);
        }
    }
    removeOptionFromPool(optionText) {
        this.draggable_options_pool = this.draggable_options_pool.filter(opt => opt !== optionText);
        this.word_order_sentence.correct_ordered_texts = this.word_order_sentence.correct_ordered_texts.filter(txt => txt !== optionText);
    }


    toPayload() {
        const payload = super.toPayload();
        payload.word_order_sentence = { ...this.word_order_sentence };
        payload.draggable_options_pool = [...this.draggable_options_pool];
        return payload;
    }
}


/**
 * Модель для теста на произношение.
 */
export class PronunciationTestModel extends BaseTestModel {
    constructor({ text_to_pronounce = "", explanation = "", ...baseData }) {
        super({ ...baseData, test_type: 'pronunciation' });
        this.pronunciation_question = {
            text_to_pronounce: text_to_pronounce,
            explanation: explanation,
        };
    }
    toPayload() {
        const payload = super.toPayload();
        payload.pronunciation_question = this.pronunciation_question;
        return payload;
    }
}

/**
 * Модель для теста на правописание.
 */
export class SpellingTestModel extends BaseTestModel {
    constructor({ reference_spelling = "", explanation = "", ...baseData }) {
        super({ ...baseData, test_type: 'spelling' });
        this.spelling_question = {
            reference_spelling: reference_spelling,
            explanation: explanation,
        };
    }
    toPayload() {
        const payload = super.toPayload();
        payload.spelling_question = this.spelling_question;
        return payload;
    }
}

/**
 * Модель для AI Conversation теста ("Кайва с сенсеем")
 */
export class AiConversationTestModel extends BaseTestModel {
    constructor(data = {}) {
        const { ai_conversation_question = {}, ...baseData } = data;
        super({ ...baseData, test_type: 'ai-conversation' });

        // Handle flattened or nested input
        this.ai_conversation_question = {
            context: ai_conversation_question.context || data.context || "",
            personality: ai_conversation_question.personality || data.personality || "",
            goodbye_condition: ai_conversation_question.goodbye_condition || data.goodbye_condition || "",
            background_image: ai_conversation_question.background_image || data.background_image || null,
            background_image_details: ai_conversation_question.background_image_details || data.background_image_details || null,
        };
    }

    toPayload() {
        const payload = super.toPayload();
        // Remove internal details before sending payload if necessary, 
        // but typically the backend serializer handles it or we send just IDs.
        // For the creation payload, we send what the backend expects in 'ai_conversation_question'
        payload.ai_conversation_question = {
            context: this.ai_conversation_question.context,
            personality: this.ai_conversation_question.personality,
            goodbye_condition: this.ai_conversation_question.goodbye_condition,
            background_image: this.ai_conversation_question.background_image
        };
        return payload;
    }
}
