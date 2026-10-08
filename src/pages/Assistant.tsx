import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { askAssistant } from "../services/assistantService";

import {
    deleteSavedAssistantAnswer,
    getSavedAssistantAnswers,
    saveAssistantAnswer,
    type SavedAssistantAnswer,
} from "../services/savedAssistantService";

import {
    addAssistantChatMessage,
    createAssistantChat,
    deleteAssistantChat,
    getAssistantChatMessages,
    getAssistantChats,
    type AssistantChat,
} from "../services/assistantChatService";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  question?: string;
  saved?: boolean;
};

function Assistant() {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] =
    useState<"chat" | "history" | "saved">("chat");
    const [savedAnswers, setSavedAnswers] = useState<SavedAssistantAnswer[]>([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [chats, setChats] = useState<AssistantChat[]>([]);
    const [activeChatId, setActiveChatId] =
    useState<string | null>(null);
    const [chatsLoading, setChatsLoading] = useState(false);

    useEffect(() => {
        if (view !== "saved") {
            return;
        }

        const loadSavedAnswers = async () => {
            setSavedLoading(true);

            try {
            const answers = await getSavedAssistantAnswers();
            setSavedAnswers(answers);
            } catch (error) {
            console.error("Could not load saved answers:", error);
            } finally {
            setSavedLoading(false);
            }
        };

        loadSavedAnswers();
    }, [view]);

    useEffect(() => {
    const loadChats = async () => {
        setChatsLoading(true);

        try {
        const savedChats = await getAssistantChats();
        setChats(savedChats);
        } catch (error) {
        console.error(
            "Could not load assistant chats:",
            error
        );
        } finally {
        setChatsLoading(false);
        }
    };

    loadChats();
    }, []);

    const handleAsk = async () => {
        const trimmedQuestion = question.trim();

        if (!trimmedQuestion || loading) {
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: trimmedQuestion,
        };

        setMessages((current) => [
            ...current,
            userMessage,
        ]);

        setQuestion("");
        setLoading(true);

        try {
            let chatId = activeChatId;

            if (!chatId) {
            chatId = await createAssistantChat(
                trimmedQuestion
            );

            setActiveChatId(chatId);
            }

            await addAssistantChatMessage(
            chatId,
            "user",
            trimmedQuestion
            );

            const history = messages
                .slice(-12)
                .map((message) => ({
                    role: message.role,
                    content: message.content,
                }));

            const answer = await askAssistant(
            trimmedQuestion,
            history
            );

            await addAssistantChatMessage(
            chatId,
            "assistant",
            answer
            );

            const assistantMessage: Message = {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: answer,
            question: trimmedQuestion,
            saved: false,
            };

            setMessages((current) => [
            ...current,
            assistantMessage,
            ]);

            const updatedChats =
            await getAssistantChats();

            setChats(updatedChats);
        } catch (error) {
            console.error(error);

            const errorMessage: Message = {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content:
                "Something went wrong. Please try again.",
            };

            setMessages((current) => [
            ...current,
            errorMessage,
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAnswer = async (
        messageId: string,
        question: string,
        answer: string
        ) => {
        try {
            await saveAssistantAnswer(question, answer);

            setMessages((current) =>
            current.map((message) =>
                message.id === messageId
                ? { ...message, saved: true }
                : message
            )
            );
        } catch (error) {
            console.error("Could not save answer:", error);
        }
    };

    const handleDeleteSavedAnswer = async (
        answerId: string
        ) => {
        const confirmed = window.confirm(
            "Delete this saved answer?"
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteSavedAssistantAnswer(answerId);

    setSavedAnswers((current) =>
      current.filter(
        (answer) => answer.id !== answerId
      )
    );
        } catch (error) {
            console.error(
            "Could not delete saved answer:",
            error
            );
        }
    };
    const handleNewChat = () => {
        setMessages([]);
        setQuestion("");
        setActiveChatId(null);
    };

    const handleOpenChat = async (chatId: string) => {
    setChatsLoading(true);

    try {
        const storedMessages =
        await getAssistantChatMessages(chatId);

        const loadedMessages: Message[] =
        storedMessages.map((message, index) => {
            const previousMessage =
            storedMessages[index - 1];

            return {
            id: message.id,
            role: message.role,
            content: message.content,
            question:
                message.role === "assistant" &&
                previousMessage?.role === "user"
                ? previousMessage.content
                : undefined,
            };
        });

        setMessages(loadedMessages);
        setActiveChatId(chatId);
        setView("chat");
        } catch (error) {
            console.error(
            "Could not open assistant chat:",
            error
            );
        } finally {
            setChatsLoading(false);
        }
    };

    const handleDeleteChat = async (
    chatId: string
    ) => {
    const confirmed = window.confirm(
        "Delete this chat and all of its messages?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await deleteAssistantChat(chatId);

        setChats((current) =>
        current.filter((chat) => chat.id !== chatId)
        );

        if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
        }
    } catch (error) {
        console.error(
        "Could not delete assistant chat:",
        error
        );
    }
    };

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
                Business assistant
                </p>

                <h1 className="mt-1 text-3xl font-bold text-[var(--charcoal)]">
                Mila Assistant
                </h1>

                <p className="mt-2 text-sm text-[var(--muted)]">
                Ask questions about your clients, cleanings,
                schedule, and payments.
                </p>
            </div>

            {view === "chat" && messages.length > 0 && (
                <button
                type="button"
                onClick={handleNewChat}
                className="shrink-0 rounded-xl border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-semibold text-[var(--charcoal)]"
                >
                New chat
                </button>
            )}
            </div>

            {/* Chat / History / Saved tabs */}
            <div className="mb-4 flex w-fit rounded-xl bg-white p-1 shadow-sm">
            <button
                type="button"
                onClick={() => setView("chat")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "chat"
                    ? "bg-[var(--blue-dark)] text-white"
                    : "text-[var(--muted-dark)]"
                }`}
            >
                Chat
            </button>

            <button
            type="button"
            onClick={() => setView("history")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "history"
                ? "bg-[var(--blue-dark)] text-white"
                : "text-[var(--muted-dark)]"
            }`}
            >
            History
            </button>

            <button
                type="button"
                onClick={() => setView("saved")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "saved"
                    ? "bg-[var(--blue-dark)] text-white"
                    : "text-[var(--muted-dark)]"
                }`}
            >
                Saved
            </button>
            </div>

            {view === "chat" ? (
            <>
                
            {/* Conversation */}
            <div className="min-h-[220px] rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-sm sm:p-6">
                {messages.length === 0 ? (
                    <div className="flex min-h-[180px] items-center justify-center text-center">
                        <div className="max-w-md">
                            <h2 className="text-xl font-bold text-[var(--charcoal)]">
                            What would you like to know?
                            </h2>

                            <p className="mt-2 text-sm text-[var(--muted)]">
                            Try asking about your schedule, clients,
                            payments, or business trends.
                            </p>
                        </div>
                    </div>
                ) : (
                <div className="space-y-5">
                {messages.map((message) => (
                    <div
                    key={message.id}
                    className={
                        message.role === "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                    >
                    <div
                        className={
                        message.role === "user"
                            ? "max-w-[85%] rounded-2xl rounded-br-md bg-[var(--blue-dark)] px-4 py-3 text-sm text-white"
                            : "max-w-[90%] rounded-2xl rounded-bl-md bg-[var(--cream)] px-4 py-3 text-sm text-[var(--charcoal)]"
                        }
                    >
                        {message.role === "assistant" ? (
                        <div>
                            <div className="space-y-2 leading-6 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_ul]:ml-5 [&_ul]:list-disc">
                            <ReactMarkdown>
                                {message.content}
                            </ReactMarkdown>
                            </div>

                                {message.question && (
                                <div className="mt-3 border-t border-black/10 pt-2">
                                    <button
                                    type="button"
                                    disabled={message.saved}
                                    onClick={() =>
                                        handleSaveAnswer(
                                        message.id,
                                    message.question!,
                                    message.content
                                    )
                                    }
                                    className="text-xs font-semibold text-[var(--blue-dark)] disabled:opacity-60"
                                    >
                                    {message.saved
                                        ? "✓ Saved"
                                        : "☆ Save answer"}
                                    </button>
                                </div>
                                )}
                    </div>
                ) : (
                <p className="whitespace-pre-wrap">
                    {message.content}
                </p>
                )}
            </div>
        </div>
        ))}

        {loading && (
        <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-[var(--cream)] px-4 py-3 text-sm text-[var(--muted)]">
                Mila is thinking...
            </div>
        </div>
        )}
        </div>
        )}
        </div>

            {/* Question box */}
            <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-white p-3 shadow-sm">
            <textarea
                value={question}
                onChange={(event) =>
                setQuestion(event.target.value)
                }
                placeholder="Ask Mila something..."
                rows={3}
                className="w-full resize-none border-0 bg-transparent p-2 text-[var(--charcoal)] outline-none"
            />

            <div className="flex justify-end">
                <button
                type="button"
                onClick={handleAsk}
                disabled={loading || !question.trim()}
                className="rounded-xl bg-[var(--blue-dark)] px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                {loading ? "Thinking..." : "Ask Mila"}
                </button>
            </div>
            </div>
                  </>
    ) : view === "history" ? (
      /* Chat history */
      <div className="space-y-3">
        {chatsLoading ? (
          <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-8 text-center text-sm text-[var(--muted)] shadow-sm">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-8 text-center shadow-sm">
            <h2 className="font-bold text-[var(--charcoal)]">
              No chat history yet
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Your conversations with Mila will appear here.
            </p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-sm"
            >
              <button
                type="button"
                onClick={() => handleOpenChat(chat.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate font-semibold text-[var(--charcoal)]">
                  {chat.title}
                </p>

                {chat.updatedAt && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {chat.updatedAt
                      .toDate()
                      .toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                  </p>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteChat(chat.id)}
                className="shrink-0 text-xs font-semibold text-red-700 hover:underline"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    ) : (
        /* Saved answers */
        <div className="space-y-4">
            {savedLoading ? (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-8 text-center text-sm text-[var(--muted)] shadow-sm">
                Loading saved answers...
            </div>
            ) : savedAnswers.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-8 text-center shadow-sm">
                <h2 className="font-bold text-[var(--charcoal)]">
                No saved answers yet
                </h2>

                <p className="mt-2 text-sm text-[var(--muted)]">
                Save useful Mila responses and they will
                appear here.
                </p>
            </div>
            ) : (
            savedAnswers.map((savedAnswer) => (
                <article
                key={savedAnswer.id}
                className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm"
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
                        Question
                    </p>

                    <h2 className="mt-1 font-bold text-[var(--charcoal)]">
                        {savedAnswer.question}
                    </h2>

                    <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                        <div className="space-y-2 text-sm leading-6 text-[var(--charcoal)] [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_ul]:ml-5 [&_ul]:list-disc">
                        <ReactMarkdown>
                            {savedAnswer.answer}
                        </ReactMarkdown>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                        {savedAnswer.savedAt ? (
                            <p className="text-xs text-[var(--muted)]">
                            Saved{" "}
                            {savedAnswer.savedAt
                                .toDate()
                                .toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                })}
                            </p>
                        ) : (
                            <span />
                        )}

                        <button
                            type="button"
                            onClick={() =>
                            handleDeleteSavedAnswer(savedAnswer.id)
                            }
                            className="text-xs font-semibold text-red-700 hover:underline"
                        >
                            Delete
                        </button>
                    </div>
                </article>
            ))
            )}
        </div>
        )}
    </div>
);
}

export default Assistant;