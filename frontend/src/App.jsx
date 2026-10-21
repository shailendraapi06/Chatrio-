import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import MessageArea from "./components/messageArea.jsx";
import SideBar from "./components/sideBar.jsx";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";
import Profile from "./pages/profile.jsx";
import { fetchCurrentUser, logoutUser } from "./redux/userSlice.js";

const demoMessagesByContact = {
  "Virtual Code": [
    {
      id: "virtual-1",
      sender: "contact",
      text: "Hey! Are you working on the project?",
    },
    {
      id: "virtual-2",
      sender: "current",
      text: "Yes, just polishing the chat UI.",
    },
  ],
  Krishna: [
    { id: "krishna-1", sender: "contact", text: "Hi! How are you doing?" },
    { id: "krishna-2", sender: "current", text: "Doing great, thanks 😊" },
  ],
  Aditya: [
    {
      id: "aditya-1",
      sender: "contact",
      text: "Did you get a chance to see the update?",
    },
  ],
  Shizuka: [
    { id: "shizuka-1", sender: "contact", text: "That sounds lovely!" },
    { id: "shizuka-2", sender: "current", text: "I'll share the details soon." },
  ],
  Hulk: [
    { id: "hulk-1", sender: "contact", text: "hello hulk . natasa" },
  ],
  "Ankush Sahu": [
    { id: "ankush-1", sender: "contact", text: "Welcome to Chatrio!" },
  ],
};

function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData, status, error, sessionStatus, sessionError } =
    useSelector((state) => state.user);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messagesByContact, setMessagesByContact] = useState(
    () =>
      Object.fromEntries(
        Object.entries(demoMessagesByContact).map(([name, messages]) => [
          name,
          [...messages],
        ]),
      ),
  );

  const handleLogout = async () => {
    const result = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(result)) {
      navigate("/login");
    }
  };

  const handleSendMessage = (message) => {
    setMessagesByContact((currentMessages) => ({
      ...currentMessages,
      [selectedContact.name]: [
        ...(currentMessages[selectedContact.name] || []),
        message,
      ],
    }));
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
        onLogout={handleLogout}
        logoutLoading={status === "loading"}
        selectedContact={selectedContact}
        onSelectContact={setSelectedContact}
      />
      {selectedContact ? (
        <MessageArea
          contact={selectedContact}
          currentUser={userData}
          messages={messagesByContact[selectedContact.name] || []}
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