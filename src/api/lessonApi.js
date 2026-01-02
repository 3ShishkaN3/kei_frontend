// src/api/lessonApi.js
import { API_BASE_URL } from '../config';
import { apiFetch } from './api'; // Предполагаем, что apiFetch уже существует и обрабатывает CSRF, JSON/FormData

// --- Хелперы для URL ---
const coursesBaseUrl = `${API_BASE_URL}/courses`;
const materialsBaseUrl = `${API_BASE_URL}/materials`;
const testsBaseUrl = `${API_BASE_URL}/materials/tests`;
const submissionsBaseUrl = `${API_BASE_URL}/materials/submissions`;

/**
 * =======================================================================
 * LESSON API (Уроки)
 * /api/courses/{courseId}/lessons/{lessonId}/
 * =======================================================================
 */

/**
 * Получить детальную информацию об уроке.
 * Включает в себя разделы урока и их элементы (включая детали контента).
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @returns {Promise<Object>} Объект урока.
 * @throws {Error} Если запрос не удался.
 *
 * @response {
 * id: number,
 * course_id: number,
 * course_title: string,
 * title: string,
 * subtitle: string | null,
 * description: string | null,
 * cover_image: string | null, // URL
 * created_by: { id: number, username: string, ...профиль UserSerializer },
 * created_at: string, // ISO 8601
 * updated_at: string, // ISO 8601
 * sections: Array<{
 * id: number,
 * lesson: number, // ID урока
 * title: string,
 * order: number,
 * created_at: string,
 * updated_at: string,
 * is_completed: boolean, // Для текущего студента
 * items: Array<{
 * id: number,
 * section: number, // ID раздела
 * order: number,
 * item_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'test',
 * created_at: string,
 * updated_at: string,
 * content_details: Object // Структура зависит от item_type (см. сериализаторы материалов/тестов)
 * // Например, для 'text': { id: number, title: string, content: string, is_markdown: boolean, ... }
 * // Например, для 'test': { id: number, title: string, description: string, test_type: string, ... TestSerializer поля ... }
 * }>
 * }>,
 * is_completed: boolean // Для текущего студента
 * }
 */
export async function fetchLessonDetails(courseId, lessonId) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/`;
	const response = await apiFetch(url);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка загрузки урока: ${response.status}`);
	}
	return response.json();
}

/**
 * Обновить детали урока (только для админа/персонала).
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {Object} lessonData - Данные для обновления.
 * @param {string} [lessonData.title] - Новое название урока.
 * @param {string} [lessonData.subtitle] - Новый подзаголовок.
 * @param {string} [lessonData.description] - Новое описание.
 * @param {File} [lessonData.cover_image] - Новый файл обложки (используйте FormData).
 * Передача пустой строки `''` может удалить изображение.
 * @returns {Promise<Object>} Обновленный объект урока.
 */
export async function updateLesson(courseId, lessonId, lessonData) {
    const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/`;
    const response = await apiFetch(url, {
        method: 'PATCH',
        body: lessonData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Ошибка обновления урока: ${response.status}`);
    }
    return response.json();
}


/**
 * =======================================================================
 * SECTION API (Разделы урока)
 * /api/courses/{courseId}/lessons/{lessonId}/sections/
 * =======================================================================
 */

/**
 * Создать новый раздел в уроке.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {Object} sectionData - Данные нового раздела.
 * @param {string} sectionData.title - Название раздела.
 * @param {number} [sectionData.order] - Порядок раздела (опционально, бэкенд может назначать автоматически).
 * @returns {Promise<Object>} Созданный объект раздела.
 * @response Объект раздела (см. структуру в fetchLessonDetails.sections[0])
 */
export async function createSection(courseId, lessonId, sectionData) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/`;
	const response = await apiFetch(url, {
		method: 'POST',
		body: sectionData
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка создания раздела: ${response.status}`);
	}
	return response.json();
}

/**
 * Обновить раздел урока.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {string|number} sectionId - ID раздела.
 * @param {Object} sectionData - Данные для обновления.
 * @param {string} [sectionData.title] - Новое название раздела.
 * @param {number} [sectionData.order] - Новый порядок раздела.
 * @returns {Promise<Object>} Обновленный объект раздела.
 */
export async function updateSection(courseId, lessonId, sectionId, sectionData) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/${sectionId}/`;
	const response = await apiFetch(url, {
		method: 'PATCH',
		body: sectionData
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка обновления раздела: ${response.status}`);
	}
	return response.json();
}

/**
 * Удалить раздел урока.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {string|number} sectionId - ID раздела.
 * @returns {Promise<void>}
 */
export async function deleteSection(courseId, lessonId, sectionId) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/${sectionId}/`;
	const response = await apiFetch(url, { method: 'DELETE' });
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка удаления раздела: ${response.status}`);
	}
}


