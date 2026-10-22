import type { Page } from '@playwright/test';
import type { AgentTaskTool } from './agent-loop';
import { redactProviderText } from './runner-context';

const roles = ['button', 'link', 'tab', 'checkbox', 'radio'] as const;
const secretLabel = /token|password|secret|api\s*key|private\s*key/i;
const secretValue = /Bearer\s+[A-Za-z0-9._~+/=-]{16,}|\bmrv1\.[A-Za-z0-9._~+/=-]{16,}|\bsk-[A-Za-z0-9_-]{20,}/i;

function argsObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function boundedString(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new Error(`${label} must be a non-empty string under ${maxLength + 1} characters`);
  return value;
}

function rejectSecretField(label: string, value?: string) {
  if (secretLabel.test(label)) throw new Error('credential and reviewer-token fields are unavailable to the agent');
  if (value && secretValue.test(value)) throw new Error('credential-like values cannot be entered by the agent');
}

function tool(name: string, description: string, properties: Record<string, unknown>, required: string[], execute: AgentTaskTool['execute']): AgentTaskTool {
  return {
    definition: {
      type: 'function',
      function: { name, description, parameters: { type: 'object', additionalProperties: false, properties, required } },
    },
    execute,
  };
}

/** Expose a small accessible-browser surface; page navigation stays on the disposable local app. */
export function createBrowserTaskTools(page: Page, baseUrl: string, metadataPacket?: unknown): AgentTaskTool[] {
  const origin = new URL(baseUrl).origin;
  return [
    tool('read_page', 'Read visible page text and accessible controls. Credential fields and their values are omitted.', {}, [], async () => {
      const snapshot = await page.evaluate(() => {
        const body = document.body?.innerText || '';
        const controls = Array.from(document.querySelectorAll('button,a,input,textarea,select,summary,[role="tab"],[role="checkbox"],[role="radio"]'))
          .filter(element => {
            for (let parent = element.parentElement; parent; parent = parent.parentElement) {
              if (parent.tagName === 'DETAILS' && !(parent as HTMLDetailsElement).open
                && !parent.querySelector(':scope > summary')?.contains(element)) return false;
            }
            return element.checkVisibility();
          })
          .slice(0, 100)
          .map(element => {
            const node = element as HTMLInputElement;
            const label = node.getAttribute('aria-label') || (node.labels ? Array.from(node.labels).map(item => item.innerText).join(' ').trim() : '') || node.innerText || node.getAttribute('placeholder') || '';
            if (!label || /token|password|secret|api\s*key|private\s*key/i.test(label)) return null;
            const value = ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) ? node.value : '';
            return `${node.tagName.toLowerCase()} ${label}${value ? ` = ${value.slice(0, 160)}` : ''}`;
          }).filter((value): value is string => Boolean(value));
        // Keep controls discoverable even when long scientific context fills the
        // text budget. Hidden/collapsed form fields are not offered as targets.
        return `Accessible controls:\n${controls.join('\n').slice(0, 5000)}\n\nVisible page:\n${body.slice(0, 10000)}`;
      });
      const safeText = redactProviderText(snapshot, metadataPacket).slice(0, 16_000);
      return { path: new URL(page.url()).pathname, text: safeText };
    }),
    tool('set_details', 'Open or close a visible disclosure by its exact summary text. This changes only the visible UI, not saved records.', {
      summary: { type: 'string', maxLength: 160 }, open: { type: 'boolean' },
    }, ['summary', 'open'], async raw => {
      const args = argsObject(raw);
      const summary = boundedString(args.summary, 'summary', 160);
      if (typeof args.open !== 'boolean') throw new Error('open must be boolean');
      const escaped = summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const locator = page.locator('summary').filter({ hasText: new RegExp(`^${escaped}$`) }).first();
      const current = await locator.evaluate(node => (node.parentElement as HTMLDetailsElement).open);
      if (current !== args.open) await locator.click({ timeout: 15_000 });
      return { summary, open: args.open };
    }),
    tool('navigate', 'Navigate to a path inside the local MethaneResponse application only.', {
      path: { type: 'string', maxLength: 500 },
    }, ['path'], async raw => {
      const path = boundedString(argsObject(raw).path, 'path', 500);
      const target = new URL(path, origin);
      if (target.origin !== origin || !path.startsWith('/') || path.startsWith('//')) throw new Error('only local application routes are allowed');
      if (target.pathname !== '/' && !target.pathname.startsWith('/dashboard/')) throw new Error('only dashboard application routes are allowed');
      if ([...target.searchParams.keys()].some(key => /token|auth|secret|key/i.test(key))) throw new Error('credential query parameters are blocked');
      await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      return { path: target.pathname };
    }),
    tool('click', 'Click a visible accessible button, tab, checkbox, radio or same-origin link by exact accessible name.', {
      role: { type: 'string', enum: roles },
      name: { type: 'string', maxLength: 160 },
    }, ['role', 'name'], async raw => {
      const args = argsObject(raw);
      if (!roles.includes(args.role as typeof roles[number])) throw new Error('role must be button, link, tab, checkbox or radio');
      const role = args.role as typeof roles[number];
      const name = boundedString(args.name, 'name', 160);
      const locator = page.getByRole(role, { name, exact: true }).first();
      if (role === 'link') {
        const href = await locator.getAttribute('href');
        if (href && new URL(href, origin).origin !== origin) throw new Error('external links are blocked');
      }
      await locator.click({ timeout: 15_000 });
      return { role, name, path: new URL(page.url()).pathname };
    }),
    tool('fill', 'Fill a visible labeled field. Credential and reviewer-token fields are disabled.', {
      label: { type: 'string', maxLength: 160 },
      value: { type: 'string', maxLength: 4000 },
    }, ['label', 'value'], async raw => {
      const args = argsObject(raw);
      const label = boundedString(args.label, 'label', 160);
      const value = boundedString(args.value, 'value', 4000);
      rejectSecretField(label, value);
      // A wrapping <label> can include React textarea children after an edit.
      // The explicit accessible textbox name remains stable across those edits.
      const textbox = page.getByRole('textbox', { name: label, exact: true });
      const field = await textbox.count() ? textbox : page.getByLabel(label, { exact: true });
      await field.first().fill(value, { timeout: 15_000 });
      return { label, valueLength: value.length };
    }),
    tool('select', 'Choose a value in a visible labeled select field. Credential fields are disabled.', {
      label: { type: 'string', maxLength: 160 },
      value: { type: 'string', maxLength: 160 },
    }, ['label', 'value'], async raw => {
      const args = argsObject(raw);
      const label = boundedString(args.label, 'label', 160);
      const value = boundedString(args.value, 'value', 160);
      rejectSecretField(label, value);
      await page.getByLabel(label, { exact: true }).first().selectOption(value, { timeout: 15_000 });
      return { label, value };
    }),
  ];
}
