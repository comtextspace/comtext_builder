import { defineClientConfig } from '@vuepress/client'
import Layout from './layouts/Layout.vue'
import Toc2 from './components/Toc2.vue'
import Toc3 from './components/Toc3.vue'
import Toc4 from './components/Toc4.vue'

export default defineClientConfig({
  layouts: {
    Layout,
  },
  enhance({ app }) {
    app.component('Toc2', Toc2)
    app.component('Toc3', Toc3)
    app.component('Toc4', Toc4)
  },
})
