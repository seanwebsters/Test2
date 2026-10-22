export default function Loading() {
  return (
    <div className="px-4 pt-10 md:px-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-12 w-64" />
      <div className="skeleton mt-6 aspect-[16/9] w-full rounded-[32px] lg:aspect-[21/9]" />
      <div className="mt-10 flex gap-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton aspect-square w-[168px] shrink-0" />)}</div>
    </div>
  );
}
