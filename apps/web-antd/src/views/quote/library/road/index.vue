<script lang="ts" setup>
import QuoteLibraryPage from '../components/quote-library-page.vue';
import { useQuoteLibraryRoadSearchSchema } from '../shared/quote-library-search';
</script>

<template>
  <QuoteLibraryPage
    description-key="page.quote.library.roadDesc"
    export-filename="卡车报价库.xlsx"
    mode="road"
    :search-schema="useQuoteLibraryRoadSearchSchema"
    title-key="page.quote.library.road"
  />
</template>
