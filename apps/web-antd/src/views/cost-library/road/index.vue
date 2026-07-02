<script lang="ts" setup>
import { $t } from '#/locales';

import CostLibraryPage from '../components/cost-library-page.vue';
import { getRoadRowName, useRoadColumns, useRoadSearchSchema } from './data';
import { useRoadBatchSchema } from './form-schema';
import Form from './modules/form.vue';

const roadBatchSchema = useRoadBatchSchema();
</script>

<template>
  <CostLibraryPage
    :batch-edit-schema="roadBatchSchema"
    :batch-edit-title="$t('page.costLibrary.actions.batchEditRoad')"
    :columns="useRoadColumns"
    :create-label="$t('page.costLibrary.actions.createRoad')"
    :description="$t('page.costLibrary.roadDesc')"
    edit-permission="cost:road:edit"
    export-filename="road-cost.xlsx"
    :form-component="Form"
    grid-class="cost-library-grid road-cost-grid"
    :get-row-name="getRoadRowName"
    :import-title="$t('page.costLibrary.actions.importRoad')"
    mode="road"
    scroll-x
    :search-schema="useRoadSearchSchema"
  />
</template>
