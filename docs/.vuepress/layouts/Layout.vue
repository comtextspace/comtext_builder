<script setup>
import ParentLayout from "@vuepress/theme-default/layouts/Layout.vue";
</script>

<script>
let showPageNumbers = true;

function switchPageNumber() {
  // event.preventDefault()

  showPageNumbers = !showPageNumbers

  const pageNumberList = document.querySelectorAll('.book-page-number')
  const pnButton = document.querySelector('#pn-button')

  if (showPageNumbers) {

    for (let i = 0; i < pageNumberList.length; i++) {
      let pageNumber = pageNumberList[i]
      pageNumber.classList.remove('hide')
    }

    pnButton.classList.remove('bolder')
  } else {
    for (let i = 0; i < pageNumberList.length; i++) {
      let pageNumber = pageNumberList[i]
      pageNumber.classList.add('hide')
    }

    pnButton.classList.add('bolder')
  }

}

export default {
  methods: {
    showPageNumbersButtonClick(event) {
      switchPageNumber()
    }
  }
}
</script>


<template>
  <ParentLayout>
    <template #navbar-after>
      <div id="pn-button" title="Вкл/выкл отображение номеров страниц." v-on:click="showPageNumbersButtonClick">PN</div>
    </template>
  </ParentLayout>
</template>

<style lang="css">

</style>
