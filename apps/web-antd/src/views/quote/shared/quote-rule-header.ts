import { h } from 'vue';

import QuoteRuleLabel from './quote-rule-label.vue';

export function buildQuoteRuleHeaderSlot(title: string, hint: string) {
  return () => h(QuoteRuleLabel, { hint, label: title });
}
