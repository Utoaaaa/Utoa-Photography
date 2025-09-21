import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DotNavigation } from '../../src/components/ui/DotNavigation';

describe('DotNavigation', () => {
  it('renders correct number of dots when not grouped', () => {
    render(
      <DotNavigation
        totalPhotos={5}
        activeIndex={0}
        onDotClick={() => {}}
        collectionTitle="Test Collection"
      />
    );

    const dots = screen.getAllByTestId('dot-button');
    expect(dots.length).toBe(5);
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('groups dots when totalPhotos is large', () => {
    render(
      <DotNavigation
        totalPhotos={120}
        activeIndex={0}
        onDotClick={() => {}}
        collectionTitle="Large Collection"
      />
    );

  const dots = screen.getAllByTestId('dot-button');
  // Grouped view should render multiple groups but not exceed maxVisibleDots
  expect(dots.length).toBeGreaterThanOrEqual(10);
  expect(dots.length).toBeLessThanOrEqual(40);
  });

  it('calls onDotClick with correct index', () => {
    const onDotClick = jest.fn();
    render(
      <DotNavigation
        totalPhotos={5}
        activeIndex={2}
        onDotClick={onDotClick}
        collectionTitle="Test"
      />
    );

    const dots = screen.getAllByTestId('dot-button');
    fireEvent.click(dots[3]);
    expect(onDotClick).toHaveBeenCalledWith(3);
  });
});
