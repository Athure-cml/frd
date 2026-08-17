<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';

import type { AiApi } from '#/api/ai';
import type { AiCostPrefillMode } from '#/components/ai-assistant/ai-prefill-cost';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';

import {
  Button,
  Card,
  Drawer,
  Input,
  message,
  Spin,
  Tabs,
  Textarea,
  Upload,
} from 'ant-design-vue';

import { chatWithAi, parseAiFile, parseAiText } from '#/api/ai';
import {
  AI_COST_ROUTE_NAMES,
  notifyAiCostPrefill,
  stashAiCostPrefill,
} from '#/components/ai-assistant/ai-prefill-cost';
import { $t } from '#/locales';

type UiProposedCost = AiApi.ProposedCost & {
  status?: 'dismissed' | 'opened';
};

type UiMessage = {
  citedCosts?: AiApi.CitedCost[];
  content: string;
  proposedCosts?: UiProposedCost[];
  role: 'assistant' | 'user';
};

const FAB_SIZE = 42;
const FAB_MARGIN = 16;
const FAB_STORAGE_KEY = 'ai-fab-pos-v2';
const FAB_MET_KEY = 'ai-xiaofurui-met';
const CHAT_STORAGE_KEY = 'ai-chat-messages-v1';
const CHAT_MAX_STORED = 40;
/** 鼠标拖拽阈值；触控略大，避免轻点被当成拖动而不打开抽屉 */
const DRAG_THRESHOLD_MOUSE = 6;
const DRAG_THRESHOLD_TOUCH = 16;

/** 星芒射线：固定角度与长度，不做动画 */
const SPARK_RAYS = [
  { a: '-12deg', base: 1.15 },
  { a: '38deg', base: 0.88 },
  { a: '95deg', base: 1.08 },
  { a: '148deg', base: 0.92 },
  { a: '198deg', base: 1.12 },
  { a: '248deg', base: 0.8 },
  { a: '302deg', base: 1 },
] as const;

function rayStyle(ray: (typeof SPARK_RAYS)[number]) {
  return {
    '--a': ray.a,
    '--base': String(ray.base),
  };
}

const open = ref(false);
const activeTab = ref('chat');
const input = ref('');
const composerKey = ref(0);
const loading = ref(false);
const messages = ref<UiMessage[]>(loadChatMessages());
const listRef = ref<HTMLElement | null>(null);

const parseText = ref('');
const parseHint = ref('');
const parseLoading = ref(false);
const parseResult = ref<AiApi.ParseResponse | null>(null);

const fabPos = ref({ x: 0, y: 0 });
const fabDragging = ref(false);
const fabReady = ref(false);

const { hasAccessByCodes } = useAccess();
const canUseAi = computed(() => hasAccessByCodes(['ai:use']));
const router = useRouter();
/** 固定宽度，避免开关动画过程中宽度被改导致「先拉宽再收起」 */
const AI_DRAWER_WIDTH = 420;

const placeholders = computed(() => ({
  chat: $t('page.ai.chatPlaceholder'),
  parse: $t('page.ai.parsePlaceholder'),
}));

const fabStyle = computed(() => ({
  left: `${fabPos.value.x}px`,
  top: `${fabPos.value.y}px`,
  opacity: fabReady.value ? 1 : 0,
}));

watch(
  () => messages.value.length,
  async () => {
    await nextTick();
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
  },
);

watch(
  messages,
  (list) => {
    saveChatMessages(list);
  },
  { deep: true },
);

watch(open, (isOpen) => {
  if (isOpen) {
    ensureFirstGreeting();
  }
});

function loadChatMessages(): UiMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (item): item is UiMessage =>
          !!item &&
          typeof item === 'object' &&
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.content === 'string',
      )
      .slice(-CHAT_MAX_STORED);
  } catch {
    return [];
  }
}

