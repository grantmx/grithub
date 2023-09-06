/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Button from '.';

it("renders button", () => {
    render(<Button />)
    expect(screen.getByRole("button")).toBeInTheDocument();
})