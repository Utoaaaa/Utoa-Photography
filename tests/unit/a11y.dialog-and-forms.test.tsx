import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import AccessibleDialog from '../../src/components/ui/AccessibleDialog';


describe('AccessibleDialog a11y', () => {
  it('has proper dialog semantics', async () => {
    render(
      <AccessibleDialog open titleId="confirm-title" onClose={() => {}} dataTestId="confirm-dialog">
        <p id="confirm-title">Title</p>
        <button data-autofocus>Confirm</button>
        <button>Cancel</button>
      </AccessibleDialog>
    );
    const dialog = screen.getByTestId('confirm-dialog');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title');
  const results = await axe(dialog);
  expect(results.violations).toHaveLength(0);
  });
});

describe('Form error aria', () => {
  function Field({ value }: { value: string }) {
    const hasError = !value;
    return (
      <div>
        <label htmlFor="f">Field</label>
        <input id="f" aria-invalid={hasError} aria-describedby={hasError ? 'f-error' : undefined} />
        {hasError && <div id="f-error">Field is required</div>}
      </div>
    );
  }

  it('links error text with aria-describedby and sets aria-invalid', async () => {
    const { container } = render(<Field value="" />);
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'f-error');
  const results = await axe(container);
  expect(results.violations).toHaveLength(0);
  });
});