function saveChatMessages(list: UiMessage[]) {
  try {
    const trimmed = list.slice(-CHAT_MAX_STORED).map((msg) => ({
      citedCosts: msg.citedCosts,
      content: msg.content,
      proposedCosts: msg.proposedCosts,
      role: msg.role,
    }));
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // quota / private mode：尽量丢掉更早的消息再试一次
    try {
      const slim = list.slice(-Math.floor(CHAT_MAX_STORED / 2)).map((msg) => ({
        content: msg.content,
        role: msg.role,
      }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(slim));
    } catch {
      // ignore
    }
  }
}

function clearChatMessagesStorage() {
  localStorage.removeItem(CHAT_STORAGE_KEY);
}

function defaultFabPos() {
  return {
    x: FAB_MARGIN + 12,
    y: Math.max(FAB_MARGIN, window.innerHeight - FAB_SIZE - 28),
  };
}

function clampFabPos(x: number, y: number) {
  const maxX = Math.max(FAB_MARGIN, window.innerWidth - FAB_SIZE - FAB_MARGIN);
  const maxY = Math.max(FAB_MARGIN, window.innerHeight - FAB_SIZE - FAB_MARGIN);
  return {
    x: Math.min(Math.max(FAB_MARGIN, x), maxX),
    y: Math.min(Math.max(FAB_MARGIN, y), maxY),
  };
}

function loadFabPos() {
  try {
    const raw = localStorage.getItem(FAB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        fabPos.value = clampFabPos(parsed.x, parsed.y);
        return;
      }
    }
  } catch {
    // ignore
  }
  fabPos.value = defaultFabPos();
}

function saveFabPos() {
  localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(fabPos.value));
}

function onFabResize() {
  fabPos.value = clampFabPos(fabPos.value.x, fabPos.value.y);
  saveFabPos();
}

function hasMetXiaofurui() {
  return localStorage.getItem(FAB_MET_KEY) === '1';
}

function markMetXiaofurui() {
  localStorage.setItem(FAB_MET_KEY, '1');
}

function ensureFirstGreeting() {
  if (messages.value.length > 0) {
    markMetXiaofurui();
    return;
  }
  if (hasMetXiaofurui()) {
    return;
  }
  messages.value = [
    {
      content: $t('page.ai.greeting'),
      role: 'assistant',
    },
  ];
  markMetXiaofurui();
}

let dragPointerId: null | number = null;
let dragOriginX = 0;
let dragOriginY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;
let dragMoved = false;
let dragThreshold = DRAG_THRESHOLD_MOUSE;
/** 拖拽结束后吞掉紧随的 click，避免误开 */
let ignoreNextClick = false;

function onFabPointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }
  dragPointerId = event.pointerId;
  dragOriginX = event.clientX;
  dragOriginY = event.clientY;
  dragStartLeft = fabPos.value.x;
  dragStartTop = fabPos.value.y;
  dragMoved = false;
  fabDragging.value = false;
  dragThreshold =
    event.pointerType === 'touch' || event.pointerType === 'pen'
      ? DRAG_THRESHOLD_TOUCH
      : DRAG_THRESHOLD_MOUSE;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onFabPointerMove(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) {
    return;
  }
  const dx = event.clientX - dragOriginX;
  const dy = event.clientY - dragOriginY;
  if (!dragMoved && Math.hypot(dx, dy) < dragThreshold) {
    return;
  }
  dragMoved = true;
  fabDragging.value = true;
  fabPos.value = clampFabPos(dragStartLeft + dx, dragStartTop + dy);
}

function onFabPointerUp(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) {
    return;
  }
  dragPointerId = null;
  try {
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  } catch {
    // ignore
  }
  fabDragging.value = false;
  if (dragMoved) {
    saveFabPos();
    ignoreNextClick = true;
  }
  // 不在 pointerup 打开：否则同一次触摸的 click 会点到遮罩，抽屉闪一下就关
}

function onFabClick(event: MouseEvent) {
  if (ignoreNextClick || dragMoved) {
    ignoreNextClick = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  open.value = true;
}

function clearChat() {
  messages.value = [];
  clearChatMessagesStorage();
}

async function sendChat() {
  const text = input.value.trim();
  if (!text || loading.value) {
    return;
  }
  messages.value.push({ content: text, role: 'user' });
  // Textarea + autosize 偶发不清空：重置值并强制重挂载输入框
  input.value = '';
  composerKey.value += 1;
  await nextTick();
  input.value = '';

  loading.value = true;
  try {
    const payload = messages.value.map((m) => ({
      content: m.content,
      role: m.role,
    }));
    const res = await chatWithAi(payload, true);
    const proposedCosts = res.proposedCosts ?? [];
    messages.value.push({
      citedCosts: res.citedCosts ?? [],
      content: res.reply,
      proposedCosts,
      role: 'assistant',
    });
    const proposal = proposedCosts.find(
      (p) => p.type === 'road' || p.type === 'sea' || p.type === 'fumigation',
    );
    if (proposal) {
      void openCostForm(
        proposal,
        messages.value.length - 1,
        proposedCosts.indexOf(proposal),
      );
    } else {
      const pages = res.openPages ?? [];
      const target = pages[pages.length - 1];
      if (target?.routeName) {
        void openSystemPage(target);
      }
    }
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      $t('page.ai.requestFailed');
    const friendly =
      typeof msg === 'string' && msg.includes('AI 未配置')
        ? $t('page.ai.notConfigured')
        : String(msg);
    messages.value.push({
      content: friendly,
      role: 'assistant',
    });
  } finally {
    loading.value = false;
  }
}

function onComposerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  void sendChat();
}

