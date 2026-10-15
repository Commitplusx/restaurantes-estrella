let restricted = false;
export function backendRestricted(): boolean { return restricted; }
export function observeBackendResponse(status: number): void {
  if (status === 402) restricted = true;
  else if (status >= 200 && status < 300) restricted = false;
}
