<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Toc } from '@vuepress/plugin-toc/client'
import { getHeaders } from '@vuepress/helper/client'

const headers = ref([])

onMounted(() => {
  headers.value = getHeaders({
    levels: [2, 2],
  })
})
</script>

<template>
  <Toc :headers="headers" />
</template>