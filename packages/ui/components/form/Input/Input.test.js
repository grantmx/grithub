/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Input from '.';

it("renders input", () => {
    render(<Input label="Test" />)
    expect(screen.getByRole("textbox")).toBeInTheDocument();
})