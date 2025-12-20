"use client";

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';

export function MDXContent({
  source,
}: {
  source: MDXRemoteSerializeResult;
}) {

  return <MDXRemote {...source} />
}
