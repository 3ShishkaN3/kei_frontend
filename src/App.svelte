<script>
  import { Router, Route } from 'svelte-routing';
  import Home from './routes/Home.svelte';
  import Registration from './routes/Registration.svelte';
  import Login from './routes/Login.svelte';
  import Profile from './routes/Profile.svelte';
  import Info from './routes/Info.svelte';
  import Courses from './routes/Courses.svelte';
  import Lessons from './routes/Lessons.svelte';
  import Lesson from './routes/Lesson.svelte';
  import NotFound from './routes/NotFound.svelte';
  import Header from './components/Header.svelte';
  import Footer from './components/Footer.svelte';
  import NotificationsContainer from './components/utils/NotificationsContainer.svelte';
  import { tick, onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
  import { checkAuthStatus, user } from './stores/user.js';

  gsap.registerPlugin(ScrollTrigger);

  let currentPath = window.location.pathname; 

  $: {
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      currentPath = newPath;
      handlePathChange();
    }
  }

  async function handlePathChange() {
    await tick(); 
    ScrollTrigger.getAll().forEach((st) => st.kill(true)); 
  }

  onMount(async () => {
    await checkAuthStatus();
    currentPath = window.location.pathname;
  });

  let isAuthenticated;
  let userRole = null;
  user.subscribe(value => {
      isAuthenticated = value.isAuthenticated;
      userRole = value.role;
  });
</script>

<Router url={currentPath}>
  <Header />
  <NotificationsContainer />
  <main>
    <Route path="/" component={Home} />

    {#if !isAuthenticated}
      <Route path="/registration" component={Registration} />
      <Route path="/login" component={Login} />
    {/if}

    {#if isAuthenticated}
      <Route path="/profile" component={Profile} />
      <Route path="/info" component={Info} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:courseId/lessons" component={Lessons} />
      <Route path="/courses/:courseId/lessons/:lessonId" component={Lesson} />
      <Route path="/bonuses" component={NotFound} /> 
      <Route path="/statistics" component={NotFound} /> 
      <Route path="/calendar" component={NotFound} /> 
    {/if}
    
  </main>

  <Footer />
</Router>