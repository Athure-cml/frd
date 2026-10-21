const PRINTING_CLASS = 'quote-print-sheet--printing';
const PRINT_HOST_CLASS = 'quote-print-host';

function findPrintSheetElement(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('.ant-modal-body .quote-print-sheet') ??
    document.querySelector<HTMLElement>(
      '.quote-print-preview .quote-print-sheet',
    ) ??
    document.querySelector<HTMLElement>('.quote-print-sheet')
  );
}

export function printQuoteSheet() {
  const source = findPrintSheetElement();
  if (!source) {
    window.print();
    return;
  }

  // 克隆到 body 独立容器打印，避免弹窗关闭按钮 / 固定宽度进入打印页
  document.querySelectorAll(`.${PRINT_HOST_CLASS}`).forEach((node) => {
    node.remove();
  });

  const host = document.createElement('div');
  host.className = PRINT_HOST_CLASS;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add(PRINTING_CLASS);
  host.append(clone);
  document.body.append(host);
  document.documentElement.classList.add('quote-printing');

  const cleanup = () => {
    document.documentElement.classList.remove('quote-printing');
    host.remove();
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 2000);

  window.print();
}
