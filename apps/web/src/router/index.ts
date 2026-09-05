import { createRouter, createWebHistory } from 'vue-router';

import { adminGuard } from './guards.js';

const HomeView = () => import('@/views/HomeView.vue');
const SearchView = () => import('@/views/SearchView.vue');
const AuthView = () => import('@/views/AuthView.vue');
const ArticleView = () => import('@/views/ArticleView.vue');
const NotFoundView = () => import('@/views/NotFoundView.vue');
const AdminLayout = () => import('@/views/admin/AdminLayout.vue');
const AdminSourcesView = () => import('@/views/admin/AdminSourcesView.vue');
const AdminCategoriesView = () => import('@/views/admin/AdminCategoriesView.vue');
const AdminArticlesView = () => import('@/views/admin/AdminArticlesView.vue');

declare module 'vue-router' {
  interface RouteMeta {
    /** Permission key required to access the route (e.g. "source.manage"). */
    requiresPermission?: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/search', name: 'search', component: SearchView },
    { path: '/login', name: 'login', component: AuthView },
    { path: '/a/:slug', name: 'article', component: ArticleView },
    {
      path: '/admin',
      component: AdminLayout,
      children: [
        { path: '', redirect: { name: 'admin-sources' } },
        {
          path: 'sources',
          name: 'admin-sources',
          component: AdminSourcesView,
          meta: { requiresPermission: 'source.manage' },
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: AdminCategoriesView,
          meta: { requiresPermission: 'category.manage' },
        },
        {
          path: 'articles',
          name: 'admin-articles',
          component: AdminArticlesView,
          meta: { requiresPermission: 'article.create' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
});

router.beforeEach(adminGuard);
