"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader, Bot, User } from "lucide-react";
import { Destination, Place } from "./types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  destination?: Destination | null;
  selectedPlaces?: Place[];
}

export default function ChatWidget({ destination, selectedPlaces }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const buildContext = useCallback(() => {
    const parts: string[] = [];
    if (destination) parts.push(`The user is planning a trip to ${destination.name}.`);
    if (selectedPlaces?.length) {
      parts.push(`Selected places: ${selectedPlaces.map((p) => p.name).join(", ")}.`);
    }
    return parts.length ? parts.join(" ") : undefined;
  }, [destination, selectedPlaces]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: buildContext() }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, something went wrong.";
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Failed to reach the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[32rem] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">Travel Assistant</span>
              {destination && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {destination.name}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8 space-y-2">
                <Bot className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="font-medium">Ask me anything about your trip!</p>
                <p className="text-xs">Local tips, safety, food, transport&hellip;</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm flex items-center gap-1">
                  <Loader className="w-3 h-3 animate-spin" />
                  Thinking&hellip;
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your destination…"
                className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg border-none outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
