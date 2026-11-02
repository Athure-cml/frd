<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { readThemeColors } from '../shared/chart-theme';
import { quoteCountTrend } from './mock-data';

const props = withDefaults(
  defineProps<{
    inquiries?: number[];
    months?: string[];
    quoted?: number[];
  }>(),
  {
    inquiries: () => [],
    months: () => [],
    quoted: () => [],
  },
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function formatMonthLabel(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }
  const month = Number(match[2]);
  return $t('page.workspace.monthLabel', [month]);
}

function renderChart() {
  const colors = readThemeColors();
  const hasLiveData = props.months.length > 0;
  const months = hasLiveData
    ? props.months.map((item) => formatMonthLabel(item))
    : quoteCountTrend.months;
  const inquiries = hasLiveData ? props.inquiries : quoteCountTrend.inquiries;
  const quoted = hasLiveData ? props.quoted : quoteCountTrend.quoted;

  void renderEcharts({
    color: [colors.primary, colors.success],
    grid: {
      bottom: 24,
      containLabel: true,
      left: '2%',
      right: '2%',
      top: 40,
    },
    legend: {
      data: [
        $t('page.analytics.chart.inquiryCount'),
        $t('page.analytics.chart.quotedCount'),
      ],
      top: 0,
    },
    series: [
      {
        areaStyle: { opacity: 0.08 },
        data: inquiries,
        name: $t('page.analytics.chart.inquiryCount'),
        smooth: true,
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.08 },
        data: quoted,
        name: $t('page.analytics.chart.quotedCount'),
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${value} ${$t('page.analytics.chart.unit')}`,
    },
    xAxis: {
      boundaryGap: false,
      data: months,
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        formatter: `{value} ${$t('page.analytics.chart.unit')}`,
      },
      minInterval: 1,
      splitNumber: 4,
      type: 'value',
    },
  });
}

watch(
  () => [props.months, props.inquiries, props.quoted],
  () => renderChart(),
  { deep: true, immediate: true },
);
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
