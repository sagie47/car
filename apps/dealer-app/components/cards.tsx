import type { PropsWithChildren, ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">LotPilot</p>
        <h2>{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  subtitle,
  children,
  accent = 'blue'
}: PropsWithChildren<{ title?: string; subtitle?: string; accent?: 'blue' | 'amber' | 'green' | 'slate' }>) {
  return (
    <section className={`card card-${accent}`}>
      {title ? (
        <div className="card-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatGrid({
  stats
}: {
  stats: Array<{ label: string; value: string | number; hint?: string; tone?: 'blue' | 'amber' | 'green' | 'slate' }>;
}) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <div key={stat.label} className={`stat-card stat-${stat.tone ?? 'slate'}`}>
          <p className="stat-label">{stat.label}</p>
          <p className="stat-value">{stat.value}</p>
          {stat.hint ? <p className="stat-hint">{stat.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card title={title} accent="amber">
      <p className="muted">{body}</p>
    </Card>
  );
}

export function Badge({ children, tone = 'slate' }: PropsWithChildren<{ tone?: 'blue' | 'amber' | 'green' | 'slate' }>) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
