import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { DateTimePickerMenu } from "./date-time-picker-menu";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

afterEach(cleanup);

const props = {
  label: "Due date",
  placeholder: "Choose date",
  clearLabel: "Clear date",
};

describe("DateTimePickerMenu", () => {
  it("keeps date and confirmation clicks inside a clickable task row", () => {
    const openTask = vi.fn();
    const onChange = vi.fn();
    render(
      <div role="button" tabIndex={0} onClick={openTask} onKeyDown={vi.fn()}>
        <DateTimePickerMenu
          {...props}
          value={new Date(2026, 10, 1, 14, 30)}
          onChange={onChange}
        />
      </div>,
    );
    fireEvent.click(screen.getByRole("option", { name: /tasks:due.today/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "tasks:datePicker.apply" }),
    );
    expect(onChange).toHaveBeenCalledOnce();
    expect(openTask).not.toHaveBeenCalled();
  });

  it("offers only half hours and waits for confirmation before saving", () => {
    const onChange = vi.fn();
    const value = new Date(2026, 10, 1, 14, 30);
    render(<DateTimePickerMenu {...props} value={value} onChange={onChange} />);
    const time = screen.getByRole("combobox", {
      name: "tasks:datePicker.time",
    });
    expect(within(time).getAllByRole("option")).toHaveLength(48);
    expect(time).toHaveValue("14:30");
    fireEvent.change(time, { target: { value: "17:00" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "tasks:datePicker.apply" }),
    );
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 1, 17, 0));
    expect(value.getHours()).toBe(14);
  });

  it("keeps the selected time when picking a new calendar day", () => {
    const onChange = vi.fn();
    render(
      <DateTimePickerMenu
        {...props}
        value={new Date(2026, 10, 1, 14, 30)}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Due date" }), {
      target: { value: "2026-11-03" },
    });
    fireEvent.click(screen.getByRole("option", { name: /Nov 3/ }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "tasks:datePicker.apply" }),
    );
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 3, 14, 30));
  });

  it("requires a date and disallows a time before the start on the same day", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimePickerMenu {...props} value={null} onChange={onChange} />,
    );
    expect(
      screen.getByRole("button", { name: "tasks:datePicker.apply" }),
    ).toBeDisabled();
    rerender(
      <DateTimePickerMenu
        key="existing"
        {...props}
        value={new Date(2026, 10, 1, 14, 30)}
        bounds={{ before: new Date(2026, 10, 1, 15, 0) }}
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole("button", { name: "tasks:datePicker.apply" }),
    ).toBeDisabled();
    fireEvent.change(
      screen.getByRole("combobox", { name: "tasks:datePicker.time" }),
      {
        target: { value: "15:00" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "tasks:datePicker.apply" }),
    );
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 1, 15, 0));
  });

  it("clears an existing deadline without requiring confirmation", () => {
    const onChange = vi.fn();
    render(
      <DateTimePickerMenu
        {...props}
        value={new Date(2026, 10, 1, 14, 30)}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("option", { name: /Clear date/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