async function runParseText() {
  const text = parseText.value.trim();
  if (!text || parseLoading.value) {
    return;
  }
  parseLoading.value = true;
  parseResult.value = null;
  try {
    parseResult.value = await parseAiText(
      text,
      parseHint.value.trim() || undefined,
    );
  } catch (error: any) {
    message.error(
      error?.response?.data?.message ||
        error?.message ||
        $t('page.ai.requestFailed'),
    );
  } finally {
    parseLoading.value = false;
  }
}

async function onParseUpload(options: {
  file: Blob | File | string;
  onError?: (e: Error) => void;
  onSuccess?: (body: unknown) => void;
}) {
  const file = options.file as File;
  parseLoading.value = true;
  parseResult.value = null;
  try {
    parseResult.value = await parseAiFile(
      file,
      parseHint.value.trim() || undefined,
    );
    options.onSuccess?.(parseResult.value);
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    options.onError?.(err);
    message.error(
      error?.response?.data?.message ||
        error?.message ||
        $t('page.ai.requestFailed'),
    );
  } finally {
    parseLoading.value = false;
  }
}

async function openCostForm(
  proposal: AiApi.ProposedCost,
  messageIndex: number,
  proposalIndex: number,
) {
  const mode = proposal.type as AiCostPrefillMode;
  if (mode !== 'road' && mode !== 'sea' && mode !== 'fumigation') {
    message.warning($t('page.ai.proposeUnsupported'));
    return;
  }
  const editPermission =
    mode === 'road'
      ? 'cost:road:edit'
      : mode === 'sea'
        ? 'cost:sea:edit'
        : 'cost:fumigation:edit';
  if (!hasAccessByCodes([editPermission])) {
    message.warning($t('page.ai.proposeNoEditPermission'));
    return;
  }
  stashAiCostPrefill(mode, proposal.payload, {
    summary: proposal.summary,
    title: proposal.title,
  });
  const msg = messages.value[messageIndex];
  if (msg?.proposedCosts?.[proposalIndex]) {
    msg.proposedCosts[proposalIndex].status = 'opened';
  }
  message.success($t('page.ai.proposeOpenForm'));
  open.value = false;
  const routeName = AI_COST_ROUTE_NAMES[mode];
  if (router.currentRoute.value.name === routeName) {
    notifyAiCostPrefill(mode);
    return;
  }
  await router.push({ name: routeName }).catch(() => undefined);
}

async function openSystemPage(page: AiApi.OpenPage) {
  if (!page.routeName) {
    return;
  }
  const permission =
    OPEN_PAGE_PERMISSIONS[page.page] ?? OPEN_PAGE_PERMISSIONS[page.routeName];
  if (permission && !hasAccessByCodes([permission])) {
    message.warning($t('page.ai.openPageNoPermission'));
    return;
  }
  if (router.currentRoute.value.name === page.routeName) {
    message.info(`已在「${page.title || page.routeName}」`);
    return;
  }
  open.value = false;
  message.success(`正在打开「${page.title || page.routeName}」`);
  await router.push({ name: page.routeName }).catch(() => {
    message.error(`无法打开页面：${page.title || page.routeName}`);
  });
}

