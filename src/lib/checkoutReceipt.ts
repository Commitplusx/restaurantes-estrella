// Recovering another active order does not consume the draft being submitted.
// A second tab may also have edited it while WhatsApp verification was open.
export function shouldClearSubmittedCart(
  response: Record<string, unknown>, current: readonly unknown[], submitted: readonly unknown[],
): boolean {
  return !(response.existing_order === true && response.replayed !== true)
    && JSON.stringify(current) === JSON.stringify(submitted);
}
