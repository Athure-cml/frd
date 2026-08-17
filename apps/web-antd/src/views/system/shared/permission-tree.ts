import type { TreeProps } from 'ant-design-vue';

import { $t } from '#/locales';

import {
  comparePermissionModules,
  getPermissionModuleLabel,
  resolvePermissionModule,
} from './module-labels';

export type PermissionTreeNode = NonNullable<TreeProps['treeData']>[number] & {
  children?: PermissionTreeNode[];
  permissionCode?: string;
};

type PermissionItem = { code: string; name: string };

type SharedLeafDef = {
  kind: 'shared';
  permissionCode: string;
  segment: string;
  titleKey: string;
};

type GroupDef = {
  kind: 'group';
  match: (code: string) => boolean;
  segment: string;
  titleKey: string;
};

type FolderDef = {
  children: GroupDef[];
  kind: 'folder';
  segment: string;
  titleKey: string;
};

type SubmenuDef = FolderDef | GroupDef | SharedLeafDef;

type MenuModuleDef = {
  children: SubmenuDef[];
  module: string;
  /** 覆盖 moduleLabels（可选，默认走 i18n moduleLabels） */
  titleKey?: string;
};

/**
 * 与 MenuRegistry 完全对齐：一级=主菜单，二级=子菜单（顺序一致）。
 * 不在此表中的权限（报表、内陆 POR、旧美国州等）不进入树。
 */
const MENU_SCHEMA: MenuModuleDef[] = [
  {
    module: 'dashboard',
    titleKey: 'page.dashboard.title',
    children: [
      {
        kind: 'shared',
        segment: 'workspace',
        titleKey: 'page.dashboard.workspace',
        permissionCode: 'dashboard:view',
      },
    ],
  },
  {
    module: 'quote',
    titleKey: 'page.quote.title',
    children: [
      {
        kind: 'shared',
        segment: 'analytics',
        titleKey: 'page.dashboard.analytics',
        permissionCode: 'dashboard:view',
      },
      {
        kind: 'group',
        segment: 'list',
        titleKey: 'page.quote.list',
        match: (code) => code.startsWith('quote:'),
      },
    ],
  },
  {
    module: 'cost',
    titleKey: 'page.costLibrary.title',
    children: [
      {
        kind: 'group',
        segment: 'road',
        titleKey: 'page.costLibrary.road',
        match: (code) => /^cost:road:(?!template)/.test(code),
      },
      {
        kind: 'group',
        segment: 'sea',
        titleKey: 'page.costLibrary.sea',
        match: (code) => /^cost:sea:(?!template)/.test(code),
      },
      {
        kind: 'group',
        segment: 'fumigation',
        titleKey: 'page.costLibrary.fumigation',
        match: (code) => /^cost:fumigation:(?!template)/.test(code),
      },
      {
        kind: 'folder',
        segment: 'templates',
        titleKey: 'page.costLibrary.template.menuTitle',
        children: [
          {
            kind: 'group',
            segment: 'road',
            titleKey: 'page.costLibrary.template.roadMenu',
            match: (code) => code.startsWith('cost:road:template:'),
          },
          {
            kind: 'group',
            segment: 'sea',
            titleKey: 'page.costLibrary.template.seaMenu',
            match: (code) => code.startsWith('cost:sea:template:'),
          },
          {
            kind: 'group',
            segment: 'fumigation',
            titleKey: 'page.costLibrary.template.fumigationMenu',
            match: (code) => code.startsWith('cost:fumigation:template:'),
          },
        ],
      },
    ],
  },
  {
    module: 'customer',
    titleKey: 'page.customer.title',
    children: [
      {
        kind: 'group',
        segment: 'customer',
        titleKey: 'page.customer.list',
        match: (code) => code.startsWith('customer:'),
      },
      {
        kind: 'group',
        segment: 'supplier_truck',
        titleKey: 'page.supplier.truckList',
        match: (code) => code.startsWith('supplier:truck:'),
      },
      {
        kind: 'group',
        segment: 'shipping_line',
        titleKey: 'page.shippingLine.list',
        match: (code) => code.startsWith('shipping_line:'),
      },
      {
        kind: 'group',
        segment: 'supplier_fumigation',
        titleKey: 'page.supplier.fumigationList',
        match: (code) => code.startsWith('supplier:fumigation:'),
      },
      {
        kind: 'group',
        segment: 'agent',
        titleKey: 'page.agent.list',
        match: (code) => code.startsWith('agent:'),
      },
      {
        kind: 'group',
        segment: 'supplier_yard',
        titleKey: 'page.supplier.yardList',
        match: (code) => code.startsWith('supplier:yard:'),
      },
      {
        kind: 'group',
        segment: 'supplier_other',
        titleKey: 'page.supplier.otherList',
        match: (code) => code.startsWith('supplier:other:'),
      },
    ],
  },
  {
    module: 'masterData',
    titleKey: 'page.masterData.title',
    children: [
      {
        kind: 'group',
        segment: 'currency',
        titleKey: 'page.masterData.currency',
        match: (code) => code.startsWith('currency:'),
      },
      {
        kind: 'group',
        segment: 'exchange_rate',
        titleKey: 'page.masterData.exchangeRate',
        match: (code) => code.startsWith('exchange_rate:'),
      },
      {
        kind: 'group',
        segment: 'unit',
        titleKey: 'page.masterData.unit',
        match: (code) => code.startsWith('unit:'),
      },
      {
        kind: 'group',
        segment: 'md_dest_address',
        titleKey: 'page.masterData.usStateZip',
        match: (code) => code.startsWith('md_dest_address:'),
      },
      {
        kind: 'group',
        segment: 'md_global_port',
        titleKey: 'page.masterData.globalPort',
        match: (code) => code.startsWith('md_global_port:'),
      },
      {
        kind: 'group',
        segment: 'md_container_type',
        titleKey: 'page.masterData.containerType',
        match: (code) => code.startsWith('md_container_type:'),
      },
    ],
  },
  {
    module: 'sys',
    titleKey: 'page.system.title',
    children: [
      {
        kind: 'group',
        segment: 'dept',
        titleKey: 'page.system.dept',
        match: (code) => code.startsWith('sys:dept:'),
      },
      {
        kind: 'group',
        segment: 'user',
        titleKey: 'page.system.user',
        match: (code) => code.startsWith('sys:user:'),
      },
      {
        kind: 'group',
        segment: 'role',
        titleKey: 'page.system.role',
        match: (code) => code.startsWith('sys:role:'),
      },
      {
        kind: 'group',
        segment: 'operation_log',
        titleKey: 'page.system.operationLog',
        match: (code) => code.startsWith('sys:operation_log:'),
      },
    ],
  },
  {
    module: 'ai',
    titleKey: 'page.system.moduleLabels.ai',
    children: [
      {
        kind: 'group',
        segment: 'xiaofurui',
        titleKey: 'page.ai.title',
        match: (code) => code.startsWith('ai:'),
      },
    ],
  },
];

