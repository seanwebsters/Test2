"use client";

export function SignOutStudio() {
  return (
    <button
      className="ml-auto text-xs text-lavender hover:text-white"
      onClick={async () => {
        await fetch("/api/studio-login", { method: "DELETE" });
        window.location.href = "/studio-login";
      }}
    >
      Sign out
    </button>
  );
}
