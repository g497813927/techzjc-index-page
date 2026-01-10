"use client";

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import Image from 'next/image';

export function MDXContent({
  source
}: {
  source: MDXRemoteSerializeResult;
}) {

  return <MDXRemote {...source} components={{ Image: Image }} />;
}
