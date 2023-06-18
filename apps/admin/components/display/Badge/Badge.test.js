/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Badge from '.';

it("renders badge", () => {
    render(<Badge />)
    expect(screen.getByRole("presentation")).toBeInTheDocument();
})