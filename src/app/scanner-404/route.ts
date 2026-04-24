type ClientIp = {
  rawIp: string;
  source: "ali-cdn-real-ip" | "x-forwarded-for" | "unknown";
};

function getHeaderIp(value: string | null) {
  const ip = value?.split(",")[0]?.trim();
  return ip && ip.length <= 128 ? ip : undefined;
}

function getClientIp(req: Request): ClientIp {
  const cdnRealIp = getHeaderIp(req.headers.get("ali-cdn-real-ip"));
  if (cdnRealIp) {
    return { rawIp: cdnRealIp, source: "ali-cdn-real-ip" };
  }

  const forwardedIp = getHeaderIp(req.headers.get("x-forwarded-for"));
  if (forwardedIp) {
    return { rawIp: forwardedIp, source: "x-forwarded-for" };
  }

  return { rawIp: "unknown", source: "unknown" };
}

function truncateIpv4(ip: string) {
  const octets = ip.split(".");
  if (octets.length !== 4) {
    return undefined;
  }

  const parsedOctets = octets.map((octet) => Number.parseInt(octet, 10));
  const isValid = parsedOctets.every(
    (octet, index) =>
      Number.isInteger(octet) &&
      octet >= 0 &&
      octet <= 255 &&
      parsedOctets[index].toString() === octets[index],
  );

  return isValid
    ? `${parsedOctets[0]}.${parsedOctets[1]}.${parsedOctets[2]}.0/24`
    : undefined;
}

function expandIpv6(ip: string) {
  const zoneFreeIp = ip.split("%")[0].toLowerCase();
  if (!/^[\da-f:.]+$/.test(zoneFreeIp)) {
    return null;
  }

  const doubleColonParts = zoneFreeIp.split("::");
  if (doubleColonParts.length > 2) {
    return null;
  }

  const left = doubleColonParts[0] ? doubleColonParts[0].split(":") : [];
  const right = doubleColonParts[1] ? doubleColonParts[1].split(":") : [];
  const missingCount =
    doubleColonParts.length === 2 ? 8 - left.length - right.length : 0;

  if (missingCount < 0 || (doubleColonParts.length === 1 && left.length !== 8)) {
    return null;
  }

  const hextets = [...left, ...Array(missingCount).fill("0"), ...right];
  if (
    hextets.length !== 8 ||
    hextets.some((hextet) => !/^[\da-f]{1,4}$/.test(hextet))
  ) {
    return null;
  }

  return hextets.map((hextet) => Number.parseInt(hextet, 16).toString(16));
}

function truncateIp(rawIp: string) {
  const zoneFreeIp = rawIp.split("%")[0];
  const mappedIpv4 = zoneFreeIp
    .toLowerCase()
    .match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) {
    return truncateIpv4(mappedIpv4[1]) || "invalid-ip";
  }

  const truncatedIpv4 = truncateIpv4(zoneFreeIp);
  if (truncatedIpv4) {
    return truncatedIpv4;
  }

  if (zoneFreeIp.includes(":")) {
    const expandedIpv6 = expandIpv6(zoneFreeIp);
    if (expandedIpv6) {
      return `${expandedIpv6[0]}:${expandedIpv6[1]}::/32`;
    }
  }

  return rawIp === "unknown" ? "unknown" : "invalid-ip";
}

function handle(req: Request) {
  const acceptLanguage = req.headers.get("accept-language") || "";
  const locale = acceptLanguage.split(",")[0] || "en-US";
  const request_url = new URL(req.url);
  const path = request_url.pathname;
  // Get the client IP address for anonymized scanner logging.
  const { rawIp, source: ipSource } = getClientIp(req);

  const message = locale.toLowerCase().startsWith("zh")
    ? `一个野生的扫描器出现了！野生的扫描器对 ${path} 使出了 ${req.method}…没有击中 ${path}！`
    : `A wild scanner appeared! The wild scanner used ${req.method} on ${path}… It missed ${path}!`;

  if (process.env.SCANNER_404_LOG_REQUESTS === "true") {
    const truncatedIp = truncateIp(rawIp);

    // Log the scanner activity with the truncated IP for analytics and threat intelligence purposes
    console.log(
      {
        method: req.method,
        path,
        locale,
        truncatedIp,
        ipSource,
      },
    );
  }

  return new Response(
    message.trim(),
    {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
export const HEAD = handle;
