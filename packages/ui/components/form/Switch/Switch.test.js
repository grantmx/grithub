/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Switch from '../Switch';

const switchFn = jest.fn()


it("renders switch", () => {
    render(<Switch onChange={switchFn} />)
    expect(screen.getByRole("switch")).toBeInTheDocument();
})