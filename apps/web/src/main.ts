import { createPinia, setActivePinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { i18n } from './i18n';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import './styles/main.css';
import './styles/auth.css';
import './styles/admin.css';

const app = createApp(App);
const pinia = createPinia();
setActivePinia(pinia);
app.use(pinia);
app.use(router);
app.use(i18n);

app.mount('#app');
void useAuthStore().init();
