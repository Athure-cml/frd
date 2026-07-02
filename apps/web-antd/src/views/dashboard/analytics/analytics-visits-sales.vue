<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { readThemeColors } from '../shared/chart-theme';
import { topRoutes } from './mock-data';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  const colors = readThemeColors();

  renderEcharts({
    color: [colors.primary],
    grid: {
      bottom: 8,
      containLabel: true,
      left: '2%',
      right: '12%',
      top: 8,
    },
    series: [
      {
        barMaxWidth: 20,
        data: topRoutes.map((item) => item.value),
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: {
          position: 'right',
          show: true,
        },
        type: 'bar',
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${value} ${$t('page.analytics.chart.unit')}`,
    },
    xAxis: {
      splitNumber: 4,
      type: 'value',
    },
    yAxis: {
      axisLabel: {
        overflow: 'truncate',
        width: 120,
      },
      data: topRoutes.map((item) => item.name),
      type: 'category',
    },
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
