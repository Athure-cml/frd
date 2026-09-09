import type {
  VbenFormProps as FormProps,
  VbenFormSchema as FormSchema,
} from '@vben/common-ui';

import type { ComponentPropsMap, ComponentType } from './component';

import { setupVbenForm, useVbenForm as useForm, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import * as zod from 'zod';

async function initSetupVbenForm() {
  zod.setErrorMap((issue, ctx) => {
    if (
      issue.code === zod.ZodIssueCode.invalid_type &&
      (issue.received === 'undefined' || issue.received === 'null') &&
      issue.expected === 'string'
    ) {
      return { message: $t('ui.placeholder.input') };
    }
    return { message: ctx.defaultError };
  });

  setupVbenForm<ComponentType>({
    config: {
      // ant design vue组件库默认都是 v-model:value
      baseModelPropName: 'value',

      // 一些组件是 v-model:checked 或者 v-model:fileList
      modelPropNameMap: {
        Checkbox: 'checked',
        Radio: 'checked',
        RichEditor: 'modelValue',
        Switch: 'checked',
        Upload: 'fileList',
      },
    },
    defineRules: {
      // 输入项目必填国际化适配
      required: (value, _params, ctx) => {
        if (value === undefined || value === null || value.length === 0) {
          return $t('ui.formRules.required', [ctx.label]);
        }
        return true;
      },
      // 选择项目必填国际化适配
      selectRequired: (value, _params, ctx) => {
        if (value === undefined || value === null) {
          return $t('ui.formRules.selectRequired', [ctx.label]);
        }
        return true;
      },
    },
  });
}

const useVbenForm = useForm<ComponentType, ComponentPropsMap>;

export { initSetupVbenForm, useVbenForm, z };

export type VbenFormSchema = FormSchema<ComponentType, ComponentPropsMap>;
export type VbenFormProps = FormProps<ComponentType, ComponentPropsMap>;
