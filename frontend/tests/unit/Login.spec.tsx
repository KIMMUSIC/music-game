import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../src/pages/Login';

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('Login', () => {
  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );
  };

  it('should render login page with title', () => {
    renderLogin();

    expect(screen.getByText(/Music Quiz Game/i)).toBeInTheDocument();
  });

  it('should render Google login button', () => {
    renderLogin();

    const googleButton = screen.getByRole('button', { name: /google/i });
    expect(googleButton).toBeInTheDocument();
  });

  it('should redirect to Google OAuth on Google button click', () => {
    renderLogin();

    const googleButton = screen.getByRole('button', { name: /google/i });
    fireEvent.click(googleButton);

    expect(mockLocation.href).toContain('/auth/google');
  });

  it('should display login description', () => {
    renderLogin();

    expect(screen.getByText(/Sign in to play/i)).toBeInTheDocument();
  });
});
