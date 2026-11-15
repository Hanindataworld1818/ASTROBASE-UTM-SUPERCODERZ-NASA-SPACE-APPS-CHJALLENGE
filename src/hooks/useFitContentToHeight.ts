import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useFitContentToHeight(
  containerRef: RefObject<HTMLElement | null>,
  resetKey?: string | number
): void {
  useEffect(() => {
    const container = containerRef.current;
    const content = container?.firstElementChild;
    if (!container || !(content instanceof HTMLElement)) return;

    let frame: number | undefined;

    const fit = () => {
      frame = undefined;
      const style = window.getComputedStyle(container);
      const availableHeight =
        container.clientHeight -
        Number.parseFloat(style.paddingTop) -
        Number.parseFloat(style.paddingBottom);
      const naturalHeight = content.scrollHeight;
      const scale =
        naturalHeight > 0
          ? Math.max(0, Math.min(1, availableHeight / naturalHeight))
          : 1;
      content.style.transform = `scale(${scale})`;
      content.style.transformOrigin = 'top center';
    };

    const scheduleFit = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(fit);
    };

    const resetAndFit = () => {
      content.style.transform = '';
      content.style.transformOrigin = '';
      scheduleFit();
    };

    const resizeObserver = new ResizeObserver(scheduleFit);
    resizeObserver.observe(container);
    window.addEventListener('resize', resetAndFit);

    const mutationObserver = new MutationObserver(scheduleFit);
    mutationObserver.observe(content, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      characterData: true,
      subtree: true,
    });

    scheduleFit();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resetAndFit);
      mutationObserver.disconnect();
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      content.style.transform = '';
      content.style.transformOrigin = '';
    };
  }, [containerRef, resetKey]);
}
