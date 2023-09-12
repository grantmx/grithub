/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import Modal from '../Modal';

const willCloseFn = jest.fn()

it("renders modal", () => {
    render(
        <Modal 
            shouldOpen 
            willClose={willCloseFn} 
        />
    )

    // expect(screen.getByRole("dialog")).toBeInTheDocument();
})