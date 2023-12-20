import /* webpackPrefetch: true */ Layui from '@layui/layui-vue'
import(/* webpackPrefetch: true */ '@layui/layui-vue/lib/index.css')
import(/* webpackPrefetch: true */ './assets/main.css')

import {/* webpackPrefetch: true */ createApp} from "vue";
import /* webpackPrefetch: true */ standard from "figlet";
import /* webpackPrefetch: true */ figlet from "figlet";


import /* webpackPrefetch: true */ App from './App.vue'

const app = createApp(App)

// Try to ignore [Vue warn]: Failed to resolve component: router-link
app.config.warnHandler = function (msg, vm, trace) {
       if (msg.includes('Failed to resolve component: router-link')) {
         return
       }
       console.warn(msg, vm, trace)
}

figlet.parseFont("Standard", standard);

figlet.text(
    "Techzjc",
    {
        font: "Standard",
        horizontalLayout: "fitted",
        verticalLayout: "default",
        width: 80,
        whitespaceBreak: true,
    },
    function (_, data) {
        console.log(data + "\n" +
            "For any questions related to the code, please find me at https://www.github.com/g497813927"
        );
    }
);

console.log()

app.use(Layui).mount('#app')

