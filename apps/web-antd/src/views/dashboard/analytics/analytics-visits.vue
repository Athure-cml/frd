<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { readThemeColors } from '../shared/chart-theme';
import { monthlyQuoteVolume } from './mock-data';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  const colors = readThemeColors();

  renderEcharts({
    color: [colors.primary],
    grid: {
      bottom: 24,
      containLabel: true,
      left: '2%',
      right: '2%',
      top: 16,
    },
    series: [
      {
        barMaxWidth: 48,
        data: monthlyQuoteVolume.counts,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        name: $t('page.analytics.chart.quoteCount'),
        type: 'bar',
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${value} ${$t('page.analytics.chart.unit')}`,
    },
    xAxis: {
      data: monthlyQuoteVolume.months,
      type: 'category',
    },
    yAxis: {
      splitNumber: 4,
      type: 'value',
    },
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
