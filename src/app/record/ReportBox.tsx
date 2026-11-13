"use client";

import { useState, useTransition } from "react";
import { deleteLog } from "@/app/actions/record";

export function ReportBox({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("리포트를 복사했어요");
    } catch {
      setCopied("복사하지 못했어요. 글자를 길게 눌러 직접 복사해 주세요");
    }
  };
  return (
    <>
      <button className="btn ghost" onClick={() => setOpen(!open)}>{open ? "상담 리포트 닫기" : "병원 상담용 리포트 만들기"}</button>
      {open && (
        <>
          <pre className="report">{text}</pre>
          <div className="row">
            <button className="btn small quiet" onClick={copy}>리포트 복사</button>
            <button className="btn small quiet" onClick={() => window.print()}>인쇄</button>
          </div>
          {copied && <p className="ok-msg">{copied}</p>}
        </>
      )}
    </>
  );
}

export function DeleteLog({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="linkbtn"
      disabled={pending}
      onClick={() => {
        if (confirm("이 기록을 지울까요?")) start(() => deleteLog(id));
      }}
    >
      삭제
    </button>
  );
}
