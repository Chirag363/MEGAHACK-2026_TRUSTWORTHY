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
    type PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function DashboardChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) return;

    sendMessage({ text, files: message.files });
    setInput("");
  };

  return (
    <section className="flex h-[72vh] min-h-155 flex-col rounded-2xl border border-white/12 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/95">
            AI Conversation
          </p>
          <p className="mt-1 text-sm text-white/70">Testing chat with AI SDK + shadcn blocks</p>
        </div>
        <Button
          className="h-9 border border-white/20 bg-white/5 px-3.5 text-white hover:bg-white/12"
          onClick={() => setMessages([])}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RotateCcw className="mr-2 size-4" />
          Clear
        </Button>
      </div>

      <Separator className="mb-4 bg-linear-to-r from-transparent via-white/15 to-transparent" />

      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation className="min-h-0 flex-1 rounded-xl border border-white/12 bg-[#070412]/85">
          <ConversationContent className="p-4 sm:p-5">
            {messages.length === 0 ? (
              <ConversationEmptyState
                description="Send a message to verify streaming chat responses."
                icon={<MessageSquare className="size-10 text-white/70" />}
                title="Start a conversation"
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      if (part.type !== "text") return null;
                      return (
                        <MessageResponse key={`${message.id}-${i}`}>
                          {part.text}
                        </MessageResponse>
                      );
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationDownload messages={messages} />
          <ConversationScrollButton />
        </Conversation>

        <PromptInput className="mt-4 w-full rounded-xl border border-white/12 bg-white/3 p-1.5" onSubmit={handleSubmit}>
          <PromptInputTextarea
            className="min-h-14 pr-12 text-white placeholder:text-white/45"
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Ask something about your data..."
            value={input}
          />
          <PromptInputSubmit
            className="absolute bottom-2 right-2"
            disabled={!input.trim()}
            onStop={stop}
            status={status}
          />
        </PromptInput>
      </div>
    </section>
  );
}
