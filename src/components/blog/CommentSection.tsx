import dynamic from 'next/dynamic';

export default function CommentSection() {
  if (process.env.NEXT_PUBLIC_ENABLE_COMMENTS !== "true") {
    return null;
  }
  
  const CommentComponent = dynamic(() => import('./CommentComponent'), {
    ssr: false
  });
  
  return <CommentComponent />;
}
