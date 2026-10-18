export default function Loading() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-10 md:px-8" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-[46vh] rounded-3xl" />
      <div className="mt-10 h-6 w-56 rounded-lg skeleton" />
      <div className="mt-5 flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[3/4] w-[220px] shrink-0 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