/** 与后端 open_page 权限码对齐，前端再拦一层 */
const OPEN_PAGE_PERMISSIONS: Record<string, string> = {
  analytics: 'dashboard:view',
  Analytics: 'dashboard:view',
  cost_fumigation: 'cost:fumigation:view',
  CostLibraryFumigation: 'cost:fumigation:view',
  cost_road: 'cost:road:view',
  CostLibraryRoad: 'cost:road:view',
  cost_sea: 'cost:sea:view',
  CostLibrarySea: 'cost:sea:view',
  customer_list: 'customer:view',
  CustomerList: 'customer:view',
  quote_create: 'quote:create',
  QuoteCreate: 'quote:create',
  quote_list: 'quote:view',
  QuoteList: 'quote:view',
  supplier_list: 'supplier:truck:view',
  SupplierList: 'supplier:truck:view',
  SupplierTruckList: 'supplier:truck:view',
  SupplierFumigationList: 'supplier:fumigation:view',
  SupplierYardList: 'supplier:yard:view',
  SupplierOtherList: 'supplier:other:view',
  workspace: 'dashboard:view',
  Workspace: 'dashboard:view',
};

function applyCitedCost(cost: AiApi.CitedCost) {
  const payload = {
    id: cost.id,
    summary: cost.summary,
    title: cost.title,
    type: cost.type,
    at: Date.now(),
  };
  sessionStorage.setItem('ai-apply-cost', JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('ai-apply-cost', { detail: payload }));
  const onQuoteEditor =
    router.currentRoute.value.name === 'QuoteCreate' ||
    router.currentRoute.value.name === 'QuoteEdit';
  message.success($t('page.ai.applyQueued'));
  if (!onQuoteEditor) {
    router.push({ name: 'QuoteCreate' }).catch(() => undefined);
  }
}

function copyParseJson() {
  if (!parseResult.value) {
    return;
  }
  const text = JSON.stringify(parseResult.value.fields, null, 2);
  navigator.clipboard
    .writeText(text)
    .then(() => message.success($t('page.ai.copied')))
    .catch(() => message.error($t('page.ai.copyFailed')));
}

function beforeUpload() {
  return false;
}

function onUploadChange(_info: { fileList: UploadFile[] }) {
  // customRequest handles upload
}

onMounted(() => {
  loadFabPos();
  fabReady.value = true;
  window.addEventListener('resize', onFabResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onFabResize);
});
</script>

