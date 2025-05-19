// src/models/testTypes.js

/**
 * Базовый класс для всех типов тестов (для наследования или как интерфейс).
 */
export class BaseTestModel {
    /**
     * @param {object} data - Начальные данные для теста.
     * @param {string} data.title - Название теста.
     * @param {string} [data.description=""] - Описание/инструкция.
     * @param {string} data.test_type - Тип теста (e.g., 'mcq-single').
     * @param {number|null} [data.attached_image_id=null] - ID прикрепленного ImageMaterial.
     * @param {number|null} [data.attached_audio_id=null] - ID прикрепленного AudioMaterial.
     * @param {number|null} [data.id=null] - ID существующего теста (для редактирования).
     */
    constructor({
        id = null,
        title,
        description = "",
        test_type,
        attached_image_id = null,
        attached_audio_id = null
    }) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.test_type = test_type;
        this.attached_image_id = attached_image_id;
        this.attached_audio_id = attached_audio_id;
    }

    /**
     * Преобразует модель в объект, готовый для отправки на API (для создания/обновления).
     * @returns {Object} Полезная нагрузка для API.
     */
    toPayload() {
        const payload = {
            title: this.title,
            description: this.description,
            test_type: this.test_type,
            attached_image: this.attached_image_id, // Бэкенд ожидает attached_image, а не _id
            attached_audio: this.attached_audio_id, // Бэкенд ожидает attached_audio
        };
        if (this.id) { // Для обновления существующего теста
            // payload.id = this.id; // ID передается в URL, а не в теле
        }
        return payload;
    }
}

export class MCQOptionModel {
    /**
     * @param {object} data
     * @param {string} data.text - Текст варианта.
     * @param {boolean} [data.is_correct=false] - Правильный ли.
     * @param {string} [data.explanation=""] - Пояснение.
     * @param {number} [data.order=0] - Порядок.
     * @param {number|null} [data.id=null] - ID существующей опции.
     */
    constructor({ id = null, text, is_correct = false, explanation = "", order = 0 }) {
        this.id = id; // null для новых, ID для существующих
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
        if (this.id) {
            payload.id = this.id; // Передаем ID для обновления/удаления существующих
        }
        return payload;
    }
}

