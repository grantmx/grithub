/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import PhoneInput from '../PhoneInput';

it("renders phone input", () => {
    render(<PhoneInput label="Test" />)
    expect(screen.getByRole("textbox")).toBeInTheDocument();
})