import Layui from '@layui/layui-vue'
import '@layui/layui-vue/lib/index.css'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// Try to ignore [Vue warn]: Failed to resolve component: router-link
app.config.warnHandler = function (msg, vm, trace) {
       if (msg.includes('Failed to resolve component: router-link')) {
         return
       }
       console.warn(msg, vm, trace)
}

app.use(Layui).mount('#app')

