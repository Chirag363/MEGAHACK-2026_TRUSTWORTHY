"use client";

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
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

  const downloadMessages = useMemo<UIMessage[]>(
    () =>
      visibleMessages.map((message, index) => ({
        id: message.id || `${message.role}-${index}`,
        role: message.role,
        parts: [{ type: "text", text: message.content }],
      })),
    [visibleMessages]
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
        "flex h-full min-h-[28rem] flex-col rounded-2xl border border-white/10 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/90">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-white/55">{description}</p>
        </div>
        <Button
          className="h-8 gap-1.5 border border-white/12 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white"
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
        <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5">
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
              below or the Upload button at the top.
            </p>
          </div>
        </div>
      )}

      {/* Active dataset chip */}
      {hasDataset && datasetName && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5">
          <DatabaseIcon className="size-3.5 shrink-0 text-emerald-400/80" />
          <span className="min-w-0 truncate text-[11px] font-medium text-emerald-300/90">
            {datasetName}
          </span>
        </div>
      )}

      <Separator className="mt-3 bg-linear-to-r from-transparent via-white/10 to-transparent" />

      {/* Chat Body */}
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <Conversation className="min-h-0 flex-1 rounded-xl border border-white/8 bg-[#060310]/80">
          <ConversationContent className="p-4 sm:p-5">
            {visibleMessages.length === 0 ? (
              <ConversationEmptyState
                description={
                  hasDataset
                    ? "Send a message to start your analysis."
                    : "Upload a dataset above to start chatting."
                }
                icon={
                  <MessageSquareIcon className="size-9 text-white/40" />
                }
                title="Start a conversation"
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
          <ConversationDownload messages={downloadMessages} />
          <ConversationScrollButton />
        </Conversation>

        {/* Prompt Input */}
        <PromptInput
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/3"
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea
            className="min-h-11 px-3 pt-2.5 text-sm text-white placeholder:text-white/35"
            disabled={disabled || isSending}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder={
              hasDataset
                ? "Ask something about your data..."
                : "Upload a dataset first to begin chatting..."
            }
            value={input}
          />

          <PromptInputFooter className="border-t border-white/8 px-2.5 py-2">
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
                      "flex h-7 w-7 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/8 hover:text-white/80",
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