/**
 * =======================================================================
 * SECTION ITEM API (Элементы раздела)
 * /api/courses/{courseId}/lessons/{lessonId}/sections/{sectionId}/items/
 * =======================================================================
 */

/**
 * Создать новый элемент в разделе урока.
 * Этот метод может либо создать новый связанный контент (текст, тест и т.д.),
 * либо привязать существующий контент.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {string|number} sectionId - ID раздела, в который добавляется элемент.
 * @param {Object} itemPayload - Данные для создания элемента.
 * @param {'text'|'image'|'audio'|'video'|'document'|'test'} itemPayload.item_type - Тип создаваемого элемента.
 * @param {number} [itemPayload.order] - Порядок элемента (опционально, бэкенд может назначать).
 *
 * @param {Object} [itemPayload.content_data] - Если создается НОВЫЙ контент. Структура зависит от `item_type`.
 * @param {string} [itemPayload.content_data.title] - Общий заголовок для многих типов контента (необязательно).
 * // Для 'text':
 * @param {string} [itemPayload.content_data.content] - Содержимое текста.
 * @param {boolean} [itemPayload.content_data.is_markdown] - True, если Markdown.
 * // Для 'image': (отправляется как FormData)
 * @param {File} [itemPayload.content_data_image] - Файл изображения. (поле `image` в ImageMaterial)
 * @param {string} [itemPayload.content_data_title] - (поле `title` в ImageMaterial)
 * @param {string} [itemPayload.content_data_alt_text] - (поле `alt_text` в ImageMaterial)
 * // Для 'audio': (отправляется как FormData)
 * @param {File} [itemPayload.content_data_audio_file] - Аудиофайл.
 * @param {string} [itemPayload.content_data_title] - Заголовок.
 * @param {string} [itemPayload.content_data_transcript] - Транскрипция.
 * // Для 'video': (отправляется как FormData, если файл)
 * @param {File} [itemPayload.content_data_video_file] - Видеофайл.
 * @param {string} [itemPayload.content_data_title] - Заголовок.
 * @param {string} [itemPayload.content_data_transcript] - Транскрипция.
 * // Для 'document': (отправляется как FormData)
 * @param {File} [itemPayload.content_data_document_file] - Файл документа.
 * @param {string} [itemPayload.content_data_title] - Заголовок.
 * // Для 'test': (Структура соответствует TestSerializer на бэкенде, см. JS модели тестов)
 * @param {string} itemPayload.content_data.title - Название теста.
 * @param {string} [itemPayload.content_data.description] - Описание теста.
 * @param {string} itemPayload.content_data.test_type - Тип теста (e.g., 'mcq-single').
 * @param {number|null} [itemPayload.content_data.attached_image_id] - ID существующего ImageMaterial.
 * @param {number|null} [itemPayload.content_data.attached_audio_id] - ID существующего AudioMaterial.
 * @param {Array<Object>} [itemPayload.content_data.mcq_options] - Для MCQ тестов.
 * @param {string} option.text - Текст варианта.
 * @param {boolean} option.is_correct - Правильный ли вариант.
 * @param {string} [option.explanation] - Пояснение.
 * @param {number} [option.order] - Порядок.
 *
 * @param {string} [itemPayload.existing_content_type] - Если привязывается СУЩЕСТВУЮЩИЙ контент. Должен совпадать с `item_type`.
 * @param {number} [itemPayload.existing_content_id] - ID существующего контента (например, ID TextMaterial или Test).
 *
 * @returns {Promise<Object>} Созданный объект SectionItem (включая content_details).
 * @response Объект SectionItem (см. структуру в fetchLessonDetails.sections[0].items[0])
 *
 * @note Если `item_type` требует файла (image, audio, video, document), `itemPayload` должен быть объектом `FormData`.
 * При отправке `FormData` для создания контента, поля `content_data` сериализуются как отдельные поля FormData,
 * например, `content_data_title`, `content_data_image` (для файла), `content_data_is_markdown` и т.д.
 * Если `content_data` - это JSON для теста, то он отправляется как `itemPayload.content_data`.
 */
export async function createSectionItem(courseId, lessonId, sectionId, itemPayload) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/${sectionId}/items/`;
	const response = await apiFetch(url, {
		method: 'POST',
		body: itemPayload
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка создания элемента раздела: ${response.status}`);
	}
	return response.json();
}

/**
 * Обновить элемент раздела.
 * Можно обновить порядок или связанный контент.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {string|number} sectionId - ID раздела.
 * @param {string|number} itemId - ID элемента для обновления.
 * @param {Object} itemPayload - Данные для обновления.
 * @param {number} [itemPayload.order] - Новый порядок.
 * @param {'text'|...} [itemPayload.item_type] - Тип элемента (обычно не меняется, но API может позволять).
 * @param {Object} [itemPayload.content_data] - Если обновляется существующий связанный контент.
 * @param {string} [itemPayload.existing_content_type] - Если меняется ссылка на другой существующий контент.
 * @param {number} [itemPayload.existing_content_id] - ID другого существующего контента.
 * @returns {Promise<Object>} Обновленный объект SectionItem.
 *
 */
