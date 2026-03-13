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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  type AgentStep,
} from "@/components/ai-elements/reasoning";
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
  BookmarkIcon,
  BookmarkCheckIcon,
  DatabaseIcon,
  DownloadIcon,
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
  /** True when the session has a known dataset name but the file no longer exists on the server. */
  isDatasetFileMissing?: boolean;
  /** ID of the assistant message currently being streamed (shows a blinking cursor). */
  streamingMessageId?: string | null;
  /** Live agent pipeline steps to show while the workflow is running. */
  agentSteps?: AgentStep[];
  /** True while agents are running (before first token arrives). */
  isAgentPipelineRunning?: boolean;
  /** Called when user saves a report message to the library. */
  onSaveReport?: (message: DashboardChatMessage) => void;
  /** Called when user wants to download a report message as PDF. */
  onDownloadPdf?: (message: DashboardChatMessage) => void;
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
  isDatasetFileMissing = false,
  streamingMessageId = null,
  agentSteps = [],
  isAgentPipelineRunning = false,
  onSaveReport,
  onDownloadPdf,
}: DashboardChatProps) {
  const [input, setInput] = useState("");
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
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

        {/* Re-upload banner — shown when the session had a dataset but the file is gone */}
        {isDatasetFileMissing && datasetName && (
          <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2.5">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-orange-400/90" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-orange-300/95">
                Re-upload{" "}
                <span className="font-semibold text-orange-200">{datasetName}</span>{" "}
                to continue
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-orange-200/60">
                The dataset file is no longer available on the server (this can happen after a restart).
                Use the{" "}
                <button
                  type="button"
                  onClick={handleFileClick}
                  className="underline underline-offset-2 hover:text-orange-200/90"
                >
                  paperclip button
                </button>{" "}
                below to upload it again and resume your analysis.
              </p>
            </div>
          </div>
        )}

        {/* No-dataset banner — shown for brand-new sessions with no dataset yet */}
        {!hasDataset && !isDatasetFileMissing && (
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
      <Conversation className="flex-1 min-h-0 px-4 sm:px-5" initial="instant">
        <ConversationContent>
          {visibleMessages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquareIcon className="size-9 text-[var(--chat-text-muted)]" />}
              title="Start a conversation"
              description={
                hasDataset
                  ? "Send a message to start your analysis."
                  : isDatasetFileMissing
                  ? `Re-upload ${datasetName ?? "the dataset"} to resume this session.`
                  : "Upload a dataset above to start chatting."
              }
            />
          ) : (
            visibleMessages.map((message) => {
              const isStreaming = message.id === streamingMessageId;

              // Show the agent pipeline reasoning panel on the streaming assistant message.
              const showReasoning =
                isStreaming &&
                message.role === "assistant" &&
                agentSteps.length > 0;

              const isAssistantDone =
                message.role === "assistant" && !isStreaming && message.content.trim().length > 0;
              const isSaved = savedMessageIds.has(message.id);

              return (
                <Message
                  from={message.role === "user" ? "user" : "assistant"}
                  key={message.id}
                >
                  <MessageContent>
                    {showReasoning && (
                      <Reasoning
                        isStreaming={isAgentPipelineRunning}
                        className="mb-3"
                      >
                        <ReasoningTrigger />
                        <ReasoningContent steps={agentSteps} />
                      </Reasoning>
                    )}

                    {/*
                     * Pass isAnimating so Streamdown knows whether to render
                     * progressively (streaming) or immediately (historical).
                     * The cursor lives OUTSIDE MessageResponse so Streamdown
                     * always receives a clean string as children.
                     */}
                    <MessageResponse isAnimating={isStreaming}>
                      {message.content}
                    </MessageResponse>
                    {isStreaming && (
                      <span
                        aria-hidden
                        className="inline-block h-[0.85em] w-[2px] translate-y-[1px] animate-pulse rounded-sm bg-current opacity-70"
                      />
                    )}
                  </MessageContent>

                  {/* Report action buttons — shown on completed assistant messages */}
                  {isAssistantDone && (onSaveReport || onDownloadPdf) && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {onSaveReport && (
                        <button
                          type="button"
                          title={isSaved ? "Saved to library" : "Save to library"}
                          onClick={() => {
                            onSaveReport(message);
                            setSavedMessageIds((prev) => new Set(prev).add(message.id));
                          }}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                            isSaved
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 cursor-default"
                              : "border-white/10 bg-white/4 text-white/50 hover:border-white/20 hover:bg-white/8 hover:text-white/80"
                          )}
                          disabled={isSaved}
                        >
                          {isSaved ? (
                            <BookmarkCheckIcon className="size-3" />
                          ) : (
                            <BookmarkIcon className="size-3" />
                          )}
                          {isSaved ? "Saved" : "Save to Library"}
                        </button>
                      )}

                      {onDownloadPdf && (
                        <button
                          type="button"
                          title="Download as PDF"
                          onClick={() => onDownloadPdf(message)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-white/50 transition-all hover:border-white/20 hover:bg-white/8 hover:text-white/80"
                        >
                          <DownloadIcon className="size-3" />
                          Download PDF
                        </button>
                      )}
                    </div>
                  )}
                </Message>
              );
            })
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
                  : isDatasetFileMissing
                  ? `Re-upload ${datasetName ?? "the dataset"} to resume…`
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
                {!hasDataset && !isUploading && isDatasetFileMissing && (
                  <span className="ml-1 text-[10px] text-orange-400/80">
                    Re-upload {datasetName ?? "dataset"}
                  </span>
                )}
                {!hasDataset && !isUploading && !isDatasetFileMissing && (
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
