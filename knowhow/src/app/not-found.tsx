import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[80svh] place-items-center px-6 text-center">
      <div>
        <div className="display text-[120px] leading-none text-lime">404</div>
        <p className="editorial mt-2 text-3xl">This rabbit hole goes nowhere.</p>
        <Link href="/" className="btn-lime mt-8">Back to something interesting</Link>
      </div>
    </div>
  );
}
