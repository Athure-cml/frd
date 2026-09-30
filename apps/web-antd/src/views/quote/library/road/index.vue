<script lang="ts" setup>
import { useRoadSearchSchema } from '../../../cost-library/road/data';
import QuoteLibraryPage from '../components/quote-library-page.vue';
</script>

<template>
  <QuoteLibraryPage
    description-key="page.quote.library.roadDesc"
    edit-permission="cost:road:edit"
    export-filename="卡车报价库.xlsx"
    mode="road"
    :search-schema="useRoadSearchSchema"
    title-key="page.quote.library.road"
  />
</template>
