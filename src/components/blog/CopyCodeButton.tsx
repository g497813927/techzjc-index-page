"use client";

import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";
import "./CopyCodeButton.css";

export default function PreWithCopy({
  children,
  className,
  tabIndex,
  ...rest
}: React.ComponentProps<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const pre = preRef.current;
    const code = pre?.querySelector("code");
    const text = code?.textContent ?? "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="codewrap">
      <pre
        {...rest}
        ref={preRef}
        className={className ?? ""}
        tabIndex={tabIndex ?? 0}
      >
        {children}
      </pre>
            <button
        type="button"
        className="copy-btn"
        title="copy"
        data-copied={copied ? "true" : undefined}
        onClick={onCopy}
      >
        {
          copied ?
            <FontAwesomeIcon icon={faCheck} className="copied-icon" /> :
            <FontAwesomeIcon icon={faCopy} className="copy-icon" />
        }
      </button>
    </div>
  );
}
