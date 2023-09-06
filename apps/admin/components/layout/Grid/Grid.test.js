/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Grid from '.';

it("renders breadcrumb", () => {
    render(<Grid role="grid" />)
    expect(screen.getByRole("grid")).toBeInTheDocument();
})
