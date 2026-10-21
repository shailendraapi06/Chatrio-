import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  IoCameraOutline,
  IoChevronBackOutline,
} from "react-icons/io5";
import { clearAuthError, updateProfile } from "../redux/userSlice.js";

function Profile() {
  const dispatch = useDispatch();
  const { userData, status, error } = useSelector((state) => state.user);
  const [username, setUsername] = useState(userData?.username || "");
  const [email, setEmail] = useState(userData?.email || "");
  const [photoPreview, setPhotoPreview] = useState(userData?.image || "");
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    setUsername(userData?.username || "");
    setEmail(userData?.email || "");
    setPhotoPreview(userData?.image || "");
    setSelectedPhoto("");
  }, [userData]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setFormError("");
    setSaved(false);
    setSelectedPhoto("");
    setPhotoPreview(userData?.image || "");

    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFormError("Choose a PNG, JPEG, or WebP photo.");
      return;
    }

    if (file.size > 1024 * 1024) {
      setFormError("Profile photos must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setFormError("Could not read this photo. Please try another file.");
        return;
      }
      setSelectedPhoto(reader.result);
      setPhotoPreview(reader.result);
    };
    reader.onerror = () => {
      setFormError("Could not read this photo. Please try another file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaved(false);

    const result = await dispatch(
      updateProfile({
        username: username.trim(),
        email: email.trim(),
        ...(selectedPhoto ? { image: selectedPhoto } : {}),
      }),
    );

    if (updateProfile.fulfilled.match(result)) {
      setSaved(true);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff0f5] px-4 py-8 sm:px-6">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-rose-200/60">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#f8b3cd] to-[#e576a3] px-6 py-6 text-white sm:px-9">
          <span className="absolute -right-8 -top-16 h-44 w-44 rounded-full bg-white/10" />
          <span className="absolute -bottom-24 right-36 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              <IoChevronBackOutline aria-hidden="true" className="h-5 w-5" />
              Back to chats
            </Link>
            <span className="text-xs font-semibold tracking-[0.2em] text-white/90">
              CHATRIO
            </span>
          </div>
          <div className="relative mt-8">
            <p className="text-sm font-medium text-white/85">YOUR SPACE</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Your profile
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/90">
              Add a little personality and make it easier for friends to
              recognize you.
            </p>
          </div>
        </header>

        <div className="grid gap-8 px-6 py-8 sm:px-9 sm:py-10 md:grid-cols-[220px_1fr] md:gap-10">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-gradient-to-br from-[#fce1eb] to-[#f8b3cd] text-5xl font-bold text-[#cc5687] shadow-lg shadow-rose-200/70 ring-1 ring-rose-100">
                {photoPreview || userData?.image ? (
                  <img
                    src={photoPreview || userData.image}
                    alt={`${username}'s profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden="true">
                    {(username || "C").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <label className="absolute bottom-1 right-1 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-[#e576a3] text-white shadow-md transition hover:scale-105 hover:bg-[#d85b8e] focus-within:ring-4 focus-within:ring-[#f8b3cd]/40">
                <IoCameraOutline aria-hidden="true" className="h-6 w-6" />
                <span className="sr-only">Choose a profile photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
            <p className="mt-5 text-lg font-bold text-slate-800">
              {username || "Your name"}
            </p>
            <p className="mt-1 text-sm text-slate-500">Your Chatrio profile</p>
            <p className="mt-4 max-w-[210px] text-xs leading-5 text-slate-400">
              Choose a PNG, JPEG, or WebP photo up to 1 MB.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                Account details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Edit your account details and save your profile.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Username
                </span>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setSaved(false);
                    setFormError("");
                  }}
                  placeholder="Enter your username"
                  minLength={2}
                  required
                  className="h-12 w-full rounded-lg border border-rose-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#e576a3] focus:ring-4 focus:ring-[#f8b3cd]/25"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setSaved(false);
                    setFormError("");
                  }}
                  placeholder="Enter your email"
                  required
                  className="h-12 w-full rounded-lg border border-rose-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#e576a3] focus:ring-4 focus:ring-[#f8b3cd]/25"
                />
              </label>
            </div>

            <div className="mt-7 rounded-xl border border-rose-100 bg-[#fff8fb] px-4 py-3.5">
              <p className="text-sm font-semibold text-[#a83d69]">
                Looking good!
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your profile helps people know they&apos;re chatting with you.
              </p>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-6 h-12 w-full rounded-lg bg-[#e576a3] text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:bg-[#d85b8e] focus:outline-none focus:ring-4 focus:ring-[#f8b3cd]/35 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Saving..." : "Save profile"}
            </button>
            {(formError || error) && (
              <p
                className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {formError || error}
              </p>
            )}
            {saved && (
              <p
                className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                role="status"
              >
                Profile saved successfully.
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

export default Profile;
