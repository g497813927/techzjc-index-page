/**
 * This serves as a wrapper around the fetch API to add timeout functionality.
 *
 * @param url URL to fetch
 * @param options Fetch options
 * @param timeout Timeout in milliseconds (default: 5000ms)
 * @returns A Promise that resolves to the fetch Response
 */

export default function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeout = 5000
): Promise<Response> {
  const controller = new AbortController();
  const signal = controller.signal;
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise: Promise<Response> = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Request timed out"));
    }, timeout);
  });
  const fetchPromise = fetch(url, { ...options, signal }).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
  return Promise.race([fetchPromise, timeoutPromise]);
}
