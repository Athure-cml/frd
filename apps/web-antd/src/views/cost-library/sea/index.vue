<script lang="ts" setup>
import { $t } from '#/locales';

import CostLibraryPage from '../components/cost-library-page.vue';
import { useFreightBatchSchema } from '../shared/freight-schema';
import { getSeaRowName, useSeaColumns, useSeaSearchSchema } from './data';
import Form from './modules/form.vue';

const freightBatchSchema = useFreightBatchSchema();
</script>

<template>
  <CostLibraryPage
    :batch-edit-schema="freightBatchSchema"
    :batch-edit-title="$t('page.costLibrary.actions.batchEditSea')"
    :columns="useSeaColumns"
    :create-label="$t('page.costLibrary.actions.createSea')"
    :description="$t('page.costLibrary.seaDesc')"
    edit-permission="cost:sea:edit"
    export-filename="sea-cost.xlsx"
    :form-component="Form"
    :get-row-name="getSeaRowName"
    :import-title="$t('page.costLibrary.actions.importSea')"
    mode="sea"
    :search-schema="useSeaSearchSchema"
  />
</template>
