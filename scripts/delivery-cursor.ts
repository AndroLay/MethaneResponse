import type { Page } from '@playwright/test';

export function demoCursorDocument() {
  const rootId = 'methane-demo-cursor';
  if (document.getElementById(rootId)) return;
  if (!document.documentElement) {
    document.addEventListener('DOMContentLoaded', demoCursorDocument, { once: true });
    return;
  }

  const root = document.createElement('div');
  root.id = rootId;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<span class="methane-demo-click"></span><svg class="methane-demo-pointer" viewBox="0 0 24 32" focusable="false" aria-hidden="true"><path d="M2.1 1.7v24.2l6.3-6.1 4.1 9.2 4.3-1.9-4.2-9.1h8.8L2.1 1.7Z" fill="#f8ffff" stroke="#082632" stroke-width="1.7" stroke-linejoin="round"/><path d="m5.1 7.1 9 7.1h-3.7L7.7 18V7.1Z" fill="#5eead4"/></svg>';

  const style = document.createElement('style');
  style.textContent = `
    #${rootId}{position:fixed;inset:0;z-index:2147483647;pointer-events:none;opacity:0;transition:opacity 100ms ease-out}
    #${rootId}[data-visible="true"]{opacity:1}
    #${rootId}[data-capture-hidden="true"]{opacity:0!important}
    #${rootId} .methane-demo-pointer{position:absolute;left:0;top:0;width:24px;height:32px;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.72));transform:translate(-2px,-2px);transition:left 75ms ease-out,top 75ms ease-out}
    #${rootId} .methane-demo-click{position:absolute;left:0;top:0;width:38px;height:38px;border:2px solid rgba(94,234,212,.9);border-radius:50%;opacity:0;transform:translate(-50%,-50%) scale(.5);box-shadow:0 0 0 3px rgba(4,25,34,.42)}
    #${rootId}[data-pressed="true"] .methane-demo-click{animation:methane-demo-click-pulse 480ms ease-out}
    @keyframes methane-demo-click-pulse{0%{opacity:.9;transform:translate(-50%,-50%) scale(.45)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.45)}}
  `;
  (document.head || document.documentElement).append(style);
  document.documentElement.append(root);

  document.addEventListener('pointermove', event => {
    const pointer = root.querySelector<SVGElement>('.methane-demo-pointer');
    const ripple = root.querySelector<HTMLElement>('.methane-demo-click');
    if (!pointer || !ripple) return;
    pointer.style.left = `${event.clientX}px`;
    pointer.style.top = `${event.clientY}px`;
    ripple.style.left = `${event.clientX + 9}px`;
    ripple.style.top = `${event.clientY + 11}px`;
    root.dataset.visible = 'true';
  }, { capture: true, passive: true });

  document.addEventListener('pointerdown', () => {
    root.dataset.pressed = 'true';
    window.setTimeout(() => { delete root.dataset.pressed; }, 520);
  }, { capture: true, passive: true });
  window.addEventListener('blur', () => { root.dataset.visible = 'false'; });
}

export async function installDemoCursor(page: Page) {
  await page.addInitScript(demoCursorDocument);
  await page.evaluate(demoCursorDocument);
}