export async function updateSectionItem(courseId, lessonId, sectionId, itemId, itemPayload) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/${sectionId}/items/${itemId}/`;
	const response = await apiFetch(url, {
		method: 'PATCH',
		body: itemPayload
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка обновления элемента раздела: ${response.status}`);
	}
	return response.json();
}

/**
 * Удалить элемент из раздела.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {string|number} sectionId - ID раздела.
 * @param {string|number} itemId - ID элемента для удаления.
 * @returns {Promise<void>}
 */
export async function deleteSectionItem(courseId, lessonId, sectionId, itemId) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/${sectionId}/items/${itemId}/`;
	const response = await apiFetch(url, { method: 'DELETE' });
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка удаления элемента раздела: ${response.status}`);
	}
}

/**
 * Отметить элемент раздела как просмотренный (нетестовый).
 */
export async function markItemViewed(courseId, lessonId, sectionId, itemId) {
    const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/${sectionId}/items/${itemId}/viewed/`;
    const response = await apiFetch(url, { method: 'POST' });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Ошибка отметки просмотра материала: ${response.status}`);
    }
    return response.json();
}


/**
 * =======================================================================
 * /api/tests/
 * =======================================================================
 */

/**
 * Получить детальную информацию о тесте.
 *
 * @async
 * @param {string|number} testId - ID теста.
 * @returns {Promise<Object>} Объект теста.
 */
export async function fetchTestDetails(testId) {
    const url = `${testsBaseUrl}/${testId}/`;
    const response = await apiFetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Ошибка загрузки теста: ${response.status}`);
    }
    return response.json();
}

/**
 * Создать новый тест (независимо, не через SectionItem).
 *
 * @async
 * @param {Object} testData - Данные теста, структура соответствует TestSerializer.
 * См. описание itemPayload.content_data для 'test' в createSectionItem.
 * @returns {Promise<Object>} Созданный объект теста.
 */
export async function createTest(testData) {
    const url = `${testsBaseUrl}/`;
    const response = await apiFetch(url, {
        method: 'POST',
        body: testData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Ошибка создания теста: ${response.status}`);
    }
    return response.json();
}

/**
 * Обновить существующий тест.
 *
 * @async
 * @param {string|number} testId - ID теста.
 * @param {Object} testData - Данные для обновления, структура TestSerializer.
 * @returns {Promise<Object>} Обновленный объект теста.
 */
export async function updateTest(testId, testData) {
    const url = `${testsBaseUrl}/${testId}/`;
    const response = await apiFetch(url, {
        method: 'PUT',
        body: testData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Ошибка обновления теста: ${response.status}`);
    }
    return response.json();
}


/**
 * =======================================================================
 * /api/tests/{testId}/submit/
 * /api/submissions/
 * =======================================================================
 */

/**
 * Отправить ответы студента на тест.
 *
 * @async
 * @param {string|number} testId - ID теста.
 * @param {Object} submissionPayload - Данные ответа.
 * @param {number} submissionPayload.section_item_id - ID SectionItem, через который доступен тест.
 * @param {Object} submissionPayload.answers - Объект с ответами, структура зависит от типа теста.
 * // Для 'mcq-single'/'mcq-multi':
 * @param {Array<number>} [submissionPayload.answers.selected_option_ids] - Массив ID выбранных MCQOption.
 * // Для 'free-text':
 * @param {string} [submissionPayload.answers.answer_text] - Текст ответа.
 * // Для 'word-order':
 * @param {Array<string>} [submissionPayload.answers.submitted_order_words] - Массив слов в порядке студента.
 * // Для 'matching':
 * @param {Array<{matching_pair_id: number, submitted_answer_text: string}>} [submissionPayload.answers.answers] - Массив соотнесений.
 * @param {File} [submissionPayload.submitted_audio_file] - Для 'pronunciation' (передается через FormData).
 * @param {File} [submissionPayload.submitted_image_file] - Для 'spelling' (передается через FormData).
 *
 * @returns {Promise<Object>} Объект TestSubmission с результатом отправки.
 * @response Объект TestSubmission (см. TestSubmissionDetailSerializer на бэкенде).
 * {
 * id: number,
 * test: { id: number, title: string, ... }, // Краткая инфо о тесте
 * student: { id: number, username: string, ... },
 * section_item: number, // ID SectionItem
 * submitted_at: string,
 * status: 'submitted' | 'grading_pending' | 'graded' | 'auto_passed' | 'auto_failed',
 * score: number | null,
 * feedback: string | null,
 * answers: Object // Детализированные ответы в зависимости от типа теста (см. TestSubmissionDetailSerializer)
 * }
 *
 * @note Если есть файлы (submitted_audio_file, submitted_image_file),
 * `submissionPayload` должен быть объектом `FormData`.
 * `answers` в этом случае должен быть JSON-строкой: `formData.append('answers', JSON.stringify(answersObject));`
 */
export async function submitTestAnswers(testId, submissionPayload) {
	const url = `${testsBaseUrl}/${testId}/submit/`;
	const response = await apiFetch(url, {
		method: 'POST',
		body: submissionPayload
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка отправки ответов: ${response.status}`);
	}
	return response.json();
}