function leafKey(permissionCode: string, alias?: string) {
  return alias ? `${permissionCode}#${alias}` : permissionCode;
}

function sortPermissions(items: PermissionItem[]) {
  return [...items].toSorted((a, b) => a.code.localeCompare(b.code));
}

function buildGroupChildren(
  module: string,
  segment: string,
  items: PermissionItem[],
): PermissionTreeNode[] {
  return sortPermissions(items).map((item) => ({
    key: item.code.includes(':')
      ? item.code
      : leafKey(item.code, `${module}:${segment}`),
    permissionCode: item.code,
    title: item.name,
  }));
}

function buildModuleFromSchema(
  def: MenuModuleDef,
  items: PermissionItem[],
  allPermissions: PermissionItem[],
): PermissionTreeNode[] {
  const remaining = new Set(items.map((item) => item.code));
  const children: PermissionTreeNode[] = [];
  const byCode = new Map(allPermissions.map((item) => [item.code, item]));

  for (const child of def.children) {
    if (child.kind === 'shared') {
      const perm = byCode.get(child.permissionCode);
      if (!perm) {
        continue;
      }
      // 仅当该权限本就归属本模块时，才从 remaining 移除（跨模块共享叶子不抢归属）
      if (resolvePermissionModule(child.permissionCode) === def.module) {
        remaining.delete(child.permissionCode);
      }
      children.push({
        key: leafKey(child.permissionCode, `${def.module}:${child.segment}`),
        permissionCode: child.permissionCode,
        title: $t(child.titleKey),
      });
      continue;
    }

    if (child.kind === 'folder') {
      const folderChildren: PermissionTreeNode[] = [];
      for (const group of child.children) {
        const matched = items.filter((item) => group.match(item.code));
        if (matched.length === 0) {
          continue;
        }
        for (const item of matched) {
          remaining.delete(item.code);
        }
        folderChildren.push({
          key: `group:${def.module}:${child.segment}:${group.segment}`,
          title: $t(group.titleKey),
          children: buildGroupChildren(
            def.module,
            `${child.segment}:${group.segment}`,
            matched,
          ),
        });
      }
      if (folderChildren.length === 0) {
        continue;
      }
      children.push({
        key: `group:${def.module}:${child.segment}`,
        title: $t(child.titleKey),
        children: folderChildren,
      });
      continue;
    }

    const matched = items.filter((item) => child.match(item.code));
    if (matched.length === 0) {
      continue;
    }
    for (const item of matched) {
      remaining.delete(item.code);
    }
    children.push({
      key: `group:${def.module}:${child.segment}`,
      title: $t(child.titleKey),
      children: buildGroupChildren(def.module, child.segment, matched),
    });
  }

  const leftovers = items.filter((item) => remaining.has(item.code));
  if (leftovers.length > 0) {
    children.push(...buildGroupChildren(def.module, 'other', leftovers));
  }

  return children;
}

