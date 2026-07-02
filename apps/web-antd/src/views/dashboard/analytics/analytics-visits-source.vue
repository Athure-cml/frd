<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { readThemeColors } from '../shared/chart-theme';
import { getTransportModeMix } from './mock-data';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  const colors = readThemeColors();
  const transportModeMix = getTransportModeMix();

  renderEcharts({
    color: [colors.primary, colors.success, colors.warning],
    legend: {
      bottom: 0,
      left: 'center',
    },
    series: [
      {
        data: transportModeMix,
        emphasis: {
          label: {
            fontSize: 14,
            fontWeight: 'bold',
            show: true,
          },
        },
        label: {
          formatter: '{b}\n{d}%',
          show: true,
        },
        radius: ['42%', '68%'],
        type: 'pie',
      },
    ],
    tooltip: {
      formatter: `{b}: {c} ${$t('page.analytics.chart.unit')} ({d}%)`,
      trigger: 'item',
    },
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
