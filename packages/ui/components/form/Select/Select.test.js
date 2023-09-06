/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import Select from '../Select';

it("renders select", () => {
    render(
        <Select label="Test" name="test">
            <option value="test">test</option>
        </Select>
    )
    
    expect(screen.getByRole("listbox")).toBeInTheDocument();
});