<template>
  <template v-if="canUseAi">
    <button
      v-show="!open"
      type="button"
      class="ai-fab"
      :class="{ 'ai-fab--dragging': fabDragging }"
      :style="fabStyle"
      :aria-label="$t('page.ai.title')"
      :title="$t('page.ai.title')"
      @pointerdown="onFabPointerDown"
      @pointermove="onFabPointerMove"
      @pointerup="onFabPointerUp"
      @pointercancel="onFabPointerUp"
      @click="onFabClick"
    >
      <span class="ai-fab__glow" aria-hidden="true"></span>
      <span class="ai-fab__core" aria-hidden="true">
        <span class="ai-fab__spark">
          <span
            v-for="(ray, idx) in SPARK_RAYS"
            :key="idx"
            class="ai-fab__ray"
            :style="rayStyle(ray)"
          ></span>
        </span>
      </span>
    </button>

    <Drawer
      v-model:open="open"
      :title="$t('page.ai.title')"
      placement="right"
      :width="AI_DRAWER_WIDTH"
      destroy-on-close
      root-class-name="ai-assistant-drawer"
    >
      <Tabs v-model:active-key="activeTab" class="ai-tabs">
        <Tabs.TabPane key="chat" :tab="$t('page.ai.tabChat')">
          <div class="ai-panel">
            <div ref="listRef" class="ai-messages">
              <div v-if="messages.length === 0" class="ai-empty">
                {{ $t('page.ai.emptyHint') }}
              </div>
              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                class="ai-msg"
                :class="`ai-msg--${msg.role}`"
              >
                <div class="ai-bubble">{{ msg.content }}</div>
                <div v-if="msg.citedCosts?.length" class="ai-cites">
                  <Card
                    v-for="cost in msg.citedCosts"
                    :key="`${cost.type}-${cost.id}`"
                    size="small"
                    class="ai-cite-card"
                  >
                    <div class="ai-cite-title">{{ cost.title }}</div>
                    <div class="ai-cite-summary">{{ cost.summary }}</div>
                    <Button
                      type="link"
                      size="small"
                      class="!px-0"
                      @click="applyCitedCost(cost)"
                    >
                      {{ $t('page.ai.applyToQuote') }}
                    </Button>
                  </Card>
                </div>
                <div v-if="msg.proposedCosts?.length" class="ai-cites">
                  <Card
                    v-for="(proposal, pIdx) in msg.proposedCosts"
                    :key="`propose-${idx}-${pIdx}`"
                    size="small"
                    class="ai-cite-card ai-propose-card"
                  >
                    <div class="ai-cite-title">{{ proposal.title }}</div>
                    <div class="ai-cite-summary">{{ proposal.summary }}</div>
                    <div
                      v-if="proposal.warnings?.length"
                      class="ai-propose-warn"
                    >
                      {{ proposal.warnings.join('；') }}
                    </div>
                    <Button
                      v-if="!proposal.status"
                      type="primary"
                      size="small"
                      class="mt-1"
                      @click="openCostForm(proposal, idx, pIdx)"
                    >
                      {{ $t('page.ai.proposeReview') }}
                    </Button>
                    <span v-else class="ai-propose-status">
                      {{ $t('page.ai.proposeOpened') }}
                    </span>
                  </Card>
                </div>
              </div>
              <div v-if="loading" class="ai-loading">
                <Spin size="small" />
                <span>{{ $t('page.ai.thinking') }}</span>
              </div>
            </div>

            <div class="ai-composer">
              <Textarea
                :key="composerKey"
                v-model:value="input"
                :rows="3"
                :auto-size="{ minRows: 2, maxRows: 6 }"
                :placeholder="placeholders.chat"
                class="ai-composer__input"
                @keydown="onComposerKeydown"
              />
              <div class="ai-composer__bar">
                <Button
                  type="text"
                  size="small"
                  class="ai-composer__clear"
                  :disabled="loading || messages.length === 0"
                  @click="clearChat"
                >
                  {{ $t('page.ai.clear') }}
                </Button>
                <span class="ai-composer__hint">{{
                  $t('page.ai.sendHint')
                }}</span>
                <Button
                  type="primary"
                  size="middle"
                  class="ai-composer__send"
                  :loading="loading"
                  :disabled="!input.trim()"
                  @click="sendChat"
                >
                  {{ $t('page.ai.send') }}
                </Button>
              </div>
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="parse" :tab="$t('page.ai.tabParse')">
          <div class="ai-panel">
            <div class="ai-parse-body">
              <Input
                v-model:value="parseHint"
                :placeholder="$t('page.ai.parseHint')"
              />
              <Textarea
                v-model:value="parseText"
                :rows="8"
                :auto-size="{ minRows: 6, maxRows: 14 }"
                :placeholder="placeholders.parse"
                class="ai-parse-textarea"
              />
              <Spin :spinning="parseLoading">
                <div v-if="parseResult" class="ai-parse-result">
                  <div class="ai-parse-head">
                    <span>{{ $t('page.ai.parsePreview') }}</span>
                    <Button type="link" size="small" @click="copyParseJson">
                      {{ $t('page.ai.copyJson') }}
                    </Button>
                  </div>
                  <pre class="ai-json">{{
                    JSON.stringify(parseResult.fields, null, 2)
                  }}</pre>
                  <div class="ai-excerpt">
                    {{ parseResult.sourceExcerpt }}
                  </div>
                </div>
              </Spin>
            </div>
            <div class="ai-composer ai-composer--parse">
              <div class="ai-composer__bar">
                <Upload
                  :show-upload-list="false"
                  :before-upload="beforeUpload"
                  :custom-request="onParseUpload"
                  @change="onUploadChange"
                >
                  <Button :loading="parseLoading">
                    {{ $t('page.ai.uploadFile') }}
                  </Button>
                </Upload>
                <Button
                  type="primary"
                  :loading="parseLoading"
                  :disabled="!parseText.trim()"
                  @click="runParseText"
                >
                  {{ $t('page.ai.parse') }}
                </Button>
              </div>
            </div>
          </div>
        </Tabs.TabPane>
      </Tabs>
    </Drawer>
  </template>
</template>

<style scoped>
.ai-fab {
  --ai-fab-size: 42px;

  position: fixed;
  z-index: 1100;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--ai-fab-size);
  height: var(--ai-fab-size);
  padding: 0;
  overflow: visible;
  color: #fff;
  touch-action: none;
  cursor: grab;
  user-select: none;
  background: transparent;
  border: none;
  border-radius: 50%;
  box-shadow:
    0 0 8px 1px rgb(168 85 247 / 28%),
    0 0 16px 3px rgb(59 130 246 / 16%),
    0 3px 8px rgb(15 23 42 / 16%);
  transition:
    box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 120ms ease;
}

