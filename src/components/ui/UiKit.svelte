<script>
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import Input from './Input.svelte';
  import Textarea from './Textarea.svelte';
  import Select from './Select.svelte';
  import Modal from './Modal.svelte';
  import Card from './Card.svelte';
  let open = false;
</script>

<div style="display:grid; gap:16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
  <Card title="Buttons">
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <IconButton title="icon">★</IconButton>
      <IconButton title="icon" variant="primary">★</IconButton>
    </div>
  </Card>
  <Card title="Inputs">
    <Input label="Имя" placeholder="Введите имя" />
    <Select label="Статус" options={[{label:'запланировано', value:'planned'}, {label:'в процессе', value:'in_progress'}]} />
    <Textarea label="Комментарий" placeholder="Введите текст" />
  </Card>
  <Card title="Modal">
    <Button on:click={() => open = true}>Открыть модалку</Button>
    <Modal bind:open title="Заголовок" onClose={() => open=false}>
      <p>Тело модалки</p>
      <div slot="actions">
        <Button variant="secondary" on:click={() => open=false}>Отмена</Button>
        <Button on:click={() => open=false}>Ок</Button>
      </div>
    </Modal>
  </Card>
</div>


