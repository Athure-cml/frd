<script lang="ts" setup>
import QuoteLibraryPage from '../components/quote-library-page.vue';
import { useQuoteLibrarySeaSearchSchema } from '../shared/quote-library-search';
</script>

<template>
  <QuoteLibraryPage
    description-key="page.quote.library.seaDesc"
    export-filename="海运报价库.xlsx"
    mode="sea"
    :search-schema="useQuoteLibrarySeaSearchSchema"
    title-key="page.quote.library.sea"
  />
</template>