.ai-fab::before {
  position: absolute;
  inset: -4px;
  z-index: -1;
  pointer-events: none;
  content: '';
  background: radial-gradient(
    circle,
    rgb(167 139 250 / 28%) 0%,
    rgb(59 130 246 / 12%) 48%,
    transparent 72%
  );
  border-radius: 50%;
  filter: blur(3px);
}

.ai-fab__glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #3b82f6 0%,
    #6366f1 28%,
    #a855f7 55%,
    #ec4899 78%,
    #f43f5e 100%
  );
  border-radius: inherit;
}

.ai-fab__glow::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: radial-gradient(
    circle at 30% 28%,
    rgb(255 255 255 / 36%) 0%,
    rgb(255 255 255 / 0%) 46%
  );
  border-radius: inherit;
}

.ai-fab__core {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.ai-fab__spark {
  position: relative;
  width: 26px;
  height: 26px;
}

.ai-fab__ray {
  position: absolute;
  top: calc(50% - (11px * var(--base, 1)));
  left: calc(50% - 1.35px);
  width: 2.7px;
  height: calc(11px * var(--base, 1));
  background: linear-gradient(180deg, #fff 0%, #f8fafc 55%, #e2e8f0 100%);
  border-radius: 999px;
  transform: rotate(var(--a, 0deg));
  transform-origin: 50% 100%;
}

.ai-fab:hover {
  box-shadow:
    0 0 10px 2px rgb(168 85 247 / 34%),
    0 0 18px 4px rgb(59 130 246 / 20%),
    0 4px 10px rgb(15 23 42 / 18%);
}

.ai-fab:focus-visible {
  outline: 2px solid #a855f7;
  outline-offset: 3px;
}

.ai-fab--dragging {
  cursor: grabbing;
  box-shadow:
    0 0 10px 2px rgb(168 85 247 / 34%),
    0 0 18px 4px rgb(59 130 246 / 20%),
    0 4px 10px rgb(15 23 42 / 18%);
  transition: none;
}

.ai-tabs {
  height: 100%;
}

.ai-tabs :deep(.ant-tabs-content),
.ai-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}

.ai-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 148px);
  min-height: 360px;
}

.ai-messages {
  flex: 1;
  min-height: 0;
  padding: 4px 2px 8px;
  overflow: auto;
}

.ai-empty {
  padding: 16px 8px;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
}

.ai-msg {
  margin-bottom: 12px;
}

.ai-msg--user {
  display: flex;
  justify-content: flex-end;
}

.ai-msg--user .ai-bubble {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
}

.ai-msg--assistant .ai-bubble {
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
}

.ai-bubble {
  max-width: 92%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  word-break: normal;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  border-radius: 12px;
}

.ai-cites {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.ai-cite-card {
  background: hsl(var(--background));
}

.ai-propose-warn {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: hsl(var(--warning-foreground, 32 95% 44%));
}

.ai-propose-status {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.ai-propose-tip {
  margin-bottom: 8px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.ai-cite-title {
  font-size: 13px;
  font-weight: 600;
}

.ai-cite-summary {
  margin-top: 2px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.ai-loading {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.ai-composer {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.ai-composer--parse {
  padding: 10px 12px;
}

.ai-composer__input {
  width: 100%;
  margin: 0;
  resize: none;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.ai-composer__input :deep(textarea) {
  padding: 0;
  font-size: 13px;
  line-height: 1.55;
  resize: none;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.ai-composer__bar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ai-composer__clear {
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
}

.ai-composer__hint {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.ai-composer__send {
  flex-shrink: 0;
  min-width: 72px;
}

.ai-parse-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

.ai-parse-textarea {
  width: 100%;
}

.ai-parse-result {
  margin-top: 4px;
}

.ai-parse-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: 600;
}

.ai-json {
  max-height: 240px;
  padding: 10px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.45;
  background: hsl(var(--muted));
  border-radius: 8px;
}

.ai-excerpt {
  margin-top: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: pre-wrap;
}

@media (prefers-reduced-motion: reduce) {
  .ai-fab {
    transition: none;
  }
}
</style>

<style>
/* 仅调整内部布局，不改 content-wrapper 宽高/定位，避免干扰开关动画 */
.ai-assistant-drawer .ant-drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 16px 16px;
}
</style>
