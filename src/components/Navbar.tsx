import Link from 'next/link';
import { getSession } from '@/lib/session';
import { logout } from '@/app/actions/auth';

export default async function Navbar() {
  const session = await getSession();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#06B6D4' }}
          >
            <path d="M10 2v7.5" />
            <path d="M14 2v7.5" />
            <path d="M18 6v5" />
            <path d="M17.5 11a5.5 5.5 0 0 1-11 0" />
            <path d="M12 11.5v4" />
            <path d="m19 16-1.7-1.7a2 2 0 0 0-2.8 0l-2.5 2.5a2 2 0 0 1-2.8 0L7.5 15.1" />
            <path d="M4.5 11a5.5 5.5 0 0 0 0 11h15a5.5 5.5 0 0 0 0-11" />
          </svg>
          <span>AasaMedChem</span>
        </Link>

        {session && (
          <div className="navbar-nav">
            {session.role === 'ADMIN' ? (
              <>
                <Link href="/admin/products" className="nav-link">
                  Inventory Catalog
                </Link>
                <Link href="/admin/orders" className="nav-link">
                  Quotations & Orders
                </Link>
              </>
            ) : (
              <>
                <Link href="/seller/dashboard" className="nav-link">
                  Browse & Order
                </Link>
              </>
            )}

            <div className="flex-gap" style={{ marginLeft: '12px' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  borderRight: '1px solid var(--border-color)',
                  paddingRight: '12px',
                }}
              >
                {session.name}{' '}
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: session.role === 'ADMIN' ? '#FBBF24' : '#6366F1',
                    background: session.role === 'ADMIN' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginLeft: '6px',
                    fontWeight: 600,
                  }}
                >
                  {session.role}
                </span>
              </span>

              <form action={logout}>
                <button type="submit" className="btn btn-secondary btn-sm btn-danger">
                  Logout
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
