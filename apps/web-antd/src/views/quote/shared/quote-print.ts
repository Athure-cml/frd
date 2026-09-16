const PRINTING_CLASS = 'quote-print-sheet--printing';

function findPrintSheetElement(): HTMLElement | null {
  const node =
    document.querySelector<HTMLElement>('.ant-modal-body .quote-print-sheet') ??
    document.querySelector<HTMLElement>(
      '.quote-print-preview .quote-print-sheet',
    ) ??
    document.querySelector<HTMLElement>('.quote-print-sheet');
  return node;
}

export function printQuoteSheet() {
  const source = findPrintSheetElement();
  if (!source) {
    window.print();
    return;
  }

  source.classList.add(PRINTING_CLASS);
  document.documentElement.classList.add('quote-printing');

  const cleanup = () => {
    source.classList.remove(PRINTING_CLASS);
    document.documentElement.classList.remove('quote-printing');
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 2000);

  window.print();
}
