<script setup>
import ParentLayout from "@vuepress/theme-default/layouts/Layout.vue";
</script>

<script>
let showPageNumbers = true;

function switchPageNumber() {
  // event.preventDefault()

  showPageNumbers = !showPageNumbers

  const pageNumberList = document.querySelectorAll('.book-page-number')

  if (showPageNumbers) {

    for (let i = 0; i < pageNumberList.length; i++) {
      let pageNumber = pageNumberList[i]
      pageNumber.classList.remove('hide')
    }
  } else {
    for (let i = 0; i < pageNumberList.length; i++) {
      let pageNumber = pageNumberList[i]
      pageNumber.classList.add('hide')
    }
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
    <template #navbar-before>
      <div v-on:click="showPageNumbersButtonClick">PN</div>
    </template>
  </ParentLayout>
</template>

<style lang="css">

</style>
