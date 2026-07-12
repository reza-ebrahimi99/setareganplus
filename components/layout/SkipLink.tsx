export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      پرش به محتوای اصلی
    </a>
  );
}
