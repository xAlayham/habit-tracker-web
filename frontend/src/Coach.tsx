import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const COACH_URL = import.meta.env.VITE_COACH_URL;

const TOOL_LABELS: Record<string, string> = {
  get_user_habits: "Reading your habits",
  get_habit_detail: "Checking a habit",
  search_habit_research: "Searching the research",
};

interface Message {
  role: "user" | "coach";
  text: string;
  failed?: boolean;
}

interface CoachEvent {
  type: "text" | "tool_start" | "tool_end" | "done" | "error";
  delta?: string;
  name?: string;
  answer?: string;
  detail?: string;
  code?: string;
}

const SUGGESTIONS = [
  "How am I doing overall?",
  "I broke my streak — should I give up?",
  "Which habit should I focus on?",
];

export default function Coach() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  function appendToCoachMessage(delta: string) {
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last === undefined || last.role !== "coach") {
        return [...current, { role: "coach", text: delta }];
      }
      return [...current.slice(0, -1), { ...last, text: last.text + delta }];
    });
  }

  function showFailure(text: string) {
    setMessages((current) => [...current, { role: "coach", text, failed: true }]);
  }

  function handleEvent(event: CoachEvent) {
    if (event.type === "text" && event.delta !== undefined) {
      setStatus(null);
      appendToCoachMessage(event.delta);
      return;
    }
    if (event.type === "tool_start" && event.name !== undefined) {
      setStatus(`${TOOL_LABELS[event.name] ?? "Working"}…`);
      return;
    }
    if (event.type === "tool_end") {
      setStatus(null);
      return;
    }
    if (event.type === "error") {
      setStatus(null);
      showFailure(event.detail ?? "The coach could not finish that answer.");
    }
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed === "" || isStreaming) {
      return;
    }

    const token = localStorage.getItem("access_token");
    if (token === null) {
      navigate("/login");
      return;
    }

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setQuestion("");
    setIsStreaming(true);
    setStatus("Thinking…");

    try {
      const response = await fetch(`${COACH_URL}/coach/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed }),
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        showFailure(
          retryAfter === null
            ? "You're asking a bit fast. Give it a moment and try again."
            : `You're asking a bit fast. Try again in ${retryAfter} seconds.`
        );
        return;
      }

      if (!response.ok || response.body === null) {
        showFailure("The coach is unavailable right now. Please try again.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const dataLine = frame
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (dataLine === undefined) {
            continue;
          }
          try {
            handleEvent(JSON.parse(dataLine.slice(6)) as CoachEvent);
          } catch {
            // a malformed frame should not kill the rest of the stream
          }
        }
      }
    } catch {
      showFailure(
        "Can't reach the coach. It may be waking up from sleep — wait a few seconds and try again."
      );
    } finally {
      setIsStreaming(false);
      setStatus(null);
    }
  }

  if (!isOpen) {
    return (
      <button
        className="coach-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open the habit coach"
      >
        Ask coach
      </button>
    );
  }

  return (
    <div className="coach-panel" role="dialog" aria-label="Habit coach">
      <div className="coach-header">
        <h3 className="coach-title">Habit coach</h3>
        <button
          className="coach-close"
          onClick={() => setIsOpen(false)}
          aria-label="Close the habit coach"
        >
          ×
        </button>
      </div>

      <div className="coach-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="coach-intro">
            <p>Ask about your habits. Answers are grounded in real research.</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                className="coach-suggestion"
                onClick={() => ask(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.failed
                ? "coach-message coach-message-error"
                : `coach-message coach-message-${message.role}`
            }
          >
            {message.text}
          </div>
        ))}

        {status !== null && <p className="coach-status">{status}</p>}
      </div>

      <form
        className="coach-input-row"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          ask(question);
        }}
      >
        <input
          className="coach-input"
          value={question}
          onChange={(changeEvent) => setQuestion(changeEvent.target.value)}
          placeholder="Ask about your habits…"
          maxLength={2000}
          disabled={isStreaming}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={isStreaming || question.trim() === ""}
        >
          {isStreaming ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
