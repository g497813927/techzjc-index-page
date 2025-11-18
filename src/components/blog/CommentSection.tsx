"use client";
import Giscus from '@giscus/react';
import './CommentSection.css';

export default function CommentSection() {
    if (process.env.NODE_ENV === "development") {
            return (
                <em className='comment-section'>
                    Comments are disabled in development mode.
                </em>
            )
    } else if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "true") {
        return (
        <em className='comment-section'>
            由于相关政策，您当前访问的网络环境无法使用评论功能，敬请谅解。
        </em>
    )} else {
        return (
            <Giscus
            id="comments"
            repo="techzjc/blog-discussions"
            repoId="R_kgDOQYYKNw"
            category="Announcements"
            categoryId="DIC_kwDOQYYKN84Cx8L7"
            mapping="title"
            reactionsEnabled="1"
            emitMetadata="1"
            inputPosition="top"
            theme="light"
            loading="lazy"
            />
        );
    }
}
