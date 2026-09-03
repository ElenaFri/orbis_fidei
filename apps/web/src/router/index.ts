import { createRouter, createWebHistory } from 'vue-router';

const HomeView = () => import('@/views/HomeView.vue');
const SearchView = () => import('@/views/SearchView.vue');
const NotFoundView = () => import('@/views/NotFoundView.vue');

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/search', name: 'search', component: SearchView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
});
