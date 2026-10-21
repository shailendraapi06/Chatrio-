import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IoLogOutOutline,
  IoSearchOutline,
  IoCloseOutline,
} from "react-icons/io5";

const contacts = [
  { name: "Virtual Code", initials: "VC", color: "bg-[#d8e6cf] text-[#496147]" },
  { name: "Krishna", initials: "K", color: "bg-[#f1d8c4] text-[#815b3f]" },
  { name: "Aditya", initials: "A", color: "bg-[#d5e1eb] text-[#49637b]" },
  { name: "Shizuka", initials: "S", color: "bg-[#efd6df] text-[#8a536c]" },
  { name: "Hulk", initials: "H", color: "bg-[#d5e7cf] text-[#4c7045]" },
  { name: "Ankush Sahu", initials: "AS", color: "bg-[#e7d9ef] text-[#6e537c]" },
];

function SideBar({
  userData,
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
        contact.name.toLowerCase().includes(query.trim().toLowerCase()),
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

        <Link
          to="/profile"
          aria-label="Open your profile"
          className="absolute right-4 top-[55px] flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white text-base font-bold text-[#a83d69] shadow-[0_4px_8px_rgba(40,40,50,0.2)]"
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
          {filteredContacts.map((contact) => (
            <button
              key={contact.name}
              type="button"
              onClick={() => onSelectContact(contact)}
              aria-pressed={selectedContact?.name === contact.name}
              className={
                hasSearchQuery
                  ? `flex h-12 w-full shrink-0 items-center gap-2 border-b border-[#d8d8dc] px-1 text-left transition hover:bg-[#fff4f8] ${
                      selectedContact?.name === contact.name
                        ? "bg-[#fff0f5]"
                        : ""
                    }`
                  : `flex h-[40px] w-full shrink-0 items-center gap-2 rounded-full bg-white pr-4 text-left shadow-[0_5px_8px_rgba(40,40,50,0.2)] transition hover:-translate-y-0.5 ${
                      selectedContact?.name === contact.name
                        ? "ring-2 ring-[#e576a3]"
                        : ""
                    }`
              }
            >
              <span
                className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${contact.color}`}
                aria-hidden="true"
              >
                {contact.initials}
              </span>
              <span className="truncate text-[13px] font-semibold text-[#34343a]">
                {contact.name}
              </span>
            </button>
          ))}
          {filteredContacts.length === 0 && (
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
