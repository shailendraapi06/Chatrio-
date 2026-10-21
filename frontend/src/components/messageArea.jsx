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
  onSendMessage,
  onBack,
}) {
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentUserName = currentUser?.username || "You";
  const currentUserImage = currentUser?.image || "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text && !attachment) {
      return;
    }

    onSendMessage({
      id: `${Date.now()}-${Math.random()}`,
      sender: "current",
      ...(text ? { text } : {}),
      ...(attachment ? { image: attachment } : {}),
    });
    setDraft("");
    setAttachment(null);
    setAttachmentError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  const handleAttachment = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAttachmentError("");
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAttachmentError("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAttachmentError("Images must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachment(reader.result);
      } else {
        setAttachmentError("Could not read this image. Please try again.");
      }
    };
    reader.onerror = () => {
      setAttachmentError("Could not read this image. Please try again.");
    };
    reader.readAsDataURL(file);
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
        <Avatar name={contact.name} image={contact.image} />
        <h1 className="truncate text-[15px] font-semibold text-[#34343a]">
          {contact.name}
        </h1>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="pt-6 text-center text-sm text-[#62626b]">
            No messages yet. Say hello to {contact.name}!
          </p>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {messages.map((message) => {
              const isCurrentUser = message.sender === "current";
              const senderName = isCurrentUser
                ? currentUserName
                : contact.name;
              const senderImage = isCurrentUser
                ? currentUserImage
                : contact.image;

              return (
                <div
                  key={message.id}
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
                    {message.text && (
                      <p className="whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                    )}
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Shared in conversation"
                        className={`max-h-52 max-w-full rounded-lg object-cover ${
                          message.text ? "mt-2" : ""
                        }`}
                      />
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
        {attachment && (
          <div className="mx-2 mb-2 flex items-center gap-3 rounded-xl bg-white/80 p-2">
            <img
              src={attachment}
              alt="Selected attachment preview"
              className="h-14 w-20 rounded-md object-cover"
            />
            <span className="flex-1 text-xs text-[#62626b]">
              Image ready to send
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="px-2 text-sm font-semibold text-[#a83d69]"
            >
              Remove
            </button>
          </div>
        )}
        {attachmentError && (
          <p className="mx-2 mb-2 text-xs text-rose-700" role="alert">
            {attachmentError}
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
            aria-label={`Message ${contact.name}`}
            rows={1}
            className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-5 text-[#34343a] outline-none placeholder:text-[#6d5862]"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAttachment}
            className="sr-only"
            aria-label="Choose an image attachment"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach an image"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30"
          >
            <IoImageOutline aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!draft.trim() && !attachment}
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
