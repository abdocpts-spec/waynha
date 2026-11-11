"use client";

import type { QuickReply } from "@/lib/search/clarify";

export default function QuickReplies({
  replies,
  disabled,
  onSelect,
}: {
  replies: QuickReply[];
  disabled?: boolean;
  onSelect: (message: string) => void;
}) {
  if (replies.length === 0) return null;

  return (
    <div className="quick-replies">
      {replies.map((reply) => (
        <button
          key={`${reply.label}-${reply.message}`}
          type="button"
          className="quick-reply-btn"
          disabled={disabled}
          onClick={() => onSelect(reply.message)}
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
