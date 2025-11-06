import { defineClientConfig } from '@vuepress/client'
import Layout from './layouts/Layout.vue'
import Toc2 from './components/Toc2.vue'
import Toc3 from './components/Toc3.vue'
import Toc4 from './components/Toc4.vue'

// Функция для добавления отступов к разрядке
function applyRazradkaMargins() {
  document.querySelectorAll('p, div, li, section').forEach(block => {
    const nodes = block.childNodes;
    let hasTextBefore = false;

    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
        hasTextBefore = true;
      }
      if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('md-it-razradka')) {
        if (hasTextBefore) {
          node.classList.add('after-text');
        }
      }
    });
  });
}

export default defineClientConfig({
  layouts: {
    Layout,
  },
  enhance({ app, router }) {
    app.component('Toc2', Toc2)
    app.component('Toc3', Toc3)
    app.component('Toc4', Toc4)

    // Добавляем хук, который срабатывает при навигации
    router.afterEach(() => {
      setTimeout(() => {
        applyRazradkaMargins();
      }, 100);
    });
  },
})
