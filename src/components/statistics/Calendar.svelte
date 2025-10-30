<script>
  import { onMount } from 'svelte';
  import { fetchEvents, createEvent, updateEvent, deleteEvent, fetchNotes, upsertNote, deleteNote } from '../../api/calendarApi';
  import Button from '../ui/Button.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import Input from '../ui/Input.svelte';
  import Textarea from '../ui/Textarea.svelte';
  import Select from '../ui/Select.svelte';
  import Modal from '../ui/Modal.svelte';

  export let currentUser = null; // { id, role }

  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  let events = [];
  let notes = [];
  let loading = false;
  let error = '';
  let requestId = 0; // protects against stale async responses

  // Filters for admin/teacher
  let filter = { participant_id: '', status: '', from: '', to: '' };

  // Modal state
  let showEventModal = false;
  let showNoteModal = false;
  let draftEvent = resetEvent();
  let draftNote = resetNote();

function toLocalInput(dt) {
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function fromLocalInputToISO(localStr) {
  return new Date(localStr).toISOString();
}

function resetEvent(date) {
  const base = date ? new Date(date) : new Date(year, month, now.getDate());
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 18, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    id: null,
    title: '',
    description: '',
    start_at: toLocalInput(start),
    end_at: toLocalInput(end),
    timezone,
    status: 'planned',
    reminder_enabled: false,
    recurrence_frequency: 'none',
    recurrence_interval: 1,
    recurrence_by_weekday: [],
    recurrence_until: null,
    recurrence_count: null,
    participants: []
  };
}

  function resetNote(date) {
    return {
      id: null,
      date: (date ? new Date(date) : new Date(year, month, now.getDate())).toISOString().slice(0, 10),
      timezone,
      text: '',
      reminder_enabled: false
    };
  }

  function firstDayOfMonth(y, m) {
    return new Date(y, m, 1);
  }
  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }
  function startGridDate(y, m) {
    const first = firstDayOfMonth(y, m);
    const dow = (first.getDay() + 6) % 7; // Monday=0
    const d = new Date(first);
    d.setDate(first.getDate() - dow);
    return d;
  }

  function computeGridDates(y, m) {
    const start = startGridDate(y, m);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }

  $: gridDates = computeGridDates(year, month);

  function addDays(keyStr, delta) {
    const d = new Date(keyStr);
    d.setDate(d.getDate() + delta);
    return toLocalDateKey(d);
  }

  function buildEventsByDate(list, y, m) {
    const map = Object.create(null);
    for (const e of list || []) {
      const startKey = toLocalDateKey(e.start_at);
      const endKey = toLocalDateKey(e.end_at);
      // expand date range inclusively
      let cur = startKey;
      while (cur <= endKey) {
        (map[cur] ||= []).push(e);
        cur = addDays(cur, 1);
      }
    }
    return map;
  }

  function buildNotesByDate(list) {
    const map = Object.create(null);
    for (const n of list || []) {
      const key = (n.date || '').slice(0, 10);
      if (key) map[key] = n;
    }
    return map;
  }

  $: eventsByDate = buildEventsByDate(events, year, month);
  $: notesByDate = buildNotesByDate(notes);

  async function load() {
    loading = true; error = '';
    const rid = ++requestId;
    try {
      const from = new Date(year, month, 1);
      const to = new Date(year, month, daysInMonth(year, month), 23, 59, 59);
      const params = { from: from.toISOString(), to: to.toISOString() };
      if (isStaff()) {
        if (filter.participant_id) params.participant_id = filter.participant_id;
        if (filter.status) params.status = filter.status;
      }
      const [evs, nts] = await Promise.all([
        fetchEvents(params),
        fetchNotes({ from: `${year}-${String(month + 1).padStart(2, '0')}-01`, to: `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}` })
      ]);
      if (rid === requestId) {
        events = evs?.results || evs || [];
        notes = nts?.results || nts || [];
      }
    } catch (e) {
      error = e?.message || 'Не удалось загрузить календарь';
    } finally {
      if (rid === requestId) loading = false;
    }
  }

  function isStaff() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'teacher');
  }

  function toISODate(d) {
    return new Date(d).toISOString().slice(0, 10);
  }

  // Normalize to local YYYY-MM-DD to avoid timezone off-by-one
  function toLocalDateKey(dateLike) {
    const d = new Date(dateLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function eventsForDay(dateStr) {
    return eventsByDate[dateStr] || [];
  }

  function noteForDay(dateStr) {
    return notesByDate[dateStr];
  }

  function openCreateEvent(day) {
    draftEvent = resetEvent(day);
    // for student/assistant participants ignored by backend, but keep UX simple
    showEventModal = true;
  }
function openEditEvent(ev) {
  draftEvent = { ...ev, start_at: toLocalInput(ev.start_at), end_at: toLocalInput(ev.end_at), participants: [] };
  showEventModal = true;
}
async function saveEvent() {
  try {
    const payload = { ...draftEvent, start_at: fromLocalInputToISO(draftEvent.start_at), end_at: fromLocalInputToISO(draftEvent.end_at) };
    if (draftEvent.id) await updateEvent(draftEvent.id, payload);
    else await createEvent(payload);
    showEventModal = false;
    await load();
  } catch (e) {
    error = e?.message || 'Не удалось сохранить событие';
  }
}
  async function removeEvent() {
    if (!draftEvent.id) return;
    try { await deleteEvent(draftEvent.id); showEventModal = false; await load(); } catch(e) { error = e?.message || 'Ошибка удаления'; }
  }

  function openNote(day) {
    const dateStr = toLocalDateKey(day);
    const n = noteForDay(dateStr);
    draftNote = n ? { ...n } : resetNote(day);
    showNoteModal = true;
  }
  async function saveNote() {
    try {
      await upsertNote(draftNote);
      showNoteModal = false;
      await load();
    } catch (e) {
      error = e?.message || 'Не удалось сохранить заметку';
    }
  }
  async function removeNote() {
    if (!draftNote.id) { showNoteModal = false; return; }
    try { await deleteNote(draftNote.id); showNoteModal = false; await load(); } catch(e) { error = e?.message || 'Ошибка удаления заметки'; }
  }

  function prevMonth() {
    if (month === 0) { month = 11; year -= 1; } else { month -= 1; }
    load();
  }
  function nextMonth() {
    if (month === 11) { month = 0; year += 1; } else { month += 1; }
    load();
  }

  onMount(load);
</script>

<div class="cal-wrapper">
  <div class="cal-header">
    <div class="cal-nav">
      <IconButton title="Предыдущий" on:click={prevMonth} size={32}>‹</IconButton>
      <div class="cal-title">{new Date(year, month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</div>
      <IconButton title="Следующий" on:click={nextMonth} size={32}>›</IconButton>
    </div>
    {#if isStaff()}
      <div class="cal-filters">
        <Input placeholder="ID участника" type="number" bind:value={filter.participant_id} on:change={load} />
        <Select bind:value={filter.status} on:change={load} options={[
          {label:'Статус: все', value:''},
          {label:'запланировано', value:'planned'},
          {label:'в процессе', value:'in_progress'},
          {label:'проведено', value:'completed'},
          {label:'отменено', value:'cancelled'}
        ]} />
      </div>
    {/if}
  </div>

  {#if error}
    <div class="cal-error">{error}</div>
  {/if}

  <div class="cal-grid-wrap">
  <div class="cal-grid">
    <div class="cal-weekday">Пн</div>
    <div class="cal-weekday">Вт</div>
    <div class="cal-weekday">Ср</div>
    <div class="cal-weekday">Чт</div>
    <div class="cal-weekday">Пт</div>
    <div class="cal-weekday">Сб</div>
    <div class="cal-weekday">Вс</div>

    {#each gridDates as cellDate, i (cellDate.toISOString())}
      <div class="cal-cell {cellDate.getMonth() !== month ? 'cal-cell--muted' : ''} {(cellDate.getDay()===0 ? 'cal-cell--sunday' : cellDate.getDay()===6 ? 'cal-cell--saturday' : cellDate.getDay()===1 ? 'cal-cell--monday' : cellDate.getDay()===2 ? 'cal-cell--tuesday' : cellDate.getDay()===3 ? 'cal-cell--wednesday' : cellDate.getDay()===4 ? 'cal-cell--thursday' : 'cal-cell--friday')} {eventsForDay(toLocalDateKey(cellDate)).length===0 && !noteForDay(toLocalDateKey(cellDate)) ? 'cal-cell--empty' : ''}">
        <div class="cal-cell-head">
          <span class="cal-day-number">{cellDate.getDate()}</span>
          <div class="cal-actions">
                <IconButton title="Заметка" on:click={(e)=>{ e.stopPropagation(); openNote(cellDate); }} size={24}>✎</IconButton>
                <IconButton title="Событие" on:click={(e)=>{ e.stopPropagation(); openCreateEvent(cellDate); }} size={24}>＋</IconButton>
          </div>
        </div>
        <div class="cal-items">
          {#each (eventsByDate[toLocalDateKey(cellDate)] || []) as ev (ev.id)}
            <button type="button" class="cal-event cal-event--{ev.status}" on:click={() => openEditEvent(ev)}>
              <span class="cal-event-icon" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm13 7H4v11h16V9z"/></svg>
              </span>
              <span class="cal-event-time">{new Date(ev.start_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span>
              <span class="cal-event-title">{ev.title}</span>
            </button>
          {/each}
          {#if notesByDate[toLocalDateKey(cellDate)]}
            <button type="button" class="cal-note" on:click={() => openNote(cellDate)}>
              <span class="cal-note-icon" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v14H8l-5 5V3z"/></svg>
              </span>
              {notesByDate[toLocalDateKey(cellDate)].text.slice(0, 36)}{notesByDate[toLocalDateKey(cellDate)].text.length > 36 ? '…' : ''}
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
  </div>

  <Modal open={showEventModal} title={draftEvent.id ? 'Редактировать событие' : 'Новое событие'} onClose={() => showEventModal=false}>
    <Input placeholder="Название" bind:value={draftEvent.title} />
    <Textarea rows={3} placeholder="Описание" bind:value={draftEvent.description} />
    <Input label="Начало" type="datetime-local" bind:value={draftEvent.start_at} />
    <Input label="Конец" type="datetime-local" bind:value={draftEvent.end_at} />
    <Select label="Статус" bind:value={draftEvent.status} options={[
      {label:'запланировано', value:'planned'},
      {label:'в процессе', value:'in_progress'},
      {label:'проведено', value:'completed'},
      {label:'отменено', value:'cancelled'}
    ]} />
    {#if isStaff()}
      <Input label="ID участников (через запятую)" placeholder="1,2,3" on:change={(e)=> draftEvent.participants = e.target.value.split(',').map(x=>parseInt(x.trim())).filter(Boolean)} />
    {/if}
    <div class="row">
      <Select label="Повторение" bind:value={draftEvent.recurrence_frequency} options={[{label:'нет', value:'none'},{label:'каждый день', value:'daily'},{label:'каждую неделю', value:'weekly'},{label:'каждый месяц', value:'monthly'}]} />
      <Input type="number" min="1" label="Интервал" bind:value={draftEvent.recurrence_interval} />
    </div>
    <div class="row"><label><input type="checkbox" bind:checked={draftEvent.reminder_enabled} /> Напоминание</label></div>
    <div slot="actions">
      {#if draftEvent.id}
        <Button variant="danger" on:click={removeEvent}>Удалить</Button>
      {/if}
      <Button variant="secondary" on:click={() => showEventModal = false}>Отмена</Button>
      <Button on:click={saveEvent}>Сохранить</Button>
    </div>
  </Modal>

  <Modal open={showNoteModal} title={draftNote.id ? 'Редактировать заметку' : 'Новая заметка'} onClose={() => showNoteModal=false}>
    <Input label="Дата" type="date" bind:value={draftNote.date} />
    <Textarea rows={6} placeholder="Заметка" bind:value={draftNote.text} />
    <div class="row"><label><input type="checkbox" bind:checked={draftNote.reminder_enabled} /> Напоминание</label></div>
    <div slot="actions">
      {#if draftNote.id}
        <Button variant="danger" on:click={removeNote}>Удалить</Button>
      {/if}
      <Button variant="secondary" on:click={() => showNoteModal=false}>Отмена</Button>
      <Button on:click={saveNote}>Сохранить</Button>
    </div>
  </Modal>
</div>

<style>
  /* Integrate calendar into parent card (no nested card look) */
  .cal-wrapper { background: transparent; border: none; box-shadow: none; padding: 0; font-family: 'Play', sans-serif; }
  .cal-wrapper:hover { box-shadow: none; }
  .cal-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .cal-nav { display: flex; align-items: center; gap: 12px; width: 100%; }
  .cal-nav :global(.icon-btn) { flex-shrink: 0; }
  .cal-title { flex: 1; text-align: center; font-family: 'Play', sans-serif; font-weight: 600; color: var(--color-primary); text-transform: capitalize; font-size: 1.5rem; }
  .cal-filters { display: flex; gap: 10px; }
  .input { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--color-input-border); background: var(--color-input-bg); }
  /* removed old simple button styles in favor of IconButton */

  .cal-grid-wrap { width: 100%; overflow-x: auto; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(110px, 1fr)); gap: 8px; min-width: 770px; }
  .cal-weekday { text-align: center; font-weight: 400; color: var(--color-label); padding: 6px 0; font-family: 'Play', sans-serif; }
  
  /* Colorful cell backgrounds (subtle pastel colors by day of week) */
  .cal-cell { border: 1px solid var(--color-border-light); border-radius: 12px; padding: 6px; min-height: 110px; display: flex; flex-direction: column; gap: 6px; position: relative; }
  .cal-cell--muted { opacity: 0.5; }
  /* Pastel colors for each day of week */
  .cal-cell--monday { background: rgba(194, 182, 252, 0.12); }
  .cal-cell--tuesday { background: rgba(133, 171, 230, 0.12); }
  .cal-cell--wednesday { background: rgba(186, 255, 201, 0.12); }
  .cal-cell--thursday { background: rgba(255, 204, 153, 0.15); }
  .cal-cell--friday { background: rgba(255, 153, 153, 0.12); }
  .cal-cell--saturday { background: rgba(255, 241, 194, 0.15); }
  .cal-cell--sunday { background: rgba(255, 215, 221, 0.15); }
  /* Lighter shades for empty cells */
  .cal-cell--empty.cal-cell--monday { background: rgba(194, 182, 252, 0.06); }
  .cal-cell--empty.cal-cell--tuesday { background: rgba(133, 171, 230, 0.06); }
  .cal-cell--empty.cal-cell--wednesday { background: rgba(186, 255, 201, 0.06); }
  .cal-cell--empty.cal-cell--thursday { background: rgba(255, 204, 153, 0.08); }
  .cal-cell--empty.cal-cell--friday { background: rgba(255, 153, 153, 0.06); }
  .cal-cell--empty.cal-cell--saturday { background: rgba(255, 241, 194, 0.08); }
  .cal-cell--empty.cal-cell--sunday { background: rgba(255, 215, 221, 0.08); }
  .cal-cell:hover { background: rgba(250, 250, 252, 0.95) !important; }
  
  .cal-cell-head { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
  .cal-day-number { font-weight: 400; color: var(--color-text-dark); font-family: 'Play', sans-serif; }
  .cal-actions { display: flex; gap: 4px; position: relative; z-index: 2; opacity: 0; transition: opacity 0.2s ease; pointer-events: auto; }
  .cal-actions :global(.icon-btn) { flex-shrink: 0; }
  .cal-cell:hover .cal-actions { opacity: 1; }
  /* replaced by IconButton */
  .cal-items { display: flex; flex-direction: column; gap: 4px; }
  .cal-event { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 8px; cursor: pointer; background: var(--color-bg-admin-button); color: var(--color-text-dark); transition: transform var(--animation-duration-transition), background var(--animation-duration-transition); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-event:hover { transform: translateY(-1px); }
  .cal-event-time { font-weight: var(--font-weight-medium); color: var(--color-text-muted); }
  .cal-event-icon { display:inline-flex; color: var(--color-soft-blue); }
  .cal-event--planned { background: rgba(194, 182, 252, 0.35); border-left: 3px solid var(--color-purple-light); }
  .cal-event--in_progress { background: rgba(133, 171, 230, 0.30); border-left: 3px solid var(--color-soft-blue); }
  .cal-event--completed { background: rgba(186, 255, 201, 0.45); border-left: 3px solid var(--color-pastel-green); }
  .cal-event--cancelled { background: rgba(255, 77, 77, 0.15); border-left: 3px solid var(--color-danger-red); }
  .cal-note { background: #fff7df; border-left: 3px solid #ffc107; padding: 4px 6px; border-radius: 8px; cursor: pointer; display:flex; align-items:center; gap:6px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-note-icon { display:inline-flex; color:#ff9800; }

  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; animation: fadeIn var(--animation-duration-transition) ease; z-index: 1000; }
  .modal { width: min(680px, 92vw); background: var(--color-block-bg); border: 1px solid var(--color-block-border); border-radius: 12px; padding: 18px; box-shadow: 0 10px 30px var(--color-shadow); animation: zoomIn var(--animation-duration-transition) ease; }
  .row { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
  /* buttons are now from UI kit */
  .cal-error { color: var(--color-error); background: var(--color-error-bg); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes zoomIn { from { transform: scale(.98); opacity: .9; } to { transform: scale(1); opacity: 1; } }

  @media (max-width: 1024px) {
    .cal-grid { grid-template-columns: repeat(7, minmax(95px, 1fr)); min-width: 665px; }
    .cal-cell { min-height: 100px; }
  }
  @media (max-width: 768px) {
    .cal-grid { grid-template-columns: repeat(7, minmax(90px, 1fr)); gap: 6px; min-width: 640px; }
    .cal-cell { min-height: 96px; }
    .cal-actions { gap: 4px; }
    .cal-filters { width: 100%; }
    /* On touch devices, show actions without hover */
    .cal-actions { opacity: 1; }
    .cal-title { font-size: 1.25rem; }
  }
  @media (max-width: 480px) {
    .cal-grid { grid-template-columns: repeat(7, minmax(72px, 1fr)); gap: 4px; min-width: 504px; }
    .cal-cell { min-height: 88px; }
    .cal-day-number { font-size: 0.9rem; }
    .cal-event { padding: 3px 5px; }
    .cal-event-time { display:none; }
    .cal-title { font-size: 1.1rem; }
  }
</style>


