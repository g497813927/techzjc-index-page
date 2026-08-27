export type LimitedBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "read-error" };

export async function readLimitedRequestBody(
  request: Request,
  maximumBytes: number,
): Promise<LimitedBodyResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { ok: false, reason: "too-large" };
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      receivedBytes += value.byteLength;
      if (receivedBytes > maximumBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return { ok: false, reason: "read-error" };
  } finally {
    reader.releaseLock();
  }
}
