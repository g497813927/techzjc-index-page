import /* webpackPrefetch: true */ Layui from '@layui/layui-vue'
import(/* webpackPrefetch: true */ '@layui/layui-vue/lib/index.css')
import(/* webpackPrefetch: true */ './assets/main.css')

import {/* webpackPrefetch: true */ createApp} from "vue";


import /* webpackPrefetch: true */ App from './App.vue'

const app = createApp(App)

// Try to ignore [Vue warn]: Failed to resolve component: router-link
app.config.warnHandler = function (msg, vm, trace) {
       if (msg.includes('Failed to resolve component: router-link')) {
         return
       }
       console.warn(msg, vm, trace)
}

app.use(Layui).mount('#app')

