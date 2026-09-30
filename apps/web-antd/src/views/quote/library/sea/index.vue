<script lang="ts" setup>
import { useSeaSearchSchema } from '../../../cost-library/sea/data';
import QuoteLibraryPage from '../components/quote-library-page.vue';
</script>

<template>
  <QuoteLibraryPage
    description-key="page.quote.library.seaDesc"
    edit-permission="cost:sea:edit"
    export-filename="海运报价库.xlsx"
    mode="sea"
    :search-schema="useSeaSearchSchema"
    title-key="page.quote.library.sea"
  />
</template>
