<script>
  import { Router, Route } from 'svelte-routing';
  import Home from './routes/Home.svelte';
  import Registration from './routes/Registration.svelte';
  import Login from './routes/Login.svelte';
  import Header from './components/Header.svelte';
  import Footer from './components/Footer.svelte';
  import { tick } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

  gsap.registerPlugin(ScrollTrigger);

  let currentPath = '';

  $: async () => {
    const newPath = window.location.pathname; // Получаем текущий путь напрямую
    if (newPath !== currentPath) {
      currentPath = newPath;
      await tick(); // Ждём обновление DOM
      ScrollTrigger.getAll().forEach((st) => st.kill()); // Удаляем все ScrollTrigger
      document.querySelectorAll('.pin-spacer').forEach(el => el.remove()); // Удаляем остатки
    }
  };
</script>

<style>
  body {
    background: url('/background.jpg') no-repeat center center fixed;
    font-family: 'Montserrat', sans-serif;
  }
</style>

<Router>
  <Header />

  <main>
    <Route path="/" component={Home} key={currentPath} />
    <Route path="/registration" component={Registration} key={currentPath} />
    <Route path="/login" component={Login} key={currentPath} />
  </main>

  <Footer />
</Router>
