import "./dashboard-ui.css";

export default function DashboardPageShell({ children }) {
  return <div className="dashboard-page">{children}</div>;
}

export function PageHeader({ title, description, eyebrow, actions, className = "" }) {
  return <header className={`dashboard-page-header ${className}`}>
    <div>{eyebrow && <p className="dashboard-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="dashboard-description">{description}</p>}</div>
    {actions && <div className="dashboard-header-actions">{actions}</div>}
  </header>;
}

export function Card({ as: Element = "section", className = "", children, ...props }) {
  return <Element className={`dashboard-card ${className}`} {...props}>{children}</Element>;
}
