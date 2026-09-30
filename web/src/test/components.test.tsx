import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingHero } from '../components/landing/LandingHero';
import { TopBar } from '../components/layout/TopBar';

describe('Frontend UI Components', () => {
  it('renders LandingHero with input and curiosity chips', () => {
    const handleExplore = vi.fn();
    render(<LandingHero onExplore={handleExplore} isLoading={false} />);

    expect(screen.getByText(/What are you/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e.g./i)
    ).toBeInTheDocument();

    // Starter chips
    const chip = screen.getByText('Octopus intelligence');
    expect(chip).toBeInTheDocument();
    fireEvent.click(chip);
    expect(handleExplore).toHaveBeenCalledWith('Octopus intelligence');
  });

  it('renders TopBar with logo and search trigger', () => {
    render(<TopBar />);
    expect(screen.getByText('Curiosity Machine')).toBeInTheDocument();
    expect(screen.getByText(/Search universe/i)).toBeInTheDocument();
  });
});
