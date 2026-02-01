

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
        attached_audio_id = null,
        attached_image = null,
        attached_audio = null
    }) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.test_type = test_type;
        this.attached_image_id = attached_image_id || attached_image;
        this.attached_audio_id = attached_audio_id || attached_audio;
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
    constructor(data = {}) {
        const {
            free_text_question = {},
            ...baseData
        } = data;
        super({ ...baseData, test_type: 'free-text' });

        this.free_text_question = {
            reference_answer: free_text_question.reference_answer || data.reference_answer || "",
            explanation: free_text_question.explanation || data.explanation || "",
            prompt_text: free_text_question.prompt_text || data.prompt_text || "",
            prompt_image_file: free_text_question.prompt_image_file || data.prompt_image_file || null,
            prompt_audio_file: free_text_question.prompt_audio_file || data.prompt_audio_file || null,
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
        prompt_image = null,
        prompt_audio = null,
        correct_answer_text = "",
        explanation = "",
        order = 0
    }) {
        this.id = id;
        this.prompt_text = prompt_text;
        this.prompt_image_file = prompt_image_file;
        this.prompt_audio_file = prompt_audio_file;
        this.prompt_image_id = prompt_image || (prompt_image_file && typeof prompt_image_file === 'number' ? prompt_image_file : null);
        this.prompt_audio_id = prompt_audio || (prompt_audio_file && typeof prompt_audio_file === 'number' ? prompt_audio_file : null);
        this.correct_answer_text = correct_answer_text;
        this.explanation = explanation;
        this.order = order;
    }

    toPayload() {
        const payload = {
            prompt_text: this.prompt_text,
            prompt_image: this.prompt_image_id,
            prompt_audio: this.prompt_audio_id,
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
    constructor(data = {}) {
        const {
            draggable_options_pool = [],
            ...baseData
        } = data;
        super({ ...baseData, test_type: 'word-order' });

        const word_order_sentence = data.word_order_sentence || {};
        const wos = word_order_sentence.correct_ordered_texts ? word_order_sentence : (data.word_order_sentence_details || {});

        // Handle both nested and flat formats
        const correct_ordered_texts = wos.correct_ordered_texts || data.correct_ordered_texts || [];
        const display_prompt = wos.display_prompt || data.display_prompt || "";
        const explanation = wos.explanation || data.explanation || "";

        this.word_order_sentence = {
            correct_ordered_texts: Array.isArray(correct_ordered_texts) ? [...correct_ordered_texts] : [],
            display_prompt: display_prompt,
            explanation: explanation,
        };
        this.draggable_options_pool = Array.isArray(draggable_options_pool) ? [...draggable_options_pool] : (data.draggable_options_pool || []);
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
function _normalizeBackgroundImageId(val) {
    if (val == null) return null;
    if (typeof val === 'number' && Number.isInteger(val)) return val;
    if (typeof val === 'object' && val != null && typeof val.id === 'number') return val.id;
    return null;
}

export class AiConversationTestModel extends BaseTestModel {
    constructor(data = {}) {
        const { ai_conversation_question = {}, ...baseData } = data;
        super({ ...baseData, test_type: 'ai-conversation' });

        const rawBg = ai_conversation_question.background_image ?? data.background_image;
        const bgId = _normalizeBackgroundImageId(rawBg) ?? _normalizeBackgroundImageId(ai_conversation_question.background_image_details ?? data.background_image_details);

        const dictionaries = ai_conversation_question.dictionaries || data.dictionaries || [];
        const dictionariesDetails = ai_conversation_question.dictionaries_details || data.dictionaries_details || [];

        let normalizedDictionaries = [];
        if (Array.isArray(dictionaries)) {
            normalizedDictionaries = dictionaries.map(item => {
                return typeof item === 'object' && item !== null && 'id' in item ? item.id : item;
            }).filter(id => id != null && id !== undefined);
        }

        this.ai_conversation_question = {
            context: ai_conversation_question.context || data.context || "",
            personality: ai_conversation_question.personality || data.personality || "",
            goodbye_condition: ai_conversation_question.goodbye_condition || data.goodbye_condition || "",
            background_image: bgId,
            background_image_details: ai_conversation_question.background_image_details || data.background_image_details || null,
            dictionaries: normalizedDictionaries,
            dictionaries_details: Array.isArray(dictionariesDetails) ? dictionariesDetails : [],
        };
    }

    toPayload() {
        const payload = super.toPayload();
        const bgId = _normalizeBackgroundImageId(this.ai_conversation_question.background_image);

        let dictionariesIds = [];
        if (Array.isArray(this.ai_conversation_question.dictionaries)) {
            dictionariesIds = this.ai_conversation_question.dictionaries.map(item => {
                return typeof item === 'object' && item !== null && 'id' in item ? item.id : item;
            }).filter(id => id != null);
        }

        payload.ai_conversation_question = {
            context: this.ai_conversation_question.context,
            personality: this.ai_conversation_question.personality,
            goodbye_condition: this.ai_conversation_question.goodbye_condition,
            background_image: bgId,
            dictionaries: dictionariesIds,
        };
        return payload;
    }
}
