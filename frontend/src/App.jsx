import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import MessageArea from "./components/messageArea.jsx";
import SideBar from "./components/sideBar.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";
import Profile from "./pages/profile.jsx";
import { fetchCurrentUser, logoutUser } from "./redux/userSlice.js";
import {
  deleteConversation,
  deleteMessageForMe,
  fetchContacts,
  fetchConversationMessages,
  sendConversationMessage,
} from "./redux/api.js";
import { connectPresenceSocket } from "./realtime/presenceSocket.js";

function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { contactId } = useParams();
  const { userData, status, error, sessionStatus, sessionError } =
    useSelector((state) => state.user);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [messagesByContact, setMessagesByContact] = useState({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [presenceError, setPresenceError] = useState("");
  const selectedContact = contacts.find(
    (contact) => String(contact.id) === String(contactId),
  ) || null;

  useEffect(() => {
    setMessagesByContact({});
    setContacts([]);
  }, [userData.id]);

  useEffect(() => {
    const now = Date.now();
    const expiries = [
      ...Object.values(messagesByContact)
        .flat()
        .map((message) => new Date(message.expiresAt).getTime()),
      ...contacts.map((contact) =>
        new Date(contact.lastMessage?.expiresAt).getTime(),
      ),
    ].filter((expiry) => Number.isFinite(expiry) && expiry > now);

    if (expiries.length === 0) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      const currentTime = Date.now();
      setMessagesByContact((currentMessages) =>
        Object.fromEntries(
          Object.entries(currentMessages).map(([contactKey, messages]) => [
            contactKey,
            messages.filter(
              (message) =>
                !message.expiresAt ||
                new Date(message.expiresAt).getTime() > currentTime,
            ),
          ]),
        ),
      );
      setContacts((currentContacts) =>
        currentContacts.map((contact) =>
          contact.lastMessage?.expiresAt &&
          new Date(contact.lastMessage.expiresAt).getTime() <= currentTime
            ? { ...contact, lastMessage: null }
            : contact,
        ),
      );
    }, Math.max(0, Math.min(...expiries) - now));

    return () => window.clearTimeout(timeout);
  }, [contacts, messagesByContact]);

  useEffect(() => {
    if (!contactId || contactsLoading || contactsError) {
      return;
    }

    if (!selectedContact) {
      navigate("/", { replace: true });
    }
  }, [
    contactId,
    contactsError,
    contactsLoading,
    navigate,
    selectedContact,
  ]);

  useEffect(() => {
    setOnlineUsers(new Set());
    const socket = connectPresenceSocket();

    const handleInitialPresence = ({ onlineUsers: currentOnlineUsers = [] }) => {
      setOnlineUsers(new Set(currentOnlineUsers.map(String)));
      setPresenceError("");
    };
    const handleUserOnline = ({ userId }) => {
      if (userId) {
        setOnlineUsers((currentUsers) => new Set(currentUsers).add(String(userId)));
      }
    };
    const handleUserOffline = ({ userId }) => {
      if (userId) {
        setOnlineUsers((currentUsers) => {
          const nextUsers = new Set(currentUsers);
          nextUsers.delete(String(userId));
          return nextUsers;
        });
      }
    };
    const handleNewMessage = (message) => {
      const currentUserId = String(userData.id);
      const senderId = String(message.senderId);
      const contactId =
        senderId === currentUserId
          ? String(message.receiverId)
          : senderId;

      setContacts((currentContacts) =>
        currentContacts
          .map((contact) =>
            String(contact.id) === contactId
              ? {
                  ...contact,
                  lastMessage: {
                    message: message.message || "",
                    image: Boolean(message.image),
                    createdAt: message.createdAt,
                    expiresAt: message.expiresAt,
                    senderId,
                  },
                }
              : contact,
          )
          .sort((first, second) => {
            const firstTime = new Date(
              first.lastMessage?.createdAt || 0,
            ).getTime();
            const secondTime = new Date(
              second.lastMessage?.createdAt || 0,
            ).getTime();
            return (
              secondTime - firstTime ||
              first.username.localeCompare(second.username)
            );
          }),
      );

      setMessagesByContact((currentMessages) => {
        const existingMessages = currentMessages[contactId] || [];
        if (
          existingMessages.some(
            (existingMessage) => existingMessage._id === message._id,
          )
        ) {
          return currentMessages;
        }

        return {
          ...currentMessages,
          [contactId]: [...existingMessages, message].sort(
            (first, second) =>
              new Date(first.createdAt || 0) - new Date(second.createdAt || 0),
          ),
        };
      });
    };
    const handleConnectionError = (socketError) => {
      setPresenceError(socketError.message || "Presence connection failed.");
    };
    const handleConnect = () => setPresenceError("");

    socket.on("presence:initial", handleInitialPresence);
    socket.on("presence:online", handleUserOnline);
    socket.on("presence:offline", handleUserOffline);
    socket.on("message:new", handleNewMessage);
    socket.on("connect_error", handleConnectionError);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("presence:initial", handleInitialPresence);
      socket.off("presence:online", handleUserOnline);
      socket.off("presence:offline", handleUserOffline);
      socket.off("message:new", handleNewMessage);
      socket.off("connect_error", handleConnectionError);
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, [userData.id]);

  useEffect(() => {
    let active = true;
    setContactsLoading(true);
    setContactsError("");

    fetchContacts()
      .then((users) => {
        if (active) {
          setContacts(users);
        }
      })
      .catch((fetchError) => {
        if (active) {
          setContactsError(fetchError.message);
        }
      })
      .finally(() => {
        if (active) {
          setContactsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userData.id]);

  useEffect(() => {
    if (!selectedContact) {
      setMessagesLoading(false);
      setMessagesError("");
      return undefined;
    }

    let active = true;
    setMessagesLoading(true);
    setMessagesError("");

    fetchConversationMessages(selectedContact.id)
      .then(({ messages }) => {
        if (active) {
          setMessagesByContact((currentMessages) => ({
            ...currentMessages,
            [selectedContact.id]: [
              ...messages,
              ...(currentMessages[selectedContact.id] || []).filter(
                (existingMessage) =>
                  !messages.some(
                    (message) => message._id === existingMessage._id,
                  ),
              ),
            ].sort(
              (first, second) =>
                new Date(first.createdAt || 0) - new Date(second.createdAt || 0),
            ),
          }));
        }
      })
      .catch((fetchError) => {
        if (active) {
          setMessagesError(fetchError.message);
        }
      })
      .finally(() => {
        if (active) {
          setMessagesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedContact?.id]);

  const handleSelectContact = (contact) => {
    navigate(`/chat/${encodeURIComponent(contact.id)}`);
  };

  const handleLogout = async () => {
    const result = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(result)) {
      navigate("/login");
    }
  };

  const handleSendMessage = async (message) => {
    const savedMessage = await sendConversationMessage(
      selectedContact.id,
      message,
    );
    setMessagesByContact((currentMessages) => {
      const existingMessages = currentMessages[selectedContact.id] || [];
      if (existingMessages.some((message) => message._id === savedMessage._id)) {
        return currentMessages;
      }

      return {
        ...currentMessages,
        [selectedContact.id]: [...existingMessages, savedMessage],
      };
    });
  };

  const handleDeleteChat = async () => {
    const contactId = selectedContact?.id;
    if (!contactId) {
      return;
    }

    await deleteConversation(contactId);
    setMessagesByContact((currentMessages) => ({
      ...currentMessages,
      [contactId]: [],
    }));
    setContacts((currentContacts) =>
      currentContacts.map((contact) =>
        String(contact.id) === String(contactId)
          ? { ...contact, lastMessage: null }
          : contact,
      ),
    );
    navigate("/");
  };

  const handleDeleteMessage = async (messageId) => {
    const contactId = selectedContact?.id;
    if (!contactId) {
      return;
    }

    await deleteMessageForMe(contactId, messageId);
    const remainingMessages = (messagesByContact[contactId] || []).filter(
      (message) => String(message._id) !== String(messageId),
    );
    setMessagesByContact((currentMessages) => ({
      ...currentMessages,
      [contactId]: remainingMessages,
    }));
    const latestMessage = remainingMessages.at(-1);
    setContacts((currentContacts) =>
      currentContacts.map((contact) =>
        String(contact.id) === String(contactId)
          ? {
              ...contact,
              lastMessage: latestMessage
                ? {
                    message: latestMessage.message || "",
                    image: Boolean(latestMessage.image),
                    createdAt: latestMessage.createdAt,
                    expiresAt: latestMessage.expiresAt,
                    senderId: latestMessage.senderId,
                  }
                : null,
            }
          : contact,
      ),
    );
    fetchContacts()
      .then(setContacts)
      .catch((error) => {
        console.error("Unable to refresh contacts after deleting a message:", error);
      });
  };

  if (
    !userData &&
    (sessionStatus === "idle" || sessionStatus === "loading")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff0f5] text-sm font-medium text-[#a83d69]">
        Loading your account...
      </main>
    );
  }

  if (!userData && sessionStatus === "failed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fff0f5] px-4 text-center">
        <p className="text-sm text-rose-700" role="alert">
          {sessionError || "Could not verify your session."}
        </p>
        <button
          type="button"
          onClick={() => dispatch(fetchCurrentUser())}
          className="rounded-lg bg-[#e576a3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d85b8e]"
        >
          Try again
        </button>
      </main>
    );
  }

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#e9edf4] md:flex-row">
      <SideBar
        className={contactId ? "hidden md:flex" : "flex"}
        userData={userData}
        contacts={contacts}
        contactsLoading={contactsLoading}
        contactsError={contactsError}
        presenceError={presenceError}
        onlineUsers={onlineUsers}
        onLogout={handleLogout}
        logoutLoading={status === "loading"}
        selectedContact={selectedContact}
        onSelectContact={handleSelectContact}
      />
      {selectedContact ? (
        <MessageArea
          contact={selectedContact}
          currentUser={userData}
          messages={messagesByContact[selectedContact.id] || []}
          loading={messagesLoading}
          error={messagesError}
          isOnline={onlineUsers.has(String(selectedContact.id))}
          onSendMessage={handleSendMessage}
          onDeleteChat={handleDeleteChat}
          onDeleteMessage={handleDeleteMessage}
          onBack={() => navigate("/")}
        />
      ) : contactId && (contactsLoading || contactsError) ? (
        <section className="flex min-h-0 flex-1 items-center justify-center border-l border-[#d9dde5] px-6 text-center">
          <p className="text-sm font-medium text-[#a83d69]">
            {contactsError || "Restoring your conversation..."}
          </p>
        </section>
      ) : (
        <section className="hidden min-h-0 flex-1 items-center justify-center border-l border-[#d9dde5] px-6 text-center md:flex">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[#393e49]">
              Welcome to Chatrio
            </h1>
            <p className="mt-1.5 text-[20px] font-medium text-[#393e49]">
              Chat Friendly !
            </p>
            {error && (
              <p
                className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function ProfileRoute() {
  const dispatch = useDispatch();
  const { userData, sessionStatus, sessionError } = useSelector(
    (state) => state.user,
  );

  if (userData) {
    return <Profile />;
  }

  if (sessionStatus === "idle" || sessionStatus === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff0f5] text-sm font-medium text-[#a83d69]">
        Loading your account...
      </main>
    );
  }

  if (sessionStatus === "failed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fff0f5] px-4 text-center">
        <p className="text-sm text-rose-700" role="alert">
          {sessionError || "Could not verify your session."}
        </p>
        <button
          type="button"
          onClick={() => dispatch(fetchCurrentUser())}
          className="rounded-lg bg-[#e576a3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d85b8e]"
        >
          Try again
        </button>
      </main>
    );
  }

  return <Navigate to="/login" replace />;
}

function App() {
  const dispatch = useDispatch();
  const { userData, sessionStatus } = useSelector((state) => state.user);
  const hasCheckedSession = useRef(false);

  useEffect(() => {
    if (!hasCheckedSession.current) {
      hasCheckedSession.current = true;
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]);

  const protectedHome = userData ? (
    <Home />
  ) : sessionStatus === "idle" || sessionStatus === "loading" ? (
    <main className="flex min-h-screen items-center justify-center bg-[#fff0f5] text-sm font-medium text-[#a83d69]">
      Loading your account...
    </main>
  ) : (
    <Navigate to="/login" replace />
  );

  return (
    <Routes>
      <Route
        path="/login"
        element={!userData ? <Login /> : <Navigate to="/" replace />}
      />
      <Route
        path="/signup"
        element={!userData ? <Signup /> : <Navigate to="/" replace />}
      />
      <Route
        path="/"
        element={protectedHome}
      />
      <Route
        path="/chat/:contactId"
        element={protectedHome}
      />
      <Route
        path="/profile"
        element={<ProfileRoute />}
      />
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  );
}

export default App;