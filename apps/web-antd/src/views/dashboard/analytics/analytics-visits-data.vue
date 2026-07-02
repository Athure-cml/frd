<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';

import { readThemeColors } from '../shared/chart-theme';
import { getQuoteStatusDistribution } from './mock-data';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  const colors = readThemeColors();
  const distribution = getQuoteStatusDistribution();

  const statusColors: Record<string, string> = {
    draft: colors.warning,
    expired: colors.muted,
    lost: colors.destructive,
    pending: colors.warning,
    sent: colors.primary,
    won: colors.success,
  };

  renderEcharts({
    grid: {
      bottom: 24,
      containLabel: true,
      left: '2%',
      right: '8%',
      top: 8,
    },
    series: [
      {
        barMaxWidth: 28,
        data: distribution.map((item) => ({
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: statusColors[item.key],
          },
          value: item.value,
        })),
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
      data: distribution.map((item) => item.label),
      type: 'category',
    },
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
