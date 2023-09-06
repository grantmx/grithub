/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Skeleton from '.';

it("renders skeleton preloader", () => {
    render(<Skeleton />)
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
})