# Next.js prerender pathname regression

Next.js 16.4.2 fixes the double-decoding bug that required the local 16.3.0
prerender patch. The version-specific recipe, installer, installer tests, and
Docker copy steps have been removed. Dependencies now use the published runtime
without local source changes.

The old matcher extracted and decoded dynamic parameters from an already decoded
`resolvedPathname`. A valid request such as
`/en-US/blog/2026/01/01/%25` could therefore throw before the missing-post handler
returned 404. In 16.4.2,
`dist/server/route-modules/app-page/helpers/prerender-manifest-matcher.js` and its
ES module counterpart use `getRouteRegex(...).re.test(pathname)` to check the
route structure without decoding captures again.

The runtime intentionally continues passing decoded `resolvedPathname` to this
matcher and uses it for manifest lookups and cache keys. Do not carry forward the
old encoded-argument replacement: encoded static Unicode or percent-containing
route prefixes would no longer match the decoded route structure correctly.

Keep `npm run test:blog-percent-http` and `npm run test:fuzz-production` when
upgrading Next.js. The former builds a disposable production app and checks
literal percent signs, percent escapes, Unicode, existing static posts,
on-demand posts, repeated response bodies, cache headers, HEAD responses, and
ETags. The latter checks real application routing, including malformed paths and
unsupported Server Action requests. These behavior checks remain necessary even
though no installation patch is required.

The unmodified published 16.4.2 runtime passed the existing blog fixture's 360
requests and 705 assertions, including 27 static/on-demand cache controls, before
the patch was retired.
