import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IoLogOutOutline,
  IoSearchOutline,
  IoCloseOutline,
} from "react-icons/io5";

const avatarColors = [
  "bg-[#d8e6cf] text-[#496147]",
  "bg-[#f1d8c4] text-[#815b3f]",
  "bg-[#d5e1eb] text-[#49637b]",
  "bg-[#efd6df] text-[#8a536c]",
  "bg-[#d5e7cf] text-[#4c7045]",
  "bg-[#e7d9ef] text-[#6e537c]",
];

function ContactAvatar({ contact, colorClass, online, className = "" }) {
  const initials = contact.username
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className={`relative h-[38px] w-[38px] shrink-0 ${className}`}>
      {contact.image ? (
        <img
          src={contact.image}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center rounded-full text-[12px] font-bold ${colorClass}`}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
      {online && (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 h-[10px] w-[10px] rounded-full border-2 border-white bg-[#32e84a]"
        />
      )}
    </span>
  );
}

function SideBar({
  userData,
  contacts,
  contactsLoading,
  contactsError,
  presenceError,
  onlineUsers,
  onLogout,
  logoutLoading,
  selectedContact,
  onSelectContact,
  className = "",
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const username = userData?.username || "Chatrio member";
  const onlineContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          String(contact.id) !== String(userData?.id) &&
          onlineUsers.has(String(contact.id)),
      ),
    [contacts, onlineUsers, userData?.id],
  );
  const filteredContacts = useMemo(
    () => {
      const normalize = (value) =>
        value
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase();
      const searchTerms = normalize(query.trim()).split(/\s+/).filter(Boolean);

      return contacts
        .map((contact) => {
          const normalizedUsername = normalize(contact.username);
          const matches = searchTerms.every((term) =>
            normalizedUsername.includes(term),
          );
          let rank = 0;
          if (searchTerms.length > 0) {
            rank =
              normalizedUsername === searchTerms.join(" ")
                ? 0
                : normalizedUsername.startsWith(searchTerms[0])
                  ? 1
                  : 2;
          }
          return { contact, matches, rank };
        })
        .filter(({ matches }) => matches)
        .sort(
          (first, second) =>
            first.rank - second.rank ||
            contacts.indexOf(first.contact) - contacts.indexOf(second.contact),
        )
        .map(({ contact }) => contact);
    },
    [contacts, query],
  );
  const hasSearchQuery = query.trim().length > 0;

  return (
    <aside
      className={`relative h-dvh w-full shrink-0 flex-col overflow-hidden bg-[#f8f5f7] md:w-[30%] md:min-w-[280px] md:max-w-[320px] ${className}`}
    >
      <header className="relative z-10 flex h-[220px] shrink-0 flex-col rounded-b-[78px] bg-[#f7bfd3] px-4 pb-5 pt-7 shadow-[0_6px_9px_rgba(40,40,50,0.22)]">
        <div>
          <Link
            to="/"
            className="text-[17px] font-bold leading-5 text-white"
            aria-label="Chatrio home"
          >
            chatrio
          </Link>
        </div>

        <span className="absolute right-4 top-[55px]">
          <Link
            to="/profile"
            aria-label="Open your profile"
            className="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white text-base font-bold text-[#a83d69] shadow-[0_4px_8px_rgba(40,40,50,0.2)]"
          >
            {userData?.image ? (
              <img
                src={userData.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </Link>
          {onlineUsers.has(String(userData?.id)) && (
            <span
              aria-label="Online"
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#32e84a]"
            />
          )}
        </span>

        <h1 className="mt-3 truncate text-[17px] font-bold text-[#34343a]">
          Hii, {username}
        </h1>

        <div className="mt-4 flex h-12 min-w-0 shrink-0 items-center gap-2">
          {searchOpen ? (
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 shadow-[0_3px_6px_rgba(40,40,50,0.16)]">
              <IoSearchOutline
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[#34343a]"
              />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people or chats"
                aria-label="Search people or chats"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#34343a] outline-none placeholder:text-[#88838a]"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                aria-label="Close search"
                className="shrink-0 text-[#62626b]"
              >
                <IoCloseOutline aria-hidden="true" className="h-5 w-5" />
              </button>
            </label>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
                title="Search users and chats"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#34343a] shadow-[0_4px_8px_rgba(40,40,50,0.2)] transition hover:-translate-y-0.5"
              >
                <IoSearchOutline aria-hidden="true" className="h-4 w-4" />
              </button>
              <div
                className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden py-1"
                aria-label={`Online users, ${onlineContacts.length} online`}
              >
                {onlineContacts.map((contact, index) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => onSelectContact(contact)}
                    aria-label={`Open chat with ${contact.username}`}
                    title={contact.username}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:-translate-y-0.5"
                  >
                    <ContactAvatar
                      contact={contact}
                      colorClass={avatarColors[index % avatarColors.length]}
                      online
                      className="h-10 w-10"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <div
        className={`min-h-0 flex-1 overflow-y-auto pb-16 ${
          hasSearchQuery
            ? "bg-white px-[9px] pt-1"
            : "bg-[#f8f5f7] px-[9px] pt-3.5"
        }`}
      >
        <div className="flex flex-col gap-2">
          {contactsLoading && (
            <p className="px-3 py-5 text-center text-sm text-[#62626b]">
              Loading contacts...
            </p>
          )}
          {contactsError && (
            <p className="px-3 py-5 text-center text-sm text-rose-700" role="alert">
              {contactsError}
            </p>
          )}
          {presenceError && (
            <p className="px-3 pb-2 text-center text-xs text-rose-700" role="alert">
              Presence unavailable: {presenceError}
            </p>
          )}
          {!contactsLoading &&
            !contactsError &&
            filteredContacts.map((contact, index) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelectContact(contact)}
                aria-pressed={selectedContact?.id === contact.id}
                className={`flex min-h-[56px] w-full shrink-0 items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-left shadow-[0_3px_7px_rgba(40,40,50,0.12)] transition hover:bg-[#fff4f8] ${
                  selectedContact?.id === contact.id
                    ? "ring-2 ring-[#e576a3]"
                    : ""
                }`}
              >
                <ContactAvatar
                  contact={contact}
                  colorClass={avatarColors[index % avatarColors.length]}
                  online={onlineUsers.has(String(contact.id))}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#34343a]">
                      {contact.username}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] leading-3 ${
                        onlineUsers.has(String(contact.id))
                          ? "text-green-700"
                          : "text-[#88838a]"
                      }`}
                    >
                      {contact.lastMessage
                        ? new Date(
                            contact.lastMessage.createdAt,
                          ).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : onlineUsers.has(String(contact.id))
                          ? "Online"
                          : "Offline"}
                    </span>
                  </span>
                  <span className="truncate text-[11px] leading-4 text-[#77717a]">
                    {contact.lastMessage
                      ? `${String(contact.lastMessage.senderId) === String(userData?.id) ? "You: " : ""}${contact.lastMessage.message || (contact.lastMessage.image ? "Image" : "")}`
                      : onlineUsers.has(String(contact.id))
                        ? "Online"
                        : "Offline"}
                  </span>
                </span>
              </button>
            ))}
          {!contactsLoading &&
            !contactsError &&
            filteredContacts.length === 0 && (
            <p className="px-3 py-5 text-center text-sm text-[#62626b]">
              No contacts found.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={logoutLoading}
        aria-label={logoutLoading ? "Logging out" : "Log out"}
        title={logoutLoading ? "Logging out..." : "Log out"}
        className="absolute bottom-[9px] left-[11px] z-20 flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#f3a8c4] text-[#34343a] shadow-[0_5px_8px_rgba(40,40,50,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <IoLogOutOutline aria-hidden="true" className="h-5 w-5" />
      </button>
    </aside>
  );
}

export default SideBar;
