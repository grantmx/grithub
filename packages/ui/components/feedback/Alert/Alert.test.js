/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Alert from '.';

it("renders alerts", () => {
    render(<Alert />)
    // expect(screen.getByRole("alert")).toBeInTheDocument();
})