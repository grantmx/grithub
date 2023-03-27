/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Divider from '.';

it("renders divider", () => {
    render(<Divider />)
    expect(screen.getByRole("separator")).toBeInTheDocument();
})