"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";
import "./CopyCodeButton.css";

export default function CopyCodeButton() {
  const [blocks, setBlocks] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const found = Array.from(document.querySelectorAll("pre"));
    // eslint-disable-next-line
    setBlocks(found);
  }, [

  ]);

  const copyText = async (pre: HTMLElement, idx: number) => {
    const code = pre.querySelector("code");
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code.textContent || "");
      const btn = document.getElementById(`copy-btn-${idx}`);
      if (btn) {
        btn.setAttribute("data-copied", "true");
        setTimeout(() => btn.removeAttribute("data-copied"), 1200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {blocks.map((pre, idx) => (
        <button
          key={idx}
          id={`copy-btn-${idx}`}
          className="copy-btn"
          title="copy"
          onClick={() => copyText(pre, idx)}
        >
          <FontAwesomeIcon
            icon={faCopy}
            className="copy-icon"
          />
          <FontAwesomeIcon
            icon={faCheck}
            className="copied-icon"
          />
        </button>
      ))}
    </>
  );
}
