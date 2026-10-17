/**
 * Framework-safe native value setter.
 * 
 * Uses native prototype setters to bypass React/Vue virtual DOM tracking.
 * Validates constraints on a detached clone before touching the real DOM.
 * Dispatches bubbling input & change events for controlled component listeners.
 */

/**
 * Set a value on an input/textarea using the native prototype setter.
 * Works with React 18/19, Vue 3, Angular, and vanilla JS.
 */
export function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string | number | boolean
): void {
  const stringValue = String(value);

  // 1. Validate constraints on a detached clone probe before touching DOM
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const probe = element.cloneNode(true) as HTMLInputElement;
    probe.value = stringValue;
    if (!probe.checkValidity()) {
      throw new Error(`Value '${value}' violates native constraints: ${probe.validationMessage}`);
    }
  }

  // 2. Locate prototype value setter (bypassed by React 18/19 / Vue)
  const prototype = Object.getPrototypeOf(element);
  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;

  if (nativeSetter) {
    nativeSetter.call(element, stringValue);
  } else {
    element.value = stringValue;
  }

  // 3. Dispatch bubbling input & change events so controlled listeners register the update
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Set a native select element's value.
 */
export function setNativeSelect(element: HTMLSelectElement, optionValue: string): void {
  const option = Array.from(element.options).find(
    opt => opt.value === optionValue || opt.textContent?.trim() === optionValue
  );
  if (!option) {
    throw new Error(`Option '${optionValue}' not found in select element.`);
  }
  if (option.disabled) {
    throw new Error(`Option '${optionValue}' is disabled.`);
  }

  element.value = option.value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Toggle a checkbox/switch. Only clicks if the desired state differs.
 */
export function toggleCheckbox(element: HTMLInputElement, desiredState: boolean): void {
  if (element.checked !== desiredState) {
    element.click();
  }
}

