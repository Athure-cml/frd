<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { readThemeColors } from '../shared/chart-theme';
import { quoteAmountTrend } from './mock-data';

const props = withDefaults(
  defineProps<{
    months?: string[];
    quoted?: number[];
    won?: number[];
  }>(),
  {
    months: () => [],
    quoted: () => [],
    won: () => [],
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
    : quoteAmountTrend.months;
  const quoted = hasLiveData ? props.quoted : quoteAmountTrend.quoted;
  const won = hasLiveData ? props.won : quoteAmountTrend.won;

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
        $t('page.analytics.chart.quotedAmount'),
        $t('page.analytics.chart.wonAmount'),
      ],
      top: 0,
    },
    series: [
      {
        areaStyle: { opacity: 0.08 },
        data: quoted,
        name: $t('page.analytics.chart.quotedAmount'),
        smooth: true,
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.08 },
        data: won,
        name: $t('page.analytics.chart.wonAmount'),
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) =>
        `${value} ${$t('page.analytics.chart.amountUnit')}`,
    },
    xAxis: {
      boundaryGap: false,
      data: months,
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        formatter: `{value} ${$t('page.analytics.chart.amountUnit')}`,
      },
      splitNumber: 4,
      type: 'value',
    },
  });
}

watch(
  () => [props.months, props.quoted, props.won],
  () => renderChart(),
  { deep: true, immediate: true },
);
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
