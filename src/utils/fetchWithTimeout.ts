/**
 * This serves as a wrapper around the fetch API to add timeout functionality.
 * 
 * @param url URL to fetch
 * @param options Fetch options
 * @param timeout Timeout in milliseconds (default: 5000ms)
 * @returns A promise that resolves to the fetch response or rejects on timeout
 */

export default function fetchWithTimeout(
    url: string,
    options?: RequestInit,
    timeout = 5000
): Promise<Response | Error> {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutPromise: Promise<Error> = new Promise((_, reject) => {
        setTimeout(() => {
            controller.abort();
            reject(new Error("Request timed out"));
        }, timeout);
    });
  return Promise.race([
    fetch(url, { ...options, signal }),
    timeoutPromise
  ]);
}
