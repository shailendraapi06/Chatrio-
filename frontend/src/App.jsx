import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Login from "./pages/login.jsx";
import Signup from "./pages/signup.jsx";
import Profile from "./pages/profile.jsx";
import { fetchCurrentUser, logoutUser } from "./redux/userSlice.js";

function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData, status, error, sessionStatus, sessionError } =
    useSelector((state) => state.user);

  const handleLogout = async () => {
    const result = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(result)) {
      navigate("/login");
    }
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
    <main className="flex min-h-screen items-center justify-center bg-[#fff0f5] px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl shadow-rose-200/60">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8b3cd] to-[#e576a3] text-2xl font-bold text-white">
          {userData.username.charAt(0).toUpperCase()}
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-800">
          Welcome, {userData.username}!
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;re signed in to Chatrio.
        </p>
        <Link
          to="/profile"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-rose-200 text-sm font-semibold text-[#cc5687] transition hover:bg-rose-50"
        >
          View profile
        </Link>
        {error && (
          <p className="mt-4 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={status === "loading"}
          className="mt-7 h-12 w-full rounded-lg bg-[#e576a3] text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:bg-[#d85b8e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Logging out..." : "Log out"}
        </button>
      </section>
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