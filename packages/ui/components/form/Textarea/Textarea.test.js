/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Textarea from '../Textarea';

it("renders textarea", () => {
    render(<Textarea name="test" label="Test" />)
    expect(screen.getByRole("textbox")).toBeInTheDocument();
})