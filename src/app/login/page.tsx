'use client';

import React, { useState, useTransition } from 'react';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fillCredentials = (email: string, pass: string) => {
    setFormData({ email, password: pass });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = new FormData();
    data.append('email', formData.email);
    data.append('password', formData.password);

    startTransition(async () => {
      const result = await login(null, data);
      if (result && result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div className="glass-panel modal-content" style={{ maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              marginBottom: '16px',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-primary)' }}
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Welcome Back</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Sign in to access your inventory dashboard
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="e.g. name@aasamedchem.com"
              className="input-field"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={isPending}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="input-field"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isPending}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isPending}>
            {isPending ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.85rem',
          }}
        >
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '12px', fontWeight: 600 }}>
            Demo Accounts for Evaluation:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', textAlign: 'left' }}
              onClick={() => fillCredentials('admin@aasamedchem.com', 'admin123')}
            >
              <span>🔑 Admin Role</span>
              <span style={{ color: 'var(--color-text-muted)' }}>admin@aasamedchem.com</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', textAlign: 'left' }}
              onClick={() => fillCredentials('seller@aasamedchem.com', 'seller123')}
            >
              <span>💼 Seller Role</span>
              <span style={{ color: 'var(--color-text-muted)' }}>seller@aasamedchem.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
