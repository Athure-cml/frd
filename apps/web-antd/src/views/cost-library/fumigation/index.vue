<script lang="ts" setup>
import { $t } from '#/locales';

import CostLibraryPage from '../components/cost-library-page.vue';
import {
  getFumigationRowName,
  useFumigationBatchSchema,
  useFumigationColumns,
  useFumigationSearchSchema,
} from './data';
import Form from './modules/form.vue';
</script>

<template>
  <CostLibraryPage
    :batch-edit-schema="useFumigationBatchSchema()"
    :batch-edit-title="$t('page.costLibrary.actions.batchEditFumigation')"
    :columns="useFumigationColumns"
    :create-label="$t('page.costLibrary.actions.createFumigation')"
    :description="$t('page.costLibrary.fumigationDesc')"
    edit-permission="cost:fumigation:edit"
    export-filename="fumigation-cost.xlsx"
    :form-component="Form"
    :get-row-name="getFumigationRowName"
    grid-class="cost-library-grid fumigation-cost-grid"
    :import-title="$t('page.costLibrary.actions.importFumigation')"
    mode="fumigation"
    :scroll-x="true"
    :search-schema="useFumigationSearchSchema"
  />
</template>
