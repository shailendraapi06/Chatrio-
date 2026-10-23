import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  IoArrowBackOutline,
  IoImageOutline,
  IoHappyOutline,
  IoSendOutline,
  IoCloseOutline,
  IoArrowUndoOutline,
  IoDownloadOutline,
  IoRemoveOutline,
  IoAddOutline,
} from "react-icons/io5";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

function renderMessageText(text, keyPrefix) {
  const urlPattern = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    let url = match[0];
    let trailing = "";
    while (/[.,!?;:]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    for (const [closer, opener] of [
      [")", "("],
      ["]", "["],
      ["}", "{"],
    ]) {
      while (
        url.endsWith(closer) &&
        url.split(closer).length > url.split(opener).length
      ) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
    }

    parts.push(text.slice(lastIndex, match.index));
    if (url) {
      const href = url.toLowerCase().startsWith("www.")
        ? `https://${url}`
        : url;
      try {
        const parsedUrl = new URL(href);
        if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
          parts.push(
            <a
              key={`${keyPrefix}-${match.index}`}
              href={parsedUrl.href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[#8a3e61] underline decoration-[#b96c8a] underline-offset-2 hover:text-[#682844]"
              onClick={(event) => event.stopPropagation()}
            >
              {url}
            </a>,
          );
        } else {
          parts.push(url);
        }
      } catch {
        parts.push(url);
      }
    }
    parts.push(trailing);
    lastIndex = match.index + match[0].length;
  }

  parts.push(text.slice(lastIndex));
  return parts;
}

function ChatImage({ src, alt, className, onClick }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`flex items-center justify-center rounded-lg bg-black/5 px-3 py-4 text-xs text-[#62535a] ${className}`}
        role="img"
        aria-label="Image unavailable"
      >
        Image unavailable
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open image preview"
      className={`relative block max-w-full cursor-zoom-in overflow-hidden rounded-lg ${className}`}
    >
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        className={`max-h-72 max-w-full object-contain transition-opacity ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      />
      {loading && (
        <span className="flex h-20 w-32 items-center justify-center bg-black/5 text-xs text-[#62535a]">
          Loading image...
        </span>
      )}
    </button>
  );
}

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
  const [selectedImage, setSelectedImage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageZoom, setImageZoom] = useState(1);
  const [imageViewerError, setImageViewerError] = useState("");
  const imageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const swipeStartRef = useRef(null);
  const currentUserName = currentUser?.username || "You";
  const currentUserImage = currentUser?.image || "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!imagePreview) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeImagePreview();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imagePreview]);

  const sendMessage = async () => {
    const text = draft.trim();
    if ((!text && !selectedImage) || sending) {
      return;
    }

    setSending(true);
    setSendError("");
    try {
      await onSendMessage({
        message: text,
        ...(selectedImage ? { image: selectedImage } : {}),
        ...(replyTo?._id ? { replyTo: replyTo._id } : {}),
      });
      setDraft("");
      setSelectedImage("");
      setReplyTo(null);
      setEmojiPickerOpen(false);
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

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setSendError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setSendError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setSendError("Images must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedImage(reader.result);
      } else {
        setSendError("Unable to read the selected image.");
      }
    };
    reader.onerror = () => setSendError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  };

  const getReplyContent = (reply) => {
    if (reply?.messageId === null) {
      return null;
    }
    if (
      reply?.messageId &&
      typeof reply.messageId === "object" &&
      (reply.messageId.message !== undefined ||
        reply.messageId.image !== undefined)
    ) {
      return reply.messageId;
    }
    return reply?.message || reply?.image ? reply : null;
  };
  const getReplyPreview = (message) => {
    const original = getReplyContent(message);
    if (!original) {
      return "Original message unavailable";
    }
    return (
      original.message ||
      original.text ||
      original.fileName ||
      (original.image ? "Image" : "")
    );
  };
  const openImagePreview = (src, messageId) => {
    const mimeType = src.match(/^data:image\/(png|jpeg|webp);/i)?.[1];
    const extension =
      mimeType === "jpeg"
        ? "jpg"
        : mimeType || (src.match(/\.(png|jpe?g|webp)(?:[?#]|$)/i)?.[1] || "jpg");
    setImagePreview({
      src,
      fileName: `chatrio-${messageId || "image"}.${extension}`,
    });
    setImageZoom(1);
    setImageViewerError("");
  };

  const closeImagePreview = () => {
    setImagePreview("");
    setImageZoom(1);
    setImageViewerError("");
  };

  const downloadImage = async () => {
    setImageViewerError("");
    try {
      const response = await fetch(imagePreview.src);
      if (!response.ok) {
        throw new Error("Image download failed.");
      }
      const imageBlob = await response.blob();
      if (!imageBlob.type.startsWith("image/")) {
        throw new Error("The selected file is not an image.");
      }

      const downloadUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = imagePreview.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      setImageViewerError(
        "Could not download this image. Please try opening it again.",
      );
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
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold text-[#34343a]">
            {contact.username}
          </h1>
          <p className="text-[11px] text-[#62535a]">
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
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
                  className={`group flex touch-pan-y items-end gap-2 ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                  onPointerDown={(event) => {
                    if (
                      event.isPrimary &&
                      event.pointerType === "touch" &&
                      !event.target.closest("button, a, input, textarea")
                    ) {
                      swipeStartRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                      };
                    }
                  }}
                  onPointerUp={(event) => {
                    const start = swipeStartRef.current;
                    swipeStartRef.current = null;
                    if (
                      start
                      && event.pointerType === "touch"
                      && start.x - event.clientX > 60
                      && start.x - event.clientX >
                        Math.abs(start.y - event.clientY) * 1.2
                    ) {
                      setReplyTo(message);
                    }
                  }}
                  onPointerCancel={() => {
                    swipeStartRef.current = null;
                  }}
                >
                  {!isCurrentUser && (
                    <Avatar
                      name={senderName}
                      image={senderImage}
                      className="h-9 w-9"
                    />
                  )}
                  <div
                    className={`flex max-w-[78%] flex-col rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 shadow-[0_3px_7px_rgba(40,40,50,0.13)] sm:max-w-[65%] ${
                      isCurrentUser
                        ? "rounded-br-md bg-[#f4b6ce] text-[#34343a]"
                        : "rounded-bl-md bg-[#f9dce8] text-[#34343a]"
                    }`}
                  >
                    {message.replyTo && (
                      <div className="mb-2 flex w-full flex-col rounded-lg border-l-[3px] border-[#a85f7d] bg-white/55 px-2.5 py-1.5 text-left">
                        {!getReplyContent(message.replyTo) ? (
                          <p className="text-[12px] italic leading-4 text-[#55464d]">
                            Original message unavailable
                          </p>
                        ) : (
                          <>
                            {getReplyContent(message.replyTo).image && (
                              <ChatImage
                                src={getReplyContent(message.replyTo).image}
                                alt="Replied image"
                                className="mt-1 max-h-16 max-w-20"
                                onClick={() =>
                                  openImagePreview(
                                    getReplyContent(message.replyTo).image,
                                    getReplyContent(message.replyTo)._id,
                                  )
                                }
                              />
                            )}
                            {getReplyPreview(message.replyTo) && (
                              <p className="line-clamp-2 break-words text-[12px] leading-4 text-[#55464d]">
                                {renderMessageText(
                                  getReplyPreview(message.replyTo),
                                  `quoted-${message._id}`,
                                )}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {message.image && (
                      <ChatImage
                        src={message.image}
                        alt="Image attachment"
                        className="mb-1 max-h-72"
                        onClick={() =>
                          openImagePreview(message.image, message._id)
                        }
                      />
                    )}
                    {(message.message || message.text) && (
                      <p className="whitespace-pre-wrap break-words">
                        {renderMessageText(
                          message.message || message.text,
                          `message-${message._id}`,
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(message)}
                    aria-label="Reply to this message"
                    title="Reply"
                    className="mb-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#743d55] opacity-0 transition hover:bg-white/70 hover:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 md:flex"
                  >
                    <IoArrowUndoOutline
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </button>
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
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-[#a85f7d] bg-white/75 px-3 py-2">
            {replyTo.image && (
              <ChatImage
                src={replyTo.image}
                alt="Replied image"
                className="h-12 w-12 shrink-0"
                onClick={() => openImagePreview(replyTo.image, replyTo._id)}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#743d55]">
                Replying to{" "}
                {String(replyTo.senderId) === String(currentUser.id)
                  ? "yourself"
                  : contact.username}
              </p>
              <p className="truncate text-xs text-[#62535a]">
                {getReplyPreview(replyTo)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              disabled={sending}
              aria-label="Cancel reply"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#743d55] hover:bg-[#f4b6ce]/40 disabled:opacity-40"
            >
              <IoCloseOutline aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        )}
        {selectedImage && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/70 p-2">
            <img
              src={selectedImage}
              alt="Selected image preview"
              className="h-14 w-14 rounded-lg object-cover"
            />
            <span className="flex-1 text-xs text-[#62535a]">
              Image ready to send
            </span>
            <button
              type="button"
              onClick={() => setSelectedImage("")}
              disabled={sending}
              aria-label="Remove selected image"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#743d55] hover:bg-[#f4b6ce]/40 disabled:opacity-40"
            >
              <IoCloseOutline aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="relative">
          {emojiPickerOpen && (
            <div className="absolute bottom-14 left-0 z-20">
              <Suspense
                fallback={
                  <div className="flex h-[350px] w-[320px] items-center justify-center rounded-xl bg-white text-sm text-[#62535a] shadow-lg">
                    Loading emojis...
                  </div>
                }
              >
                <EmojiPicker
                  onEmojiClick={(emoji) => {
                    setDraft((value) => `${value}${emoji.emoji}`);
                    setEmojiPickerOpen(false);
                  }}
                  width={320}
                  height={350}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                />
              </Suspense>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex min-h-[46px] items-center gap-2 rounded-full bg-[#f4b6ce] px-3 shadow-[0_4px_8px_rgba(40,40,50,0.17)] sm:px-4"
          >
            <button
              type="button"
              onClick={() => setEmojiPickerOpen((open) => !open)}
              disabled={sending}
              aria-label="Choose an emoji"
              aria-expanded={emojiPickerOpen}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30 disabled:opacity-40"
            >
              <IoHappyOutline aria-hidden="true" className="h-5 w-5" />
            </button>
            <textarea
              value={draft}
              disabled={sending}
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
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageSelection}
              className="hidden"
              aria-label="Choose an image"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={sending}
              aria-label="Attach an image"
              title="Attach a PNG, JPEG, or WebP image (max 1 MB)"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30 disabled:opacity-40"
            >
              <IoImageOutline aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={(!draft.trim() && !selectedImage) || sending}
              aria-label="Send message"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#743d55] transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IoSendOutline aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image options"
          onClick={closeImagePreview}
        >
          <div
            className="flex max-h-full max-w-full flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={imagePreview.src}
              alt="Full-size image preview"
              onError={() =>
                setImageViewerError("This image is no longer available.")
              }
              className="max-h-[75dvh] max-w-[90vw] rounded-lg object-contain transition-transform duration-150"
              style={{ transform: `scale(${imageZoom})` }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setImageZoom((zoom) => Math.max(1, zoom - 0.25))
                }
                disabled={imageZoom <= 1}
                aria-label="Zoom out"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#34343a] shadow transition hover:bg-[#f7bfd3] disabled:opacity-40"
              >
                <IoRemoveOutline aria-hidden="true" className="h-5 w-5" />
              </button>
              <span className="min-w-12 text-center text-sm text-white">
                {Math.round(imageZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setImageZoom((zoom) => Math.min(3, zoom + 0.25))
                }
                disabled={imageZoom >= 3}
                aria-label="Zoom in"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#34343a] shadow transition hover:bg-[#f7bfd3] disabled:opacity-40"
              >
                <IoAddOutline aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={downloadImage}
                aria-label="Download image"
                className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-[#34343a] shadow transition hover:bg-[#f7bfd3]"
              >
                <IoDownloadOutline aria-hidden="true" className="h-5 w-5" />
                Download
              </button>
              <button
                type="button"
                onClick={closeImagePreview}
                aria-label="Close image preview"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#34343a] shadow transition hover:bg-[#f7bfd3]"
              >
                <IoCloseOutline aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            {imageViewerError && (
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-rose-700" role="alert">
                {imageViewerError}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default MessageArea;