/**
 * Получить список отправок тестов.
 * Студенты видят только свои. Админы/персонал могут фильтровать.
 *
 * @async
 * @param {Object} [filters] - Объект с фильтрами.
 * @param {string|number} [filters.course_id] - Фильтр по ID курса.
 * @param {string|number} [filters.lesson_id] - Фильтр по ID урока.
 * @param {string|number} [filters.section_id] - Фильтр по ID раздела.
 * @param {string|number} [filters.test_id] - Фильтр по ID теста.
 * @param {string|number} [filters.student_id] - Фильтр по ID студента (для админов).
 * @param {string} [filters.status] - Фильтр по статусу отправки.
 * @param {string} [filters.ordering] - Поле для сортировки (e.g., '-submitted_at').
 * @returns {Promise<Array<Object>>} Массив объектов TestSubmission (краткая информация).
 * @response Массив объектов TestSubmission (см. TestSubmissionListSerializer на бэкенде).
 * Каждый объект: { id, test: number, test_title: string, student: UserSerializer, submitted_at, status, score }
 */
export async function fetchTestSubmissions(filters = {}) {
	const queryParams = new URLSearchParams(filters).toString();
	const url = `${submissionsBaseUrl}/${queryParams ? '?' + queryParams : ''}`;
	const response = await apiFetch(url);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка загрузки отправок: ${response.status}`);
	}
	return response.json();
}

/**
 * Получить детальную информацию о конкретной отправке теста.
 *
 * @async
 * @param {string|number} submissionId - ID отправки.
 * @returns {Promise<Object>} Объект TestSubmission с деталями.
 * @response Объект TestSubmission (см. TestSubmissionDetailSerializer на бэкенде, как в submitTestAnswers).
 */
export async function fetchTestSubmissionDetails(submissionId) {
	const url = `${submissionsBaseUrl}/${submissionId}/`;
	const response = await apiFetch(url);
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || `Ошибка загрузки деталей отправки: ${response.status}`);
	}
	return response.json();
}

/**
 * Изменить порядок разделов в уроке.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {Array<Object>} sectionsOrderPayload - Массив объектов, каждый из которых содержит `id` раздела и новый `order`.
 * @param {number} sectionsOrderPayload[].id - ID раздела.
 * @param {number} sectionsOrderPayload[].order - Новый порядковый номер раздела.
 * @returns {Promise<Array<Object>>} Массив обновленных объектов разделов урока, отсортированных по новому порядку.
 * @throws {Error} Если запрос не удался.
 */
export async function reorderSections(courseId, lessonId, sectionsOrderPayload) {
	const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/reorder/`;
	const response = await apiFetch(url, {
		method: 'POST',
		body: sectionsOrderPayload
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		let errorMessage = `Ошибка изменения порядка разделов: ${response.status}`;
		if (errorData.detail) {
			errorMessage = errorData.detail;
		} else if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.conflicts_with_other_sections) {
                 errorMessage += ` Конфликты: ${JSON.stringify(errorData.conflicts_with_other_sections)}`;
            }
            if (errorData.missing_section_ids) {
                errorMessage += ` Не найдены ID секций: ${errorData.missing_section_ids.join(', ')}`;
            }
        }
		throw new Error(errorMessage);
	}
	return response.json();
}

/**
 * Изменить порядок элементов в разделе урока.
 *
 * @async
 * @param {string|number} courseId - ID курса.
 * @param {string|number} lessonId - ID урока.
 * @param {string|number} sectionId - ID раздела.
 * @param {Array<Object>} itemsOrderPayload - Массив объектов, каждый: { id: itemId, order: newOrder }.
 * @returns {Promise<Array<Object>>} Массив обновленных SectionItem.
 */
export async function reorderSectionItems(courseId, lessonId, sectionId, itemsOrderPayload) {
    const url = `${coursesBaseUrl}/${courseId}/lessons/${lessonId}/sections/${sectionId}/items/reorder/`;
    const response = await apiFetch(url, {
        method: 'POST',
        body: itemsOrderPayload 
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Ошибка изменения порядка элементов: ${response.status}`);
    }
    return response.json(); 
}