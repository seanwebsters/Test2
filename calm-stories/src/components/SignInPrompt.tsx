export function SignInPrompt({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl font-semibold">{title}</h1>
      <p className="mt-4 text-mist">{body}</p>
      <p className="mt-6 text-sm text-mist">
        In this prototype, open the account menu (top right) and choose a demo persona to sign in. Production sign-in uses Calm&apos;s existing account system.
      </p>
    </div>
  );
}
