export function StarBookSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="starbook-grid">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="starbook-skel" />
      ))}
    </div>
  );
}
