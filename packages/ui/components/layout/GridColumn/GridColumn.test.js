/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import GridColumn from '../GridColumn';

it("renders grid column", () => {
    render(<GridColumn />)
    expect(screen.getByRole("row")).toBeInTheDocument();
})
