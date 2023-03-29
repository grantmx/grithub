/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Radio from '../Radio';

it("renders radio", () => {
    render(<Radio name="test" label="test" />)
    expect(screen.getByRole("radio")).toBeInTheDocument();
})