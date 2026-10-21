<script lang="ts" setup>
import { onMounted } from 'vue';

import { loadFumigationSupplierCache } from '../../../cost-library/fumigation/fumigation-supplier-cache';
import QuoteLibraryPage from '../components/quote-library-page.vue';
import { useQuoteLibraryFumigationSearchSchema } from '../shared/quote-library-search';

onMounted(() => {
  void loadFumigationSupplierCache();
});
</script>

<template>
  <QuoteLibraryPage
    description-key="page.quote.library.fumigationDesc"
    export-filename="熏蒸报价库.xlsx"
    mode="fumigation"
    :search-schema="useQuoteLibraryFumigationSearchSchema"
    title-key="page.quote.library.fumigation"
  />
</template>