export class MCQTestModel extends BaseTestModel {
    /**
     * @param {object} data - Начальные данные (см. BaseTestModel).
     * @param {Array<MCQOptionModel|object>} [data.mcq_options=[]] - Массив вариантов ответа.
     */
    constructor({ mcq_options = [], ...baseData }) {
        super(baseData); // test_type должен быть 'mcq-single' или 'mcq-multi'
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

export class FreeTextTestModel extends BaseTestModel {
    /**
     * @param {object} data - Начальные данные.
     * @param {string} [data.reference_answer=""] - Эталонный ответ.
     * @param {string} [data.explanation=""] - Пояснение к заданию.
     */
    constructor({ reference_answer = "", explanation = "", ...baseData }) {
        super({ ...baseData, test_type: 'free-text' });
        this.free_text_question = { // Соответствует FreeTextQuestionSerializer на бэке
            reference_answer: reference_answer,
            explanation: explanation,
        };
    }

    toPayload() {
        const payload = super.toPayload();
        payload.free_text_question = this.free_text_question;
        return payload;
    }
}

export class WordOrderTestModel extends BaseTestModel {
    /**
     * @param {object} data
     * @param {Array<string>} [data.correct_order_words=[]] - Слова в правильном порядке.
     * @param {Array<string>} [data.distractor_words=[]] - Лишние слова.
     * @param {string} [data.display_prompt=""] - Подсказка.
     * @param {string} [data.explanation=""] - Пояснение.
     */
    constructor({ correct_order_words = [], distractor_words = [], display_prompt = "", explanation = "", ...baseData }) {
        super({ ...baseData, test_type: 'word-order' });
        this.word_order_sentence = { // Соответствует WordOrderSentenceSerializer
            correct_order_words: correct_order_words,
            distractor_words: distractor_words,
            display_prompt: display_prompt,
            explanation: explanation,
        };
    }

    toPayload() {
        const payload = super.toPayload();
        payload.word_order_sentence = this.word_order_sentence;
        return payload;
    }
}


export class MatchingPairModel {
    /**
     * @param {object} data
     * @param {string|null} [data.prompt_text=null]
     * @param {number|null} [data.prompt_image_id=null] - ID ImageMaterial
     * @param {number|null} [data.prompt_audio_id=null] - ID AudioMaterial
     * @param {string} data.correct_answer_text - Текст правильного "облачка".
     * @param {string} [data.explanation=""] - Пояснение.
     * @param {number} [data.order=0]
     * @param {number|null} [data.id=null]
     */
    constructor({ id = null, prompt_text = null, prompt_image_id = null, prompt_audio_id = null, correct_answer_text, explanation = "", order = 0 }) {
        this.id = id;
        this.prompt_text = prompt_text;
        this.prompt_image_id = prompt_image_id; // Связь с материалами
        this.prompt_audio_id = prompt_audio_id; // Связь с материалами
        this.correct_answer_text = correct_answer_text;
        this.explanation = explanation;
        this.order = order;
    }
    toPayload() {
        const payload = {
            prompt_text: this.prompt_text,
            // На бэке MatchingPairSerializer ожидает prompt_image (ID), а не prompt_image_id
            prompt_image: this.prompt_image_id,
            prompt_audio: this.prompt_audio_id,
            correct_answer_text: this.correct_answer_text,
            explanation: this.explanation,
            order: this.order,
        };
        if (this.id) payload.id = this.id;
        return payload;
    }
}

export class MatchingDistractorModel {
    constructor({ id = null, distractor_text }) {
        this.id = id;
        this.distractor_text = distractor_text;
    }
    toPayload() {
        const payload = { distractor_text: this.distractor_text };
        if (this.id) payload.id = this.id;
        return payload;
    }
}

export class MatchingTestModel extends BaseTestModel {
    /**
     * @param {object} data
     * @param {Array<MatchingPairModel|object>} [data.matching_pairs=[]]
     * @param {Array<MatchingDistractorModel|object>} [data.matching_distractors=[]]
     */
    constructor({ matching_pairs = [], matching_distractors = [], ...baseData }) {
        super({ ...baseData, test_type: 'matching' });
        this.matching_pairs = matching_pairs.map(p => p instanceof MatchingPairModel ? p : new MatchingPairModel(p));
        this.matching_distractors = matching_distractors.map(d => d instanceof MatchingDistractorModel ? d : new MatchingDistractorModel(d));
    }
    toPayload() {
        const payload = super.toPayload();
        payload.matching_pairs = this.matching_pairs.map(p => p.toPayload());
        payload.matching_distractors = this.matching_distractors.map(d => d.toPayload());
        return payload;
    }
}

export class PronunciationTestModel extends BaseTestModel {
    /**
     * @param {object} data
     * @param {string} [data.text_to_pronounce=""]
     * @param {string} [data.explanation=""]
     */
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

export class SpellingTestModel extends BaseTestModel {
    /**
     * @param {object} data
     * @param {string} [data.reference_spelling=""] - Эталонное написание.
     * @param {string} [data.explanation=""]
     */
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

export class DraggableItemModel {
    /**
     * @param {object} data
     * @param {string|number|null} [data.id=null] - ID существующего элемента (число) или временный (строка)
     * @param {string} data.text - Текст на облачке
     * @param {boolean} [data.is_distractor=false] - Является ли лишним
     */
    constructor({ id = null, text = "", is_distractor = false }) {
        this.id = id; // Может быть числом (с сервера) или строкой (временный на клиенте)
        this.text = text;
        this.is_distractor = is_distractor;
    }

    toPayload() {
        const payload = {
            text: this.text,
            is_distractor: this.is_distractor,
        };
        // ID передаем только если он не временный (не строка) и не null
        if (this.id !== null && typeof this.id === 'number') {
            payload.id = this.id;
        }
        return payload;
    }
}

export class SentenceOrderSlotModel {
    /**
     * @param {object} data
     * @param {string|number|null} [data.id=null]
     * @param {string|number} data.correct_item_id - ID DraggableItem, который должен быть здесь
     * @param {number} [data.order=0]
     * @param {string} [data.prompt_text=""] - Опциональная подсказка для слота
     */
    constructor({ id = null, correct_item_id = null, order = 0, prompt_text = "" }) {
        this.id = id;
        this.correct_item_id = correct_item_id; // Ссылка на ID DraggableItemModel
        this.order = order;
        this.prompt_text = prompt_text;
        // На фронте может быть полезно хранить и сам объект correct_item для удобства
        this.correct_item_text_preview = ""; // Будет заполнено в форме для отображения
    }

    toPayload() {
        const payload = {
            correct_item_id: this.correct_item_id,
            order: this.order,
            prompt_text: this.prompt_text,
        };
        if (this.id !== null && typeof this.id === 'number') {
            payload.id = this.id;
        }
        return payload;
    }
}

export class MatchTargetModel {
    /**
     * @param {object} data
     * @param {string|number|null} [data.id=null]
     * @param {string|null} [data.prompt_text=null]
     * @param {number|null} [data.prompt_image_id=null] - ID ImageMaterial
     * @param {number|null} [data.prompt_audio_id=null] - ID AudioMaterial
     * @param {string|number} data.correct_item_id - ID DraggableItem
     * @param {number} [data.order=0]
     * @param {string} [data.explanation=""]
     */
    constructor({ 
        id = null, prompt_text = null, prompt_image_id = null, prompt_audio_id = null, 
        correct_item_id = null, order = 0, explanation = "" 
    }) {
        this.id = id;
        this.prompt_text = prompt_text;
        this.prompt_image_id = prompt_image_id;
        this.prompt_audio_id = prompt_audio_id;
        this.correct_item_id = correct_item_id;
        this.order = order;
        this.explanation = explanation;
        this.correct_item_text_preview = ""; // Для отображения в форме
        // Плюс детали для превью промптов, если нужно будет их показывать в форме
        this.prompt_image_details = null; 
        this.prompt_audio_details = null;
    }

    toPayload() {
        const payload = {
            prompt_text: this.prompt_text,
            prompt_image_id: this.prompt_image_id, // На бэке это может быть prompt_image
            prompt_audio_id: this.prompt_audio_id, // На бэке это может быть prompt_audio
            correct_item_id: this.correct_item_id,
            order: this.order,
            explanation: this.explanation,
        };
        if (this.id !== null && typeof this.id === 'number') {
            payload.id = this.id;
        }
        return payload;
    }
}


// --- Обновленные модели тестов ---

export class SentenceOrderTestModel extends BaseTestModel {
    /**
     * @param {object} data - Начальные данные (см. BaseTestModel).
     * @param {Array<SentenceOrderSlotModel|object>} [data.sentence_order_slots=[]]
     * @param {Array<DraggableItemModel|object>} [data.draggable_items=[]] - Все доступные облачка
     */
    constructor({ sentence_order_slots = [], draggable_items = [], ...baseData }) {
        super({ ...baseData, test_type: 'sentence-order' });
        this.sentence_order_slots = sentence_order_slots.map(slot => 
            slot instanceof SentenceOrderSlotModel ? slot : new SentenceOrderSlotModel(slot)
        );
        this.draggable_items = draggable_items.map(item => 
            item instanceof DraggableItemModel ? item : new DraggableItemModel(item)
        );
    }

    toPayload() {
        const payload = super.toPayload();
        payload.sentence_order_slots = this.sentence_order_slots.map(slot => slot.toPayload());
        payload.draggable_items = this.draggable_items.map(item => item.toPayload());
        return payload;
    }
}

export class DragToMatchTestModel extends BaseTestModel {
    /**
     * @param {object} data - Начальные данные.
     * @param {Array<MatchTargetModel|object>} [data.match_targets=[]]
     * @param {Array<DraggableItemModel|object>} [data.draggable_items=[]] - Все доступные облачка
     */
    constructor({ match_targets = [], draggable_items = [], ...baseData }) {
        super({ ...baseData, test_type: 'drag-to-match' });
        this.match_targets = match_targets.map(target => 
            target instanceof MatchTargetModel ? target : new MatchTargetModel(target)
        );
        this.draggable_items = draggable_items.map(item => 
            item instanceof DraggableItemModel ? item : new DraggableItemModel(item)
        );
    }

    toPayload() {
        const payload = super.toPayload();
        payload.match_targets = this.match_targets.map(target => target.toPayload());
        payload.draggable_items = this.draggable_items.map(item => item.toPayload());
        return payload;
    }
}