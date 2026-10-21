import { useEffect, useRef, useState } from "react";
import {
  IoArrowBackOutline,
  IoImageOutline,
  IoHappyOutline,
  IoSendOutline,
} from "react-icons/io5";

function Avatar({ name, image, className = "" }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={`shrink-0 rounded-full border border-white object-cover shadow-sm ${
          className || "h-10 w-10"
        }`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border border-white bg-[#f3dce6] text-xs font-bold text-[#8a536c] shadow-sm ${
        className || "h-10 w-10"
      }`}
    >
      {name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );
}

function MessageArea({
  contact,
  currentUser,
  messages,
  loading,
  error,
  isOnline,
  onSendMessage,
  onBack,
}) {
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUserName = currentUser?.username || "You";
  const currentUserImage = currentUser?.image || "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) {
      return;
    }

    setSending(true);
    setSendError("");
    try {
      await onSendMessage(text);
      setDraft("");
    } catch (error) {
      setSendError(error.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <section className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col bg-[#e9edf4]">
      <header className="relative z-10 flex h-[72px] shrink-0 items-center gap-3 rounded-b-[24px] bg-[#f7bfd3] px-4 shadow-[0_4px_8px_rgba(40,40,50,0.18)] sm:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30 md:hidden"
        >
          <IoArrowBackOutline aria-hidden="true" className="h-5 w-5" />
        </button>
        <span className="relative h-10 w-10 shrink-0">
          <Avatar name={contact.username} image={contact.image} />
          {isOnline && (
            <span
              aria-label="Online"
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#32e84a]"
            />
          )}
        </span>
        <h1 className="truncate text-[15px] font-semibold text-[#34343a]">
          {contact.username}
        </h1>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        aria-live="polite"
      >
        {loading ? (
          <p className="pt-6 text-center text-sm text-[#62626b]">
            Loading messages...
          </p>
        ) : error ? (
          <p className="pt-6 text-center text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : messages.length === 0 ? (
          <p className="pt-6 text-center text-sm text-[#62626b]">
            No messages yet. Say hello to {contact.username}!
          </p>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {messages.map((message) => {
              const isCurrentUser =
                message.sender === "current" ||
                String(message.senderId) === String(currentUser.id);
              const senderName = isCurrentUser
                ? currentUserName
                : contact.username;
              const senderImage = isCurrentUser
                ? currentUserImage
                : contact.image;

              return (
                <div
                  key={message._id || message.id}
                  className={`flex items-end gap-2 ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isCurrentUser && (
                    <Avatar
                      name={senderName}
                      image={senderImage}
                      className="h-9 w-9"
                    />
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 shadow-[0_3px_7px_rgba(40,40,50,0.13)] sm:max-w-[65%] ${
                      isCurrentUser
                        ? "rounded-br-md bg-[#f4b6ce] text-[#34343a]"
                        : "rounded-bl-md bg-[#f9dce8] text-[#34343a]"
                    }`}
                  >
                    {(message.message || message.text) && (
                      <p className="whitespace-pre-wrap break-words">
                        {message.message || message.text}
                      </p>
                    )}
                  </div>
                  {isCurrentUser && (
                    <Avatar
                      name={senderName}
                      image={senderImage}
                      className="h-9 w-9"
                    />
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
        {sendError && (
          <p className="mx-2 mb-2 text-xs text-rose-700" role="alert">
            {sendError}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-[46px] items-center gap-2 rounded-full bg-[#f4b6ce] px-3 shadow-[0_4px_8px_rgba(40,40,50,0.17)] sm:px-4"
        >
          <button
            type="button"
            onClick={() => setDraft((value) => `${value}😊`)}
            aria-label="Add a smile emoji"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30"
          >
            <IoHappyOutline aria-hidden="true" className="h-5 w-5" />
          </button>
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              event.currentTarget.style.height = "32px";
              event.currentTarget.style.height = `${Math.min(
                event.currentTarget.scrollHeight,
                96,
              )}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            aria-label={`Message ${contact.username}`}
            rows={1}
            className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-5 text-[#34343a] outline-none placeholder:text-[#6d5862]"
          />
          <button
            type="button"
            disabled
            aria-label="Attach an image"
            title="Image messages are not supported yet"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IoImageOutline aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IoSendOutline aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

export default MessageArea;
