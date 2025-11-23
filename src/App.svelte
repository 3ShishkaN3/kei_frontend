<script>
  import { Router, Route } from "svelte-routing";
  import Home from "./routes/Home.svelte";
  import Registration from "./routes/Registration.svelte";
  import Login from "./routes/Login.svelte";
  import Profile from "./routes/Profile.svelte";
  import Info from "./routes/Info.svelte";
  import Courses from "./routes/Courses.svelte";
  import Lessons from "./routes/Lessons.svelte";
  import Lesson from "./routes/Lesson.svelte";
  import Practice from "./routes/Practice.svelte";
  import NotFound from "./routes/NotFound.svelte";
  import Statistics from "./routes/Statistics.svelte";
  import Bonuses from "./routes/Bonuses.svelte";
  import AchievementEditor from "./components/admin/AchievementEditor.svelte";
  import Header from "./components/Header.svelte";
  import Footer from "./components/Footer.svelte";
  import NotificationsContainer from "./components/utils/NotificationsContainer.svelte";
  import RouteListener from "./components/RouteListener.svelte";
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
  import { checkAuthStatus, user } from "./stores/user.js";

  gsap.registerPlugin(ScrollTrigger);

  onMount(async () => {
    await checkAuthStatus();
  });

  let isAuthenticated;
  let userRole = null;
  user.subscribe((value) => {
    isAuthenticated = value.isAuthenticated;
    userRole = value.role;
  });
</script>

<Router>
  <Header />
  <NotificationsContainer />
  <RouteListener />
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
      <Route
        path="/courses/:courseId/practice/:practiceId"
        component={Practice}
      />
      <Route path="/bonuses" component={Bonuses} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/calendar" component={NotFound} />
      <Route path="/admin/achievements/new" component={AchievementEditor} />
      <Route path="/admin/achievements/:id" component={AchievementEditor} />
    {/if}
  </main>

  <Footer />
</Router>
