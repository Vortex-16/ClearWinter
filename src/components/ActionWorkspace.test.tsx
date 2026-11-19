import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGIONAL_PRESETS } from '../data/presets';
import { ActionWorkspace } from './ActionWorkspace';

const preset = REGIONAL_PRESETS[0];

describe('ActionWorkspace component', () => {
  it('renders category headings, personal/community impact explanations, and adoption toggle buttons', async () => {
    const user = userEvent.setup();
    const onToggleAdopt = vi.fn();

    render(
      <ActionWorkspace
        category="routine"
        actions={preset.actions}
        adoptedIds={preset.defaultAdoptedIds}
        onToggleAdopt={onToggleAdopt}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        isLoading={false}
        impactNarrative={preset.impactNarrative}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Low-Emission Daily Routines' })).toBeInTheDocument();
    expect(screen.getAllByText('Direct Personal Impact').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Direct Community Impact').length).toBeGreaterThan(0);

    const adoptBtn = screen.getByRole('button', {
      name: /Adopt 'Replace solo cold-start school car runs with Metro \+ walking bus'/i,
    });
    await user.click(adoptBtn);
    expect(onToggleAdopt).toHaveBeenCalledWith('r-2');

    const removeBtn = screen.getByRole('button', {
      name: /Remove 'Shift outdoor errands and school walks to midday solar mixing' from plan/i,
    });
    expect(removeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('invokes status filter and search callbacks when user filters recommendations', async () => {
    const user = userEvent.setup();
    const onStatusFilterChange = vi.fn();
    const onSearchQueryChange = vi.fn();

    render(
      <ActionWorkspace
        category="indoor"
        actions={preset.actions}
        adoptedIds={preset.defaultAdoptedIds}
        onToggleAdopt={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
        searchQuery=""
        onSearchQueryChange={onSearchQueryChange}
        isLoading={false}
        impactNarrative={preset.impactNarrative}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Adopted' }));
    expect(onStatusFilterChange).toHaveBeenCalledWith('adopted');

    const searchBox = screen.getByRole('searchbox', { name: 'Search recommendations' });
    await user.type(searchBox, 'h');
    expect(onSearchQueryChange).toHaveBeenCalledWith('h');
  });

  it('renders empty filter state and resets both search and status filters', async () => {
    const user = userEvent.setup();
    const onStatusFilterChange = vi.fn();
    const onSearchQueryChange = vi.fn();

    render(
      <ActionWorkspace
        category="community"
        actions={preset.actions}
        adoptedIds={preset.defaultAdoptedIds}
        onToggleAdopt={vi.fn()}
        statusFilter="adopted"
        onStatusFilterChange={onStatusFilterChange}
        searchQuery="zzzz-no-match"
        onSearchQueryChange={onSearchQueryChange}
        isLoading={false}
        impactNarrative={preset.impactNarrative}
      />,
    );

    expect(screen.getByText(/No alternative items match your current filter/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
    expect(onStatusFilterChange).toHaveBeenCalledWith('all');
    expect(onSearchQueryChange).toHaveBeenCalledWith('');
  });

  it('renders accessible loading skeletons when generating a plan', () => {
    render(
      <ActionWorkspace
        category="routine"
        actions={preset.actions}
        adoptedIds={preset.defaultAdoptedIds}
        onToggleAdopt={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        isLoading={true}
        impactNarrative={preset.impactNarrative}
      />,
    );

    expect(screen.getByLabelText('Generating tailored actions')).toHaveAttribute('aria-busy', 'true');
  });
});
