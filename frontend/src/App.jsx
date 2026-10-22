import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import MessageArea from "./components/messageArea.jsx";
import SideBar from "./components/sideBar.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";
import Profile from "./pages/profile.jsx";
import { fetchCurrentUser, logoutUser } from "./redux/userSlice.js";
import {
  fetchContacts,
  fetchConversationMessages,
  sendConversationMessage,
} from "./redux/api.js";
import { connectPresenceSocket } from "./realtime/presenceSocket.js";

function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData, status, error, sessionStatus, sessionError } =
    useSelector((state) => state.user);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [messagesByContact, setMessagesByContact] = useState({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [presenceError, setPresenceError] = useState("");

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
      .then((messages) => {
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
  }, [selectedContact]);

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
        className={selectedContact ? "hidden md:flex" : "flex"}
        userData={userData}
        contacts={contacts}
        contactsLoading={contactsLoading}
        contactsError={contactsError}
        presenceError={presenceError}
        onlineUsers={onlineUsers}
        onLogout={handleLogout}
        logoutLoading={status === "loading"}
        selectedContact={selectedContact}
        onSelectContact={setSelectedContact}
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
          onBack={() => setSelectedContact(null)}
        />
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
  const { userData } = useSelector((state) => state.user);
  const hasCheckedSession = useRef(false);

  useEffect(() => {
    if (!hasCheckedSession.current) {
      hasCheckedSession.current = true;
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]);

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
        element={userData ? <Home /> : <Navigate to="/login" replace />}
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