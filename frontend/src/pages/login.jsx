import { Link } from "react-router-dom";

function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff0f5] px-4 py-8">
      <section className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-rose-200/60">
        <div className="relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-b-[35%] bg-gradient-to-br from-[#f8b3cd] to-[#e576a3] text-white shadow-md">
          <span className="absolute -left-10 -top-14 h-40 w-40 rounded-full bg-white/10" />
          <span className="absolute -bottom-16 -right-8 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/40 bg-white/20 text-2xl font-bold shadow-sm backdrop-blur-sm">
            c
          </div>
          <p className="relative mt-3 text-sm font-medium tracking-[0.2em] text-white/90">
            CHATRIO
          </p>
        </div>

        <div className="px-7 pb-8 pt-7 sm:px-10">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Log in to continue the conversation
            </p>
          </div>

          <form className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                className="h-12 w-full rounded-lg border border-rose-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#e576a3] focus:ring-4 focus:ring-[#f8b3cd]/25"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-12 w-full rounded-lg border border-rose-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#e576a3] focus:ring-4 focus:ring-[#f8b3cd]/25"
              />
            </label>

            <button
              type="button"
              className="mt-2 h-12 w-full rounded-lg bg-[#e576a3] text-sm font-semibold text-white shadow-md shadow-rose-200 transition hover:bg-[#d85b8e] focus:outline-none focus:ring-4 focus:ring-[#f8b3cd]/35"
            >
              Log In
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-[#cc5687] hover:text-[#a83d69]"
            >
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
