import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhoneInput from './PhoneInput';

describe('PhoneInput', () => {
    it('renders country code dropdown and number input', () => {
        render(<PhoneInput value="+1" onChange={() => { }} />);
        expect(screen.getByRole('combobox', { name: /country code/i })).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: /phone number/i })).toBeInTheDocument();
    });

    it('shows all required country codes in the dropdown', () => {
        render(<PhoneInput value="+1" onChange={() => { }} />);
        const select = screen.getByRole('combobox', { name: /country code/i });
        const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
        expect(options).toContain('+1');
        expect(options).toContain('+44');
        expect(options).toContain('+91');
        expect(options).toContain('+92');
        expect(options).toContain('+971');
        expect(options).toContain('+61');
        expect(options).toContain('+49');
        expect(options).toContain('+33');
    });

    it('strips non-digit characters from number input', () => {
        const onChange = vi.fn();
        render(<PhoneInput value="+1" onChange={onChange} />);
        const input = screen.getByRole('textbox', { name: /phone number/i });
        fireEvent.change(input, { target: { value: '415-555-2671' } });
        expect((input as HTMLInputElement).value).toBe('4155552671');
    });

    it('emits E.164 string via onChange when digits are 7–15 chars', () => {
        const onChange = vi.fn();
        render(<PhoneInput value="+1" onChange={onChange} />);
        const input = screen.getByRole('textbox', { name: /phone number/i });
        fireEvent.change(input, { target: { value: '4155552671' } });
        expect(onChange).toHaveBeenCalledWith('+14155552671');
    });

    it('does not emit onChange when digits are fewer than 7', () => {
        const onChange = vi.fn();
        render(<PhoneInput value="+1" onChange={onChange} />);
        const input = screen.getByRole('textbox', { name: /phone number/i });
        fireEvent.change(input, { target: { value: '123' } });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not emit onChange when digits exceed 15', () => {
        const onChange = vi.fn();
        render(<PhoneInput value="+1" onChange={onChange} />);
        const input = screen.getByRole('textbox', { name: /phone number/i });
        fireEvent.change(input, { target: { value: '1234567890123456' } }); // 16 digits
        expect(onChange).not.toHaveBeenCalled();
    });

    it('emits correct E.164 when country code changes', () => {
        const onChange = vi.fn();
        render(<PhoneInput value="+14155552671" onChange={onChange} />);
        const select = screen.getByRole('combobox', { name: /country code/i });
        fireEvent.change(select, { target: { value: '+44' } });
        expect(onChange).toHaveBeenCalledWith('+444155552671');
    });

    it('displays inline error when error prop is provided', () => {
        render(<PhoneInput value="+1" onChange={() => { }} error="Invalid phone number" />);
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid phone number');
    });

    it('does not display error element when error prop is absent', () => {
        render(<PhoneInput value="+1" onChange={() => { }} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('parses initial E.164 value into country code and digits', () => {
        render(<PhoneInput value="+914155552671" onChange={() => { }} />);
        const select = screen.getByRole('combobox', { name: /country code/i }) as HTMLSelectElement;
        const input = screen.getByRole('textbox', { name: /phone number/i }) as HTMLInputElement;
        expect(select.value).toBe('+91');
        expect(input.value).toBe('4155552671');
    });
});
