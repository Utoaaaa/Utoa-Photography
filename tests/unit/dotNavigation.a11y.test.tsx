import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DotNavigation } from '../../src/components/ui/DotNavigation';
import { axe } from 'jest-axe';

describe('DotNavigation a11y', () => {
  const setup = (total = 7, active = 3) => {
    const onDotClick = jest.fn();
    render(
      <DotNavigation
        totalPhotos={total}
        activeIndex={active}
        onDotClick={onDotClick}
        collectionTitle="A11y Test"
      />
    );
    return { onDotClick };
  };

  it('has proper roles and no axe violations', async () => {
    setup();
    const nav = screen.getByTestId('dot-navigation');
  expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
  const results = await axe(nav);
  expect(results.violations.length).toBe(0);
  });

  it('supports keyboard navigation (Arrow and Home/End)', () => {
    const { onDotClick } = setup(5, 2);
    const radios = screen.getAllByRole('radio');
    // Focus the active radio (tabIndex=0)
    const active = radios.find((el) => el.getAttribute('tabindex') === '0') ?? radios[2];
    active.focus();

    fireEvent.keyDown(active, { key: 'ArrowDown' });
    expect(onDotClick).toHaveBeenCalled();

    fireEvent.keyDown(active, { key: 'ArrowUp' });
    fireEvent.keyDown(active, { key: 'Home' });
    fireEvent.keyDown(active, { key: 'End' });
  });
});
