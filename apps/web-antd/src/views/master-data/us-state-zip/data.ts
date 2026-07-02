import type { VbenFormSchema } from '#/adapter/form';

export function useUsStateZipSearchSchema(
  stateOptions: { label: string; value: string }[],
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        placeholder: 'State / City / Zip code',
      },
      fieldName: 'keyword',
      label: '关键词',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: stateOptions,
        placeholder: '全部州',
      },
      fieldName: 'stateCode',
      label: 'State',
    },
  ];
}
