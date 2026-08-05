// @ts-check

/**
 * @typedef {"ali-cdn-real-ip" | "x-forwarded-for" | "unknown" | "untrusted-header"} ClientIpSource
 * @typedef {{ rawIp: string, source: ClientIpSource }} ClientIp
 */

/**
 * @param {string | null} value
 */
function getHeaderIp(value) {
  const ip = value?.split(",")[0]?.trim();
  return ip && ip.length <= 128 ? ip : undefined;
}

/**
 * @param {string | null} originAuth
 * @param {string | undefined} cdnOriginAuth
 */
export function isTrustedCdnRequest(originAuth, cdnOriginAuth) {
  return Boolean(cdnOriginAuth && originAuth === cdnOriginAuth);
}

/**
 * @param {{
 *   originAuth: string | null,
 *   cdnOriginAuth: string | undefined,
 *   aliCdnRealIp: string | null,
 *   forwardedIp: string | null,
 *   realIp: string | null,
 * }} input
 * @returns {ClientIp}
 */
export function getClientIp(input) {
  if (isTrustedCdnRequest(input.originAuth, input.cdnOriginAuth)) {
    const cdnRealIp = getHeaderIp(input.aliCdnRealIp);
    if (cdnRealIp) {
      return { rawIp: cdnRealIp, source: "ali-cdn-real-ip" };
    }

    const forwardedIp = getHeaderIp(input.forwardedIp);
    if (forwardedIp) {
      return { rawIp: forwardedIp, source: "x-forwarded-for" };
    }

    return { rawIp: "unknown", source: "unknown" };
  }

  return {
    rawIp:
      getHeaderIp(input.forwardedIp) ||
      getHeaderIp(input.realIp) ||
      "unknown",
    source: "untrusted-header",
  };
}

/**
 * @param {string} ip
 */
export function truncateIpv4(ip) {
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

/**
 * @param {string} ip
 */
export function expandIpv6(ip) {
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

/**
 * @param {string} rawIp
 */
export function truncateIp(rawIp) {
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
