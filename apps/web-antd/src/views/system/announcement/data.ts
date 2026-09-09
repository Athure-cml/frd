import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AnnouncementApi } from '#/api/system/announcement';

import { formatDateTime } from '@vben/utils';

import dayjs from 'dayjs';

import { $t } from '#/locales';

import { buildOperationColumn } from '../shared/columns';

const t = (key: string, params?: any[]) =>
  params
    ? $t(`page.system.announcementPage.${key}`, params)
    : $t(`page.system.announcementPage.${key}`);

export function formatAnnouncementDateTime(value?: null | string) {
  if (!value) {
    return '—';
  }
  return formatDateTime(value);
}

export function formatAnnouncementExpiresAt(value?: null | string) {
  if (!value) {
    return t('noExpiry');
  }
  return formatDateTime(value);
}

export function formatValidDaysLabel(validDays?: null | number) {
  if (!validDays || validDays <= 0) {
    return t('noExpiry');
  }
  return t('validDaysLabel', [validDays]);
}

export function formatContentPreview(value?: null | string) {
  if (!value) {
    return '—';
  }
  const text = stripHtmlText(value);
  if (!text) {
    return '—';
  }
  if (text.length <= 48) {
    return text;
  }
  return `${text.slice(0, 48)}…`;
}

export function stripHtmlText(value?: null | string) {
  if (!value) {
    return '';
  }
  return String(value)
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/&nbsp;/gi, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function isEmptyRichContent(value?: null | string) {
  return stripHtmlText(value).length === 0;
}

/** 兼容历史纯文本公告，载入富文本编辑器时转为 HTML */
export function normalizeRichContent(value?: null | string) {
  if (!value) {
    return '';
  }
  const text = String(value).trim();
  if (!text) {
    return '';
  }
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replaceAll('\n', '<br>')}</p>`)
    .join('');
}

export function getAnnouncementStatusLabel(
  status: AnnouncementApi.AnnouncementStatus,
) {
  return t(`status.${status.toLowerCase()}`);
}

export function getAnnouncementStatusColor(
  status: AnnouncementApi.AnnouncementStatus,
) {
  switch (status) {
    case 'DISABLED': {
      return 'error';
    }
    case 'DRAFT': {
      return 'default';
    }
    case 'EXPIRED': {
      return 'warning';
    }
    case 'PUBLISHED': {
      return 'success';
    }
    case 'SCHEDULED': {
      return 'processing';
    }
    default: {
      return 'default';
    }
  }
}

export function canDisableAnnouncement(row: AnnouncementApi.Announcement) {
  return row.status === 'PUBLISHED' || row.status === 'SCHEDULED';
}

export function isPublishedLikeStatus(
  status: AnnouncementApi.AnnouncementStatus,
) {
  return (
    status === 'PUBLISHED' || status === 'EXPIRED' || status === 'DISABLED'
  );
}

export function shouldShowReadStats(
  status: AnnouncementApi.AnnouncementStatus,
) {
  return (
    status === 'PUBLISHED' || status === 'EXPIRED' || status === 'DISABLED'
  );
}

export function useAnnouncementSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: t('searchPlaceholders.keyword'),
      },
      fieldName: 'keyword',
      label: t('fields.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: getAnnouncementStatusLabel('DRAFT'), value: 'DRAFT' },
          {
            label: getAnnouncementStatusLabel('SCHEDULED'),
            value: 'SCHEDULED',
          },
          {
            label: getAnnouncementStatusLabel('PUBLISHED'),
            value: 'PUBLISHED',
          },
          { label: getAnnouncementStatusLabel('EXPIRED'), value: 'EXPIRED' },
          { label: getAnnouncementStatusLabel('DISABLED'), value: 'DISABLED' },
        ],
      },
      fieldName: 'status',
      label: t('fields.status'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: t('searchPlaceholders.createdBy'),
      },
      fieldName: 'createdByName',
      label: t('fields.createdBy'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'publishedRange',
      label: t('fields.publishedAt'),
    },
  ];
}

export function useAnnouncementFormSchema(options?: {
  hidePublishOptions?: boolean;
}): VbenFormSchema[] {
  const hidePublishOptions = options?.hidePublishOptions ?? false;
  const schema: VbenFormSchema[] = [
    {
      component: 'Input',
      componentProps: {
        maxlength: 128,
        placeholder: t('placeholders.title'),
        showCount: true,
      },
      fieldName: 'title',
      formItemClass: 'col-span-full',
      label: t('fields.title'),
      rules: 'required',
    },
  ];

  if (!hidePublishOptions) {
    schema.push(
      {
        component: 'RadioGroup',
        componentProps: {
          buttonStyle: 'solid',
          options: [
            { label: t('publishMode.immediate'), value: 'IMMEDIATE' },
            { label: t('publishMode.scheduled'), value: 'SCHEDULED' },
          ],
          optionType: 'button',
        },
        defaultValue: 'IMMEDIATE',
        fieldName: 'publishMode',
        formItemClass: 'col-span-full sys-announcement-publish-mode',
        label: t('fields.publishMode'),
      },
      {
        component: 'DatePicker',
        componentProps: {
          class: 'w-full',
          showTime: true,
          valueFormat: 'YYYY-MM-DD HH:mm:ss',
        },
        dependencies: {
          show(values) {
            return values?.publishMode === 'SCHEDULED';
          },
          triggerFields: ['publishMode'],
        },
        fieldName: 'scheduledAt',
        formItemClass: 'md:col-span-1',
        label: t('fields.scheduledAt'),
        rules: 'required',
      },
    );
  }

  schema.push(
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 1,
        placeholder: t('placeholders.validDays'),
      },
      fieldName: 'validDays',
      formItemClass: hidePublishOptions
        ? 'col-span-full md:col-span-1'
        : 'md:col-span-1',
      help: t('hints.validDays'),
      label: t('fields.validDays'),
    },
    {
      component: 'RichEditor',
      componentProps: {
        maxHeight: 360,
        minHeight: 280,
        placeholder: t('placeholders.content'),
        previewable: true,
      },
      fieldName: 'content',
      formItemClass:
        'col-span-full sys-announcement-content-field sys-announcement-rich-field',
      label: t('fields.content'),
      rules: 'required',
    },
  );

  return schema;
}

export function useAnnouncementColumns(
  onActionClick: OnActionClickFn<AnnouncementApi.Announcement>,
  canManage = false,
): VxeTableGridOptions<AnnouncementApi.Announcement>['columns'] {
  const columns: VxeTableGridOptions<AnnouncementApi.Announcement>['columns'] =
    [
      {
        field: 'title',
        fixed: 'left',
        minWidth: 180,
        showOverflow: 'tooltip',
        title: t('fields.title'),
      },
      {
        field: 'content',
        formatter: ({ cellValue }) => formatContentPreview(cellValue),
        minWidth: 160,
        showOverflow: 'tooltip',
        title: t('fields.content'),
      },
      {
        className: 'col-sys-num',
        field: 'publishedAt',
        formatter: ({ cellValue }) => formatAnnouncementDateTime(cellValue),
        title: t('fields.publishedAt'),
        width: 168,
      },
      {
        className: 'col-sys-num',
        field: 'expiresAt',
        formatter: ({ cellValue }) => formatAnnouncementExpiresAt(cellValue),
        title: t('fields.expiresAt'),
        width: 168,
      },
      {
        className: 'col-sys-num',
        field: 'validDays',
        formatter: ({ cellValue }) => formatValidDaysLabel(cellValue),
        title: t('fields.validDays'),
        width: 96,
      },
      {
        field: 'readCount',
        slots: { default: 'readStats' },
        title: t('fields.readStats'),
        width: 130,
      },
      {
        field: 'createdByName',
        formatter: ({ cellValue }) => cellValue || '—',
        showOverflow: 'tooltip',
        title: t('fields.createdBy'),
        width: 96,
      },
      {
        align: 'center',
        field: 'status',
        slots: { default: 'status' },
        title: t('fields.status'),
        width: 96,
      },
    ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    minWidth: 220,
    nameField: 'title',
    nameTitle: t('fields.title'),
    operationOptions: [
      'edit',
      {
        code: 'copy',
        text: t('actions.copy'),
      },
      {
        code: 'disable',
        show: canDisableAnnouncement,
        text: t('actions.disable'),
      },
      'delete',
    ],
    width: 220,
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function buildAnnouncementSavePayload(
  values: Record<string, any>,
  saveAction: AnnouncementApi.SaveAction,
): AnnouncementApi.SavePayload {
  return {
    content: String(values.content ?? '').trim(),
    saveAction,
    scheduledAt:
      saveAction === 'PUBLISH_SCHEDULED'
        ? (values.scheduledAt as string | undefined)
        : undefined,
    title: String(values.title ?? '').trim(),
    validDays: values.validDays ?? undefined,
  };
}

export function mapAnnouncementToFormValues(row: AnnouncementApi.Announcement) {
  return {
    content: normalizeRichContent(row.content),
    publishMode:
      row.status === 'SCHEDULED'
        ? 'SCHEDULED'
        : ('IMMEDIATE' as AnnouncementApi.PublishMode),
    scheduledAt: row.status === 'SCHEDULED' ? row.publishedAt : undefined,
    title: row.title,
    validDays: row.validDays ?? undefined,
  };
}

export function normalizeAnnouncementSearchValues(
  formValues: Record<string, any>,
) {
  const [startAt, endAt] = Array.isArray(formValues.publishedRange)
    ? formValues.publishedRange
    : [];
  return {
    createdByName: formValues.createdByName,
    endAt: endAt ? dayjs(endAt).format('YYYY-MM-DDTHH:mm:ss') : undefined,
    keyword: formValues.keyword,
    startAt: startAt ? dayjs(startAt).format('YYYY-MM-DDTHH:mm:ss') : undefined,
    status: formValues.status,
  };
}
