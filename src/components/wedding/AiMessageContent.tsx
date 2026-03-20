"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Role = "user" | "assistant" | "system";

export default function AiMessageContent({ role, content }: { role: Role; content: string }) {
  if (role === "user") {
    return <span className="ai-msg-plain">{content}</span>;
  }

  return (
    <div className="ai-msg-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
