<script lang="ts" setup>
import { $t } from '#/locales';

/** 与 sheet-editor 分区布局一致的字段占位配置 */
const sections = [
  {
    title: () => $t('page.quote.sections.basic'),
    fields: [
      { span: 1 },
      { span: 1 },
      { span: 1 },
      { span: 3, tall: true },
      { span: 1 },
      { span: 1 },
    ],
  },
  {
    title: () => $t('page.quote.sections.serviceFees'),
    fields: [{ span: 1 }, { span: 1 }],
  },
  {
    title: () => $t('page.quote.sections.truckExtras'),
    fields: [
      { span: 1 },
      { span: 1 },
      { span: 1 },
      { span: 1 },
      { span: 3, tall: true },
    ],
  },
  {
    title: () => $t('page.quote.sections.fumigation'),
    fields: [{ span: 1 }, { span: 1 }],
  },
  {
    title: () => $t('page.quote.sections.docInsuranceAgent'),
    fields: [{ span: 1 }, { span: 1 }, { span: 1 }],
  },
  {
    title: () => $t('page.quote.sections.sheetRemark'),
    fields: [{ span: 3, tall: true, rows: 4 }],
  },
  {
    title: () => $t('page.quote.sections.dataSource'),
    table: true,
  },
] as const;
</script>

<template>
  <div class="quote-sheet-editor-skeleton" aria-busy="true" aria-live="polite">
    <section
      v-for="(section, index) in sections"
      :key="index"
      class="quote-editor-section"
    >
      <div class="quote-editor-section__head">
        <span class="quote-editor-section__title">{{ section.title() }}</span>
      </div>
      <div class="quote-editor-section__body">
        <div v-if="section.table" class="quote-skeleton-table">
          <div class="quote-skeleton-table__head">
            <span
              v-for="col in 4"
              :key="col"
              class="quote-skeleton-block"
            ></span>
          </div>
          <div v-for="row in 3" :key="row" class="quote-skeleton-table__row">
            <span
              v-for="col in 4"
              :key="col"
              class="quote-skeleton-block"
            ></span>
          </div>
        </div>
        <div v-else class="quote-sheet-fields">
          <div
            v-for="(field, fieldIndex) in section.fields"
            :key="fieldIndex"
            class="quote-skeleton-field"
            :class="{
              'quote-sheet-field--full': field.span > 1,
            }"
          >
            <span
              class="quote-skeleton-field__label quote-skeleton-block"
            ></span>
            <span
              class="quote-skeleton-field__control quote-skeleton-block"
              :style="{
                height: field.rows ? `${field.rows * 22 + 8}px` : undefined,
              }"
            ></span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
