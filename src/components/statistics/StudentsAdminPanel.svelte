<script>
  import { onMount } from 'svelte';
  import { fetchStudents, fetchUsers, updateUserRole, bulkUserOperation, deleteUser } from '../../api/authApi.js';
  import { getStudentStatistics, getUserProfile } from '../../api/adminApi.js';
  import { fetchCourses, fetchEnrollments, bulkEnrollStudents, bulkLeaveStudents, fetchCourseAssistants, addCourseAssistant, removeCourseAssistant } from '../../api/adminApi.js';
  import Button from '../ui/Button.svelte';
  import Modal from '../ui/Modal.svelte';
  import Input from '../ui/Input.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import Badge from '../ui/Badge.svelte';
  import ConfirmModal from '../utils/ConfirmModal.svelte';
  
  export let userRole = 'student'; // admin или teacher
  
  let students = [];
  let courses = [];
  let isLoading = false;
  let searchQuery = '';
  let showInactive = false;
  let currentPage = 1;
  let pageSize = 20;
  let totalPages = 1;
  let totalCount = 0;
  
  // Модальные окна
  let showContactModal = false;
  let showRoleModal = false;
  let showCoursesModal = false;
  let showAssistantModal = false;
  let showConfirmModal = false;
  let showBulkModal = false;
  
  let selectedStudent = null;
  let selectedStudentProfile = null;
  let selectedStudentStats = null;
  let selectedStudentCourses = [];
  let selectedStudentAssistants = [];
  let newRole = 'student';
  let newIsActive = true;
  
  let selectedStudents = new Set(); // Множество выбранных учеников
  let bulkAction = 'activate';
  
  // Курсы для управления помощниками
  let allCourses = [];
  
  onMount(async () => {
    await loadStudents();
    await loadCourses();
  });
  
  async function loadStudents() {
    isLoading = true;
    try {
      // Создаем новый объект параметров каждый раз, чтобы избежать проблем с реактивностью
      const params = {};
      
      // Обязательные параметры пагинации
      params.page = currentPage;
      params.page_size = pageSize;
      
      // Добавляем фильтр по активности только если нужно показать ТОЛЬКО активных
      // Если showInactive = true, параметр is_active НЕ добавляется, чтобы получить ВСЕХ (и активных, и неактивных)
      if (!showInactive) {
        params.is_active = true;
      }
      // Если showInactive = true, параметр is_active не добавляется вообще
      // На бэкенде это означает "показать всех, независимо от статуса"
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      // Для админов используем fetchUsers чтобы показать всех пользователей с разными ролями
      // Для преподавателей используем fetchStudents (только ученики)
      const response = userRole === 'admin' 
        ? await fetchUsers(params) 
        : await fetchStudents(params);
      
      // Поддержка как пагинации, так и обычного массива
      if (Array.isArray(response)) {
        // Если ответ - массив напрямую
        students = response;
        totalCount = response.length;
        totalPages = 1;
      } else if (response && typeof response === 'object' && 'results' in response) {
        // Если ответ - объект с пагинацией
        students = Array.isArray(response.results) ? response.results : [];
        totalCount = response.count || students.length;
        totalPages = Math.ceil(totalCount / pageSize);
      } else {
        // Неожиданный формат
        students = [];
        totalCount = 0;
        totalPages = 1;
      }
    } catch (error) {
      console.error('Ошибка загрузки учеников:', error);
      alert('Не удалось загрузить список учеников: ' + error.message);
    } finally {
      isLoading = false;
    }
  }
  
  async function loadCourses() {
    try {
      // Загружаем опубликованные и бесплатные курсы
      const published = await fetchCourses({ status: 'published' });
      const free = await fetchCourses({ status: 'free' });
      // Объединяем и удаляем дубликаты
      const all = [...published, ...free];
      allCourses = all.filter((course, index, self) => 
        index === self.findIndex(c => c.id === course.id)
      );
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error);
      allCourses = [];
    }
  }
  
  function handleSearch() {
    currentPage = 1;
    loadStudents();
  }
  
  function toggleInactive(event) {
    // Respect the actual checkbox state coming from the DOM when called
    // as an event handler (prevents double-toggle when using bind:checked).
    if (event && event.target && typeof event.target.checked === 'boolean') {
      showInactive = event.target.checked;
    } else {
      showInactive = !showInactive;
    }
    currentPage = 1;
    loadStudents();
  }
  
  function toggleStudentSelection(studentId) {
    if (selectedStudents.has(studentId)) {
      selectedStudents.delete(studentId);
    } else {
      selectedStudents.add(studentId);
    }
    selectedStudents = selectedStudents; // Для реактивности
  }
  
  function toggleSelectAll() {
    if (selectedStudents.size === students.length) {
      selectedStudents.clear();
    } else {
      students.forEach(s => selectedStudents.add(s.id));
    }
    selectedStudents = selectedStudents;
  }
  
  async function showContactInfo(student) {
    selectedStudent = student;
    try {
      selectedStudentProfile = await getUserProfile(student.id);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      selectedStudentProfile = null;
    }
    showContactModal = true;
  }
  
  async function showRoleManagement(student) {
    selectedStudent = student;
    newRole = student.role;
    newIsActive = student.is_active;
    showRoleModal = true;
  }
  
  async function showCoursesManagement(student) {
    selectedStudent = student;
    try {
      const stats = await getStudentStatistics(student.id);
      selectedStudentStats = stats;
      selectedStudentCourses = stats.enrollments || [];
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      selectedStudentCourses = [];
    }
    showCoursesModal = true;
  }
  
  async function showAssistantManagement(student) {
    selectedStudent = student;
    try {
      // Загружаем все курсы где ученик может быть помощником
      selectedStudentAssistants = [];
      for (const course of allCourses) {
        try {
          const assistants = await fetchCourseAssistants(course.id);
          const isAssistant = assistants.some(a => {
            const assistantId = a.assistant_details?.id || a.assistant;
            return assistantId === student.id;
          });
          if (isAssistant) {
            selectedStudentAssistants.push(course);
          }
        } catch (error) {
          console.error(`Ошибка проверки помощника для курса ${course.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки помощников:', error);
      selectedStudentAssistants = [];
    }
    showAssistantModal = true;
  }
  
  async function updateRole() {
    if (!selectedStudent) return;
    
    try {
      await updateUserRole(selectedStudent.id, newRole, newIsActive);
      await loadStudents();
      showRoleModal = false;
      selectedStudent = null;
    } catch (error) {
      alert('Ошибка обновления роли: ' + error.message);
    }
  }
  
  async function handleDelete() {
    if (!selectedStudent) return;
    
    try {
      await deleteUser(selectedStudent.id);
      await loadStudents();
      showConfirmModal = false;
      selectedStudent = null;
    } catch (error) {
      alert('Ошибка удаления: ' + error.message);
    }
  }
  
  async function handleBulkOperation() {
    if (selectedStudents.size === 0) {
      alert('Выберите хотя бы одного ученика');
      return;
    }
    
    try {
      await bulkUserOperation(Array.from(selectedStudents), bulkAction);
      selectedStudents.clear();
      await loadStudents();
      showBulkModal = false;
    } catch (error) {
      alert('Ошибка выполнения операции: ' + error.message);
    }
  }
  
  async function enrollStudentToCourse(courseId) {
    if (!selectedStudent) return;
    
    try {
      await bulkEnrollStudents(courseId, [selectedStudent.id]);
      await showCoursesManagement(selectedStudent); // Обновляем данные
      alert('Ученик успешно записан на курс');
    } catch (error) {
      alert('Ошибка записи на курс: ' + error.message);
    }
  }
  
  async function leaveStudentFromCourse(enrollmentId, courseId) {
    if (!selectedStudent) return;
    if (!courseId) {
      alert('Не удалось определить курс для отчисления');
      return;
    }
    
    try {
      await bulkLeaveStudents(courseId, [selectedStudent.id]);
      await showCoursesManagement(selectedStudent); // Обновляем данные
      alert('Ученик отчислен с курса');
    } catch (error) {
      alert('Ошибка отчисления: ' + error.message);
    }
  }
  
  async function toggleAssistantForCourse(courseId, isCurrentlyAssistant) {
    if (!selectedStudent) return;
    
    try {
      if (isCurrentlyAssistant) {
        await removeCourseAssistant(courseId, selectedStudent.id);
        selectedStudentAssistants = selectedStudentAssistants.filter(c => c.id !== courseId);
      } else {
        await addCourseAssistant(courseId, selectedStudent.id);
        const course = allCourses.find(c => c.id === courseId);
        if (course) selectedStudentAssistants.push(course);
      }
      alert('Доступ помощника обновлен');
    } catch (error) {
      alert('Ошибка обновления доступа помощника: ' + error.message);
    }
  }
  
  function getRoleLabel(role) {
    const labels = {
      'admin': 'Администратор',
      'teacher': 'Преподаватель',
      'assistant': 'Помощник',
      'student': 'Ученик'
    };
    return labels[role] || role;
  }
  
  function getStatusLabel(status) {
    return status === 'active' ? 'Активен' : status === 'completed' ? 'Завершен' : 'Отчислен';
  }
</script>

<div class="admin-panel">
  <div class="admin-header">
    <h2>Управление учениками</h2>
    <div class="admin-controls">
      <div class="search-box">
        <Input
          type="text"
          placeholder="Поиск по имени или email..."
          bind:value={searchQuery}
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button on:click={handleSearch} variant="primary" size="sm">Поиск</Button>
      </div>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={showInactive} on:change={toggleInactive} />
        Показать неактивных
      </label>
      {#if selectedStudents.size > 0}
        <Button on:click={() => showBulkModal = true} variant="secondary" size="sm">
          Массовые операции ({selectedStudents.size})
        </Button>
      {/if}
    </div>
  </div>
  
  {#if isLoading}
    <div class="loading">Загрузка...</div>
  {:else if students.length === 0}
    <div class="empty">Ученики не найдены</div>
  {:else}
    <div class="table-container">
      <table class="students-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" 
                checked={selectedStudents.size === students.length && students.length > 0}
                on:change={toggleSelectAll}
              />
            </th>
            <th>Аватар</th>
            <th>Имя</th>
            <th>Email</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {#each students as student}
            <tr class:inactive={!student.is_active}>
              <td>
                <input type="checkbox" 
                  checked={selectedStudents.has(student.id)}
                  on:change={() => toggleStudentSelection(student.id)}
                />
              </td>
              <td>
                <Avatar username={student.username} size={40} />
              </td>
              <td>{student.username}</td>
              <td>{student.email}</td>
              <td>
                <Badge variant={student.role === 'admin' ? 'danger' : student.role === 'teacher' ? 'warning' : 'info'}>
                  {getRoleLabel(student.role)}
                </Badge>
              </td>
              <td>
                <Badge variant={student.is_active ? 'success' : 'default'}>
                  {student.is_active ? 'Активен' : 'Неактивен'}
                </Badge>
              </td>
              <td class="actions">
                <Button on:click={() => showContactInfo(student)} variant="ghost" size="sm">Контакты</Button>
                <Button on:click={() => showCoursesManagement(student)} variant="ghost" size="sm">Курсы</Button>
                {#if userRole === 'admin'}
                  <Button on:click={() => showRoleManagement(student)} variant="ghost" size="sm">Роль</Button>
                  {#if student.role === 'assistant' || student.role === 'student'}
                    <Button on:click={() => showAssistantManagement(student)} variant="ghost" size="sm">Помощник</Button>
                  {/if}
                  <Button on:click={() => { selectedStudent = student; showConfirmModal = true; }} variant="danger" size="sm">Удалить</Button>
                {:else if userRole === 'teacher'}
                  <Button on:click={() => showRoleManagement(student)} variant="ghost" size="sm">Роль</Button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    
    {#if totalPages > 1}
      <div class="pagination">
        <Button on:click={() => { currentPage = Math.max(1, currentPage - 1); loadStudents(); }} disabled={currentPage === 1} variant="ghost" size="sm">
          Назад
        </Button>
        <span class="page-info">Страница {currentPage} из {totalPages} (всего: {totalCount})</span>
        <Button on:click={() => { currentPage = Math.min(totalPages, currentPage + 1); loadStudents(); }} disabled={currentPage === totalPages} variant="ghost" size="sm">
          Вперед
        </Button>
      </div>
    {/if}
  {/if}
</div>

<!-- Модальное окно контактной информации -->
<Modal open={showContactModal} title="Контактная информация" onClose={() => showContactModal = false}>
  {#if selectedStudentProfile}
    <div class="contact-info">
      <div class="contact-item">
        <strong>Имя:</strong> {selectedStudentProfile.user?.username || selectedStudent?.username}
      </div>
      <div class="contact-item">
        <strong>Email:</strong> {selectedStudentProfile.user?.email || selectedStudent?.email}
      </div>
      {#if selectedStudentProfile.profile?.phone_number}
        <div class="contact-item">
          <strong>Телефон:</strong> {selectedStudentProfile.profile.phone_number}
        </div>
      {/if}
      {#if !selectedStudentProfile.profile?.phone_number && !selectedStudentProfile.profile?.email}
        <div class="contact-item empty">Контактная информация отсутствует</div>
      {/if}
    </div>
  {:else if selectedStudent}
    <div class="contact-info">
      <div class="contact-item">
        <strong>Имя:</strong> {selectedStudent.username}
      </div>
      <div class="contact-item">
        <strong>Email:</strong> {selectedStudent.email}
      </div>
      <div class="contact-item empty">Дополнительная контактная информация отсутствует</div>
    </div>
  {/if}
</Modal>

<!-- Модальное окно управления ролью -->
<Modal open={showRoleModal} title="Управление ролью" onClose={() => showRoleModal = false}>
  {#if selectedStudent}
    <div class="role-management">
      <Input label="Текущий пользователь" value={selectedStudent.username} readonly={true} />
      <div class="form-group">
        <label class="label">Роль:</label>
        <select bind:value={newRole} class="select">
          {#if userRole === 'admin'}
            <option value="admin">Администратор</option>
            <option value="teacher">Преподаватель</option>
            <option value="assistant">Помощник</option>
            <option value="student">Ученик</option>
          {:else if userRole === 'teacher'}
            <option value="student">Ученик</option>
            <option value="assistant">Помощник</option>
          {/if}
        </select>
      </div>
      {#if userRole === 'admin'}
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={newIsActive} />
            Активен
          </label>
        </div>
      {/if}
    </div>
  {/if}
  <div slot="actions">
    {#if selectedStudent}
      <Button on:click={() => showRoleModal = false} variant="secondary">Отмена</Button>
      <Button on:click={updateRole} variant="primary">Сохранить</Button>
    {/if}
  </div>
</Modal>

<!-- Модальное окно управления курсами -->
<Modal open={showCoursesModal} title="Курсы ученика" width={800} onClose={() => showCoursesModal = false}>
  {#if selectedStudent && selectedStudentStats}
    <div class="courses-management">
      <div class="stats-summary">
        <div class="stat-item">
          <strong>Всего курсов:</strong> {selectedStudentStats.statistics?.total_courses || 0}
        </div>
        <div class="stat-item">
          <strong>Активных:</strong> {selectedStudentStats.statistics?.active_courses || 0}
        </div>
        <div class="stat-item">
          <strong>Завершенных:</strong> {selectedStudentStats.statistics?.completed_courses || 0}
        </div>
      </div>
      
      <div class="enrollments-list">
        <h3>Записи на курсы:</h3>
        {#if selectedStudentCourses.length === 0}
          <div class="empty">Ученик не записан ни на один курс</div>
        {:else}
          {#each selectedStudentCourses as enrollment}
            <div class="enrollment-item">
              <div class="enrollment-info">
                <Badge variant={enrollment.status === 'active' ? 'success' : enrollment.status === 'completed' ? 'info' : 'default'}>
                  {getStatusLabel(enrollment.status)}
                </Badge>
                <span class="course-name">{enrollment.course_details?.title || `Курс #${enrollment.course}`}</span>
                {#if enrollment.enrolled_at}
                  <span class="date">Записан: {new Date(enrollment.enrolled_at).toLocaleDateString('ru-RU')}</span>
                {/if}
              </div>
              {#if enrollment.status === 'active'}
                <Button on:click={() => leaveStudentFromCourse(
                  enrollment.id,
                  enrollment.course_details?.id ?? enrollment.course
                )} variant="danger" size="sm">
                  Отчислить
                </Button>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
      
      {#if userRole === 'admin' || userRole === 'teacher'}
        <div class="add-course-section">
          <h3>Записать на курс:</h3>
          <div class="course-select">
            <select class="select" id="course-select">
              <option value="">Выберите курс...</option>
              {#each allCourses as course}
                {#if !selectedStudentCourses.some(e => e.course === course.id && e.status === 'active')}
                  <option value={course.id}>{course.title}</option>
                {/if}
              {/each}
            </select>
            <Button on:click={() => {
              const select = document.getElementById('course-select');
              if (select.value) {
                enrollStudentToCourse(parseInt(select.value));
                select.value = '';
              }
            }} variant="primary" size="sm">Записать</Button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</Modal>

<!-- Модальное окно управления помощниками -->
{#if userRole === 'admin'}
  <Modal open={showAssistantModal} title="Управление доступом помощника" width={800} onClose={() => showAssistantModal = false}>
    {#if selectedStudent}
      <div class="assistant-management">
        <p>Выберите курсы, к которым помощник будет иметь доступ:</p>
        <div class="courses-list">
          {#each allCourses as course}
            {@const isAssistant = selectedStudentAssistants.some(c => c.id === course.id)}
            <div class="course-item">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={isAssistant}
                  on:change={() => toggleAssistantForCourse(course.id, isAssistant)}
                />
                <span>{course.title}</span>
              </label>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </Modal>
{/if}

<!-- Модальное окно подтверждения удаления -->
<ConfirmModal
  isOpen={showConfirmModal}
  title="Удалить ученика?"
  message="Вы уверены, что хотите удалить этого ученика? Это действие нельзя отменить."
  on:confirm={handleDelete}
  on:cancel={() => { showConfirmModal = false; selectedStudent = null; }}
/>

<!-- Модальное окно массовых операций -->
<Modal open={showBulkModal} title="Массовые операции" onClose={() => showBulkModal = false}>
  <div class="bulk-operation">
    <p>Выбрано учеников: {selectedStudents.size}</p>
    <div class="form-group">
      <label class="label">Действие:</label>
      <select bind:value={bulkAction} class="select">
        <option value="activate">Активировать</option>
        <option value="deactivate">Деактивировать</option>
        {#if userRole === 'admin'}
          <option value="delete">Удалить</option>
        {/if}
      </select>
    </div>
  </div>
  <svelte:fragment slot="actions">
    <Button on:click={() => showBulkModal = false} variant="secondary">Отмена</Button>
    <Button on:click={handleBulkOperation} variant="primary">Выполнить</Button>
  </svelte:fragment>
</Modal>

<style>
  .admin-panel {
    background: var(--color-bg-light);
    border-radius: var(--spacing-border-radius-card);
    padding: var(--spacing-padding-block);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    margin-top: 2rem;
  }
  
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .admin-header h2 {
    margin: 0;
    color: var(--color-text-dark);
    font-size: 1.5rem;
  }
  
  .admin-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .search-box {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .search-box :global(.field) {
    margin: 0;
    min-width: 200px;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
  }
  
  .table-container {
    overflow-x: auto;
    margin-bottom: 1rem;
  }
  
  .students-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .students-table thead {
    background: var(--color-bg-ultra-light);
  }
  
  .students-table th {
    padding: 12px;
    text-align: left;
    font-weight: var(--font-weight-semi-bold);
    color: var(--color-text-dark);
    border-bottom: 2px solid var(--color-border-light);
  }
  
  .students-table td {
    padding: 12px;
    border-bottom: 1px solid var(--color-border-light);
  }
  
  .students-table tbody tr:hover {
    background: var(--color-bg-ultra-light);
  }
  
  .students-table tbody tr.inactive {
    opacity: 0.6;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .page-info {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
  
  .loading, .empty {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-muted);
  }
  
  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .contact-item {
    padding: 0.75rem;
    background: var(--color-bg-ultra-light);
    border-radius: 8px;
  }
  
  .contact-item.empty {
    font-style: italic;
    color: var(--color-text-muted);
  }
  
  .role-management, .bulk-operation {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .select {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--color-input-border);
    background: var(--color-input-bg);
    font-size: var(--input-font-size);
    font-family: inherit;
  }
  
  .courses-management {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .stats-summary {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-ultra-light);
    border-radius: 8px;
  }
  
  .stat-item {
    font-size: 0.9rem;
  }
  
  .enrollments-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .enrollment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--color-bg-ultra-light);
    border-radius: 8px;
    gap: 1rem;
  }
  
  .enrollment-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    flex-wrap: wrap;
  }
  
  .course-name {
    font-weight: var(--font-weight-medium);
  }
  
  .date {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }
  
  .add-course-section {
    padding-top: 1rem;
    border-top: 1px solid var(--color-border-light);
  }
  
  .course-select {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .course-select .select {
    flex: 1;
  }
  
  .assistant-management {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .courses-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .course-item {
    padding: 0.5rem;
    border-radius: 6px;
    background: var(--color-bg-ultra-light);
  }
  
  @media (max-width: 768px) {
    .admin-header {
      flex-direction: column;
      align-items: stretch;
    }
    
    .admin-controls {
      flex-direction: column;
    }
    
    .search-box {
      width: 100%;
    }
    
    .students-table {
      font-size: 0.85rem;
    }
    
    .students-table th,
    .students-table td {
      padding: 8px;
    }
    
    .actions {
      flex-direction: column;
    }
    
    .enrollment-item {
      flex-direction: column;
      align-items: stretch;
    }
    
    .stats-summary {
      flex-direction: column;
    }
  }
</style>

