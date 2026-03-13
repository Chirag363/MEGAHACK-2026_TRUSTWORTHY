"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  DatabaseIcon,
  MessageSquareIcon,
  PaperclipIcon,
  RotateCcwIcon,
  UploadIcon,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";

export type DashboardChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
};

type DashboardChatProps = {
  className?: string;
  messages: DashboardChatMessage[];
  onSend: (message: string) => Promise<void> | void;
  onClear?: () => void;
  isSending?: boolean;
  disabled?: boolean;
  title?: string;
  description?: string;
  onFileUpload?: (event: ChangeEvent<HTMLInputElement>) => void;
  isUploading?: boolean;
  hasDataset?: boolean;
  datasetName?: string;
};

export default function DashboardChat({
  className,
  messages,
  onSend,
  onClear,
  isSending = false,
  disabled = false,
  title = "AI Conversation",
  description = "Ask anything about your data and workflows.",
  onFileUpload,
  isUploading = false,
  hasDataset = false,
  datasetName,
}: DashboardChatProps) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages]
  );

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || isSending || disabled) return;
    void onSend(text);
    setInput("");
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-[inset_0_1px_0_var(--chat-border-soft)]",
        className
      )}
    >
      {/* Header - Fixed */}
      <div className="shrink-0 border-b border-[var(--chat-border-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/90">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--chat-text-soft)]">{description}</p>
          </div>
          <Button
            className="h-8 gap-1.5 border border-[var(--chat-border)] bg-[var(--chat-surface-elev)] px-3 text-xs text-[var(--chat-text-soft)] hover:bg-[var(--chat-surface-elev)] hover:text-[var(--chat-text)]"
            disabled={disabled || visibleMessages.length === 0}
            onClick={onClear}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcwIcon className="size-3.5" />
            Clear
          </Button>
        </div>

        {/* Dataset Warning Banner */}
        {!hasDataset && (
          <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-400/80" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-300/90">
                Dataset required
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-200/60">
                Upload a CSV or JSON dataset first — requests won't be processed
                without data. Use the{" "}
                <button
                  type="button"
                  onClick={handleFileClick}
                  className="underline underline-offset-2 hover:text-amber-200/90"
                >
                  paperclip button
                </button>{" "}
                below.
              </p>
            </div>
          </div>
        )}

        {/* Active dataset chip */}
        {hasDataset && datasetName && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5">
            <DatabaseIcon className="size-3.5 shrink-0 text-emerald-400/80" />
            <span className="min-w-0 truncate text-[11px] font-medium text-emerald-300/90">
              {datasetName}
            </span>
          </div>
        )}
      </div>

      {/* Messages Area - Scrollable via Conversation */}
      <Conversation className="flex-1 min-h-0 px-4 sm:px-5">
        <ConversationContent>
          {visibleMessages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquareIcon className="size-9 text-[var(--chat-text-muted)]" />}
              title="Start a conversation"
              description={
                hasDataset
                  ? "Send a message to start your analysis."
                  : "Upload a dataset above to start chatting."
              }
            />
          ) : (
            visibleMessages.map((message) => (
              <Message
                from={message.role === "user" ? "user" : "assistant"}
                key={message.id}
              >
                <MessageContent>
                  <MessageResponse>{message.content}</MessageResponse>
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area - Fixed at Bottom */}
      <div className="shrink-0 border-t border-[var(--chat-border-soft)] p-4 sm:px-5 sm:pb-5 sm:pt-3">
          <PromptInput
            className="w-full rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface-elev)]"
            onSubmit={handleSubmit}
          >
            <PromptInputTextarea
              className="min-h-11 px-3 pt-2.5 text-sm text-[var(--chat-text)] placeholder:text-[var(--chat-text-muted)]"
              disabled={disabled || isSending}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder={
                hasDataset
                  ? "Ask something about your data..."
                  : "Upload a dataset first to begin chatting..."
              }
              value={input}
            />

            <PromptInputFooter className="border-t border-[var(--chat-border-soft)] px-2.5 py-2">
              <PromptInputTools>
                {onFileUpload && (
                  <>
                    <button
                      type="button"
                      title={
                        hasDataset
                          ? "Replace dataset (.csv / .json)"
                          : "Upload dataset (.csv / .json)"
                      }
                      disabled={isUploading}
                      onClick={handleFileClick}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg text-[var(--chat-text-muted)] transition-colors hover:bg-[var(--chat-surface-elev)] hover:text-[var(--chat-text)]",
                        isUploading && "cursor-wait opacity-60"
                      )}
                    >
                      {isUploading ? (
                        <UploadIcon className="size-4 animate-pulse" />
                      ) : (
                        <PaperclipIcon className="size-4" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json,text/csv,application/json"
                      className="hidden"
                      onChange={onFileUpload}
                    />
                  </>
                )}
                {!hasDataset && !isUploading && (
                  <span className="ml-1 text-[10px] text-amber-400/70">
                    No dataset loaded
                  </span>
                )}
                {isUploading && (
                  <span className="ml-1 text-[10px] text-cyan-400/70">
                    Uploading…
                  </span>
                )}
              </PromptInputTools>

              <PromptInputSubmit
                disabled={!input.trim() || disabled || isSending}
                status={isSending ? "submitted" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
      </div>
    </section>
  );
}
