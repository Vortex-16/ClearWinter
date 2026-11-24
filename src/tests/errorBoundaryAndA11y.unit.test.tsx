import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { DiurnalSmogChart } from '../components/DiurnalSmogChart';
import { ErrorBoundary } from '../components/ErrorBoundary';

function ThrowOnce({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Simulated render failure');
  }
  return <div>Workspace healthy</div>;
}

describe('ErrorBoundary and enhanced keyboard accessibility unit tests', () => {
  it('ErrorBoundary catches render errors, displays accessible recovery UI, and passes axe-core audit', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    let shouldThrow = true;

    function ControlledChild() {
      return <ThrowOnce shouldThrow={shouldThrow} />;
    }

    const { container } = render(
      <ErrorBoundary>
        <ControlledChild />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong rendering ClearWinter');

    const audit = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(audit.violations).toHaveLength(0);

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Reload Workspace' }));
    expect(screen.getByText('Workspace healthy')).toBeInTheDocument();
  });

  it('DiurnalSmogChart supports Left, Right, Home, and End keyboard navigation across hourly bars', async () => {
    const user = userEvent.setup();

    render(
      <DiurnalSmogChart aqi={210} bestVentilationWindow="1:30 PM – 3:30 PM" />,
    );

    const bar2Pm = screen.getByRole('button', { name: /^2 PM:/i });
    bar2Pm.focus();
    expect(bar2Pm).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{ArrowRight}');
    const bar3Pm = screen.getByRole('button', { name: /^3 PM:/i });
    expect(bar3Pm).toHaveFocus();
    expect(bar3Pm).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(bar2Pm).toHaveFocus();
    expect(bar2Pm).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{Home}');
    const bar12Am = screen.getByRole('button', { name: /^12 AM:/i });
    expect(bar12Am).toHaveFocus();
    expect(bar12Am).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{End}');
    const bar11Pm = screen.getByRole('button', { name: /^11 PM:/i });
    expect(bar11Pm).toHaveFocus();
    expect(bar11Pm).toHaveAttribute('aria-pressed', 'true');
  });
});
