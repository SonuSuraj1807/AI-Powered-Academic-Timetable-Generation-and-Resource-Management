/**
 * LoadingSkeleton — Shimmer loading placeholder for data-dependent views.
 */
export function SkeletonLine({ width = '100%', height = '16px', style = {} }) {
  return (
    <div className="skeleton" style={{ width, height, ...style }} />
  );
}

export function SkeletonCard({ style = {} }) {
  return (
    <div className="solid-card" style={{ padding: '24px', ...style }}>
      <SkeletonLine width="40%" height="20px" style={{ marginBottom: '12px' }} />
      <SkeletonLine width="70%" height="14px" style={{ marginBottom: '8px' }} />
      <SkeletonLine width="55%" height="14px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6, style = {} }) {
  return (
    <div className="solid-card" style={{ padding: '20px', ...style }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${100 / cols}%`} height="32px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${100 / cols}%`} height="24px" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = 'card', count = 3, ...props }) {
  if (type === 'table') return <SkeletonTable {...props} />;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...props} />
      ))}
    </div>
  );
}
