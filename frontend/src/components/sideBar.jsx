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

function ContactAvatar({ contact, colorClass, online }) {
  const initials = contact.username
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="relative h-[38px] w-[38px] shrink-0">
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const username = userData?.username || "Chatrio member";
  const filteredContacts = useMemo(
    () =>
      contacts.filter((contact) =>
        contact.username.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const hasSearchQuery = query.trim().length > 0;

  return (
    <aside
      className={`relative h-dvh w-full shrink-0 flex-col overflow-hidden bg-[#f8f5f7] md:w-[30%] md:min-w-[280px] md:max-w-[320px] ${className}`}
    >
      <header className="relative z-10 h-[200px] shrink-0 rounded-b-[78px] bg-[#f7bfd3] px-4 pt-9 shadow-[0_6px_9px_rgba(40,40,50,0.22)]">
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

        <div className="mt-6 flex h-[42px] items-center">
          {searchOpen ? (
            <label className="flex h-[42px] w-full items-center gap-2 rounded-full bg-white px-3 shadow-[0_5px_8px_rgba(40,40,50,0.2)]">
              <IoSearchOutline
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-[#34343a]"
              />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search contacts"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#34343a] outline-none placeholder:text-[#88838a]"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                aria-label="Close search"
                className="text-[#62626b]"
              >
                <IoCloseOutline aria-hidden="true" className="h-5 w-5" />
              </button>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search contacts"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white text-[#34343a] shadow-[0_5px_8px_rgba(40,40,50,0.2)] transition hover:-translate-y-0.5"
            >
              <IoSearchOutline aria-hidden="true" className="h-5 w-5" />
            </button>
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
        <div className={hasSearchQuery ? "flex flex-col" : "flex flex-col gap-3"}>
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
          {!contactsLoading && !contactsError && filteredContacts.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelectContact(contact)}
              aria-pressed={selectedContact?.id === contact.id}
              className={
                hasSearchQuery
                  ? `flex h-12 w-full shrink-0 items-center gap-2 border-b border-[#d8d8dc] px-1 text-left transition hover:bg-[#fff4f8] ${
                      selectedContact?.id === contact.id
                        ? "bg-[#fff0f5]"
                        : ""
                    }`
                  : `flex h-[40px] w-full shrink-0 items-center gap-2 rounded-full bg-white pr-4 text-left shadow-[0_5px_8px_rgba(40,40,50,0.2)] transition hover:-translate-y-0.5 ${
                      selectedContact?.id === contact.id
                        ? "ring-2 ring-[#e576a3]"
                        : ""
                    }`
              }
            >
              <ContactAvatar
                contact={contact}
                colorClass={avatarColors[index % avatarColors.length]}
                online={onlineUsers.has(String(contact.id))}
              />
              <span className="truncate text-[13px] font-semibold text-[#34343a]">
                {contact.username}
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