function moduleTitle(def: MenuModuleDef) {
  if (def.titleKey) {
    const label = $t(def.titleKey);
    if (label !== def.titleKey) {
      return label;
    }
  }
  return getPermissionModuleLabel(def.module);
}

export function buildPermissionTree(
  permissions: PermissionItem[],
): PermissionTreeNode[] {
  const byModule = new Map<string, PermissionItem[]>();

  for (const item of permissions) {
    const module = resolvePermissionModule(item.code);
    if (!module) {
      continue;
    }
    const list = byModule.get(module) ?? [];
    list.push(item);
    byModule.set(module, list);
  }

  const schemaModules = new Set(MENU_SCHEMA.map((item) => item.module));
  const nodes: PermissionTreeNode[] = [];

  for (const def of MENU_SCHEMA) {
    const items = byModule.get(def.module);
    if (!items?.length) {
      continue;
    }
    const children = buildModuleFromSchema(def, items, permissions);
    if (children.length === 0) {
      continue;
    }
    nodes.push({
      key: `module:${def.module}`,
      title: moduleTitle(def),
      children,
    });
  }

  // 理论上不会走到：未在 schema 中的模块
  for (const [module, items] of [...byModule.entries()].toSorted(([a], [b]) =>
    comparePermissionModules(a, b),
  )) {
    if (schemaModules.has(module)) {
      continue;
    }
    nodes.push({
      key: `module:${module}`,
      title: getPermissionModuleLabel(module),
      children: buildGroupChildren(module, 'all', items),
    });
  }

  return nodes;
}

export function collectPermissionLeafCodes(
  permissions: PermissionItem[],
): string[] {
  return permissions
    .filter((item) => resolvePermissionModule(item.code) !== null)
    .map((item) => item.code);
}

/** 不在权限树中展示、但角色可能仍持有的权限码（保存时需保留） */
export function collectHiddenPermissionCodes(
  permissions: PermissionItem[],
): string[] {
  return permissions
    .filter((item) => resolvePermissionModule(item.code) === null)
    .map((item) => item.code);
}

export function collectPermissionTreeLeafKeys(
  nodes: PermissionTreeNode[],
): string[] {
  const keys: string[] = [];

  function walk(list: PermissionTreeNode[]) {
    for (const node of list) {
      if (node.children?.length) {
        walk(node.children);
      } else if (node.permissionCode) {
        keys.push(String(node.key));
      }
    }
  }

  walk(nodes);
  return keys;
}

export function collectPermissionTreeExpandableKeys(
  nodes: PermissionTreeNode[],
): string[] {
  const keys: string[] = [];

  function walk(list: PermissionTreeNode[]) {
    for (const node of list) {
      if (node.children?.length) {
        keys.push(String(node.key));
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return keys;
}

export function collectTreePermissionCodes(
  nodes: PermissionTreeNode[],
): Set<string> {
  const codes = new Set<string>();

  function walk(list: PermissionTreeNode[]) {
    for (const node of list) {
      if (node.children?.length) {
        walk(node.children);
      } else if (node.permissionCode) {
        codes.add(node.permissionCode);
      }
    }
  }

  walk(nodes);
  return codes;
}

/** 角色已选权限码 → 树上应勾选的叶子 key（含共享权限的多个别名节点） */
export function expandPermissionCodesToTreeKeys(
  permissionCodes: string[],
  nodes: PermissionTreeNode[],
): string[] {
  const codeSet = new Set(permissionCodes);
  const keys: string[] = [];

  function walk(list: PermissionTreeNode[]) {
    for (const node of list) {
      if (node.children?.length) {
        walk(node.children);
      } else if (node.permissionCode && codeSet.has(node.permissionCode)) {
        keys.push(String(node.key));
      }
    }
  }

  walk(nodes);
  return keys;
}

/** 树上勾选的 key → 去重后的权限码 */
export function collapseTreeKeysToPermissionCodes(
  checkedKeys: Array<number | string>,
  nodes: PermissionTreeNode[],
): string[] {
  const keySet = new Set(checkedKeys.map(String));
  const codes = new Set<string>();

  function walk(list: PermissionTreeNode[]) {
    for (const node of list) {
      if (node.children?.length) {
        walk(node.children);
      } else if (node.permissionCode && keySet.has(String(node.key))) {
        codes.add(node.permissionCode);
      }
    }
  }

  walk(nodes);
  return [...codes];
}

/** 合并树上勾选结果与不在树中的既有权限，避免误删隐藏权限 */
export function mergePermissionCodesWithHidden(
  treeSelectedCodes: string[],
  previousCodes: string[],
  treeCodes: Set<string>,
): string[] {
  const hidden = previousCodes.filter((code) => !treeCodes.has(code));
  return [...new Set([...treeSelectedCodes, ...hidden])];
}
