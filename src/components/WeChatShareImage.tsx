import Image from "next/image";

type WeChatShareImageProps = {
  src: string;
  alt?: string;
};

export function WeChatShareImage({
  src,
  alt = "WeChat Share Image",
}: WeChatShareImageProps) {
  return (
    <Image
      alt={alt}
      src={src}
      width={800}
      height={800}
      className="hidden-wechat"
      unoptimized
    />
  );
}
