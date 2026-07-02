<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { readThemeColors } from '../shared/chart-theme';
import { quoteAmountTrend } from './mock-data';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  const colors = readThemeColors();

  renderEcharts({
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
        data: quoteAmountTrend.quoted,
        name: $t('page.analytics.chart.quotedAmount'),
        smooth: true,
        type: 'line',
        areaStyle: { opacity: 0.08 },
      },
      {
        data: quoteAmountTrend.won,
        name: $t('page.analytics.chart.wonAmount'),
        smooth: true,
        type: 'line',
        areaStyle: { opacity: 0.08 },
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) =>
        `${value} ${$t('page.analytics.chart.amountUnit')}`,
    },
    xAxis: {
      boundaryGap: false,
      data: quoteAmountTrend.months,
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
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
