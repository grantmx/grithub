/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Loader from '.';

it("renders loader image", () => {
    render(<Loader isLoading />)
    
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
})