import dynamic from 'next/dynamic';

const CommentComponent = process.env.NEXT_PUBLIC_ENABLE_COMMENTS === "true"
  ? dynamic(() => import('./CommentComponent'))
  : null;

export default function CommentSection() {
  return CommentComponent ? <CommentComponent /> : null;
}
