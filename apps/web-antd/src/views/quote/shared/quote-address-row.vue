<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Form } from 'ant-design-vue';

import { resolveDestZips } from '#/api/master-data/us-state-zip';
import { $t } from '#/locales';

import QuoteCitySelect from './quote-city-select.vue';
import QuoteStateSelect from './quote-state-select.vue';
import ZipCodeFields from './zip-code-fields.vue';

/**
 * 录入地址三件套：Zip code → State → City（与列表列顺序一致）。
 *
 * 规则：
 * 1. 必须先选 State 才能选 City，City 选项只来自所选 State；
 * 2. City 选定后按 City+State 反查主数据：唯一 ZIP 自动补全，多个 ZIP 时给出候选让用户选，
 *    无 ZIP 主数据时提示可留空；换 City 时旧 ZIP 自动清空并重新解析；
 * 3. 直接填 ZIP 时按 ZIP 反带 City/State（主数据中 ZIP 唯一确定 City+State）；
 * 4. 换 State 视为地址重定位，清空 City 与 ZIP，避免交叉不一致。
 */
const props = defineProps<{ disabled?: boolean }>();

const zipCode = defineModel<string>('zipCode', { default: '' });
const city = defineModel<string>('city', { default: '' });
const state = defineModel<string>('state', { default: '' });

const zipCandidates = ref<string[]>([]);
const zipHint = ref('');

const readOnly = computed(() => Boolean(props.disabled));

async function autoFillZip(cityName: string, stateCode: string) {
  if (!cityName || !stateCode) {
    return;
  }
  try {
    const [item] = await resolveDestZips([
      { city: cityName, state: stateCode },
    ]);
    if (!item) {
      return;
    }
    if (item.canonicalCity && item.canonicalCity !== city.value) {
      city.value = item.canonicalCity;
    }
    if ((zipCode.value ?? '').trim()) {
      return;
    }
    if (item.status === 'unique' && item.zipCode) {
      zipCode.value = item.zipCode;
      zipCandidates.value = [];
      zipHint.value = $t('page.quote.sheet.zipAutoFilled');
      return;
    }
    if (item.status === 'ambiguous') {
      zipCandidates.value = item.candidates ?? [];
      zipHint.value = $t('page.quote.sheet.zipPickHint', [
        String(zipCandidates.value.length),
      ]);
      return;
    }
    if (item.status === 'notFound') {
      zipCandidates.value = [];
      zipHint.value = $t('page.quote.sheet.zipNotFoundHint');
    }
  } catch {
    // 解析失败不阻塞录入，保留手填值
  }
}

function onStateChange(_value: unknown) {
  zipCandidates.value = [];
  zipHint.value = '';
  if (city.value) {
    city.value = '';
  }
  if (zipCode.value) {
    zipCode.value = '';
  }
}

function onCityPicked(value: unknown) {
  const cityName = String(value ?? '').trim();
  if (!cityName) {
    return;
  }
  city.value = cityName;
  zipCandidates.value = [];
  zipHint.value = '';
  // 换城市后旧 ZIP 必然失效：先清空，再按新的 City+State 重新解析/补全
  if (zipCode.value) {
    zipCode.value = '';
  }
  void autoFillZip(cityName, (state.value ?? '').trim());
}
</script>

<template>
  <div class="quote-sheet-location-row">
    <Form.Item :label="$t('page.quote.sheet.zipCode')">
      <ZipCodeFields
        v-model:zip-code="zipCode"
        v-model:city="city"
        v-model:state="state"
        :disabled="readOnly"
        :suggestions="zipCandidates"
      />
      <div v-if="zipHint && !readOnly" class="text-muted-foreground text-xs">
        {{ zipHint }}
      </div>
    </Form.Item>
    <Form.Item :label="$t('page.quote.sheet.state')">
      <QuoteStateSelect
        v-model="state"
        :disabled="readOnly"
        @change="onStateChange"
      />
    </Form.Item>
    <Form.Item :label="$t('page.quote.sheet.city')">
      <QuoteCitySelect
        v-model="city"
        :disabled="readOnly"
        :state="state"
        @select="onCityPicked"
      />
    </Form.Item>
  </div>
</template>
