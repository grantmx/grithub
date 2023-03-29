/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Checkbox from '../Checkbox';


it("renders checkbox", () => {
    render(
        <Checkbox name="test" label="Test" />
    )
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
})