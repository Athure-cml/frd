<script lang="ts" setup>
import { onMounted } from 'vue';

import { useFumigationSearchSchema } from '../../../cost-library/fumigation/data';
import { loadFumigationSupplierCache } from '../../../cost-library/fumigation/fumigation-supplier-cache';
import QuoteLibraryPage from '../components/quote-library-page.vue';

onMounted(() => {
  void loadFumigationSupplierCache();
});
</script>

<template>
  <QuoteLibraryPage
    description-key="page.quote.library.fumigationDesc"
    edit-permission="cost:fumigation:edit"
    export-filename="熏蒸报价库.xlsx"
    mode="fumigation"
    :search-schema="useFumigationSearchSchema"
    title-key="page.quote.library.fumigation"
  />
</template>
