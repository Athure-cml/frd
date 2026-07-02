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

interface TreeBranch {
  children: Map<string, TreeBranch>;
  label: string;
  permission?: PermissionItem;
  segment: string;
}

function getPermissionGroupLabel(module: string, segment: string) {
  if (module === 'cost') {
    const key = `page.system.permissionGroups.${segment}Cost`;
    const label = $t(key);
    if (label !== key) {
      return label;
    }
  }
  if (module === 'template') {
    const key = `page.system.permissionGroups.${segment}Template`;
    const label = $t(key);
    if (label !== key) {
      return label;
    }
  }
  if (module === 'sys') {
    const key = `page.system.permissionGroups.${segment}`;
    const label = $t(key);
    if (label !== key) {
      return label;
    }
  }
  return segment;
}

function getPermissionPathSegments(module: string, code: string): string[] {
  const templateMatch = code.match(
    /^cost:(road|sea|fumigation|rail):template:(.+)$/,
  );
  if (module === 'template' && templateMatch?.[1] && templateMatch[2]) {
    return [templateMatch[1], templateMatch[2]];
  }

  const costMatch = code.match(/^cost:(road|sea|fumigation|rail):(.+)$/);
  if (module === 'cost' && costMatch?.[1] && costMatch[2]) {
    return [costMatch[1], costMatch[2]];
  }

  const sysMatch = code.match(/^sys:([^:]+):(.+)$/);
  if (module === 'sys' && sysMatch?.[1] && sysMatch[2]) {
    return [sysMatch[1], sysMatch[2]];
  }

  const parts = code.split(':');
  return parts.length > 1 ? [parts.slice(1).join(':')] : [code];
}

function createBranch(segment: string, label: string): TreeBranch {
  return {
    children: new Map(),
    label,
    segment,
  };
}

function insertPermission(
  root: Map<string, TreeBranch>,
  module: string,
  segments: string[],
  permission: PermissionItem,
) {
  if (segments.length === 0) {
    return;
  }

  if (segments.length === 1) {
    const segment = segments[0]!;
    const branch = root.get(segment) ?? createBranch(segment, permission.name);
    branch.permission = permission;
    branch.label = permission.name;
    root.set(segment, branch);
    return;
  }

  const head = segments[0];
  if (!head) {
    return;
  }
  const rest = segments.slice(1);
  const branch =
    root.get(head) ?? createBranch(head, getPermissionGroupLabel(module, head));
  insertPermission(branch.children, module, rest, permission);
  root.set(head, branch);
}

function branchToNodes(
  branches: Map<string, TreeBranch>,
  keyPrefix: string,
): PermissionTreeNode[] {
  return [...branches.values()]
    .sort((a, b) => a.segment.localeCompare(b.segment))
    .flatMap((branch) => {
      const branchKey = `${keyPrefix}:${branch.segment}`;
      const childNodes = branchToNodes(branch.children, branchKey);

      if (branch.permission && childNodes.length === 0) {
        return [
          {
            key: branch.permission.code,
            permissionCode: branch.permission.code,
            title: branch.permission.name,
          },
        ];
      }

      if (branch.permission) {
        childNodes.push({
          key: branch.permission.code,
          permissionCode: branch.permission.code,
          title: branch.permission.name,
        });
      }

      if (childNodes.length === 0) {
        return [];
      }

      if (childNodes.length === 1 && !branch.permission) {
        return childNodes;
      }

      return [
        {
          children: childNodes,
          key: branchKey,
          title: branch.label,
        },
      ];
    });
}

function buildModuleTree(
  module: string,
  items: PermissionItem[],
): PermissionTreeNode[] {
  const root = new Map<string, TreeBranch>();

  for (const item of items) {
    const segments = getPermissionPathSegments(module, item.code);
    insertPermission(root, module, segments, item);
  }

  return branchToNodes(root, `group:${module}`);
}

export function buildPermissionTree(
  permissions: PermissionItem[],
): PermissionTreeNode[] {
  const groups = new Map<string, PermissionItem[]>();

  for (const item of permissions) {
    const module = resolvePermissionModule(item.code);
    const list = groups.get(module) ?? [];
    list.push(item);
    groups.set(module, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => comparePermissionModules(a, b))
    .map(([module, items]) => ({
      children: buildModuleTree(module, items),
      key: `module:${module}`,
      title: getPermissionModuleLabel(module),
    }));
}

export function collectPermissionLeafCodes(
  permissions: PermissionItem[],
): string[] {
  return permissions.map((item) => item.code);
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

export function filterCheckedPermissionCodes(
  checkedKeys: Array<number | string>,
  leafCodes: Set<string>,
): string[] {
  return checkedKeys.map(String).filter((key) => leafCodes.has(key));
}
