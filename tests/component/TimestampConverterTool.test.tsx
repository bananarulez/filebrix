import { describe, expect, it } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { TimestampConverterTool } from "@/components/dev-tools/TimestampConverterTool";

describe("TimestampConverterTool", () => {
  it("shows a live current time once mounted (never a baked-in server value)", async () => {
    render(<TimestampConverterTool />);
    await waitFor(() => expect(screen.getByText("Unix seconds").nextElementSibling).toHaveTextContent(/^\d+$/));
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("converts a unix timestamp (seconds) to a date", async () => {
    render(<TimestampConverterTool />);
    fireEvent.change(screen.getByLabelText(/unix timestamp → date/i), { target: { value: "1700000000" } });
    await waitFor(() => expect(screen.getByText("2023-11-14T22:13:20.000Z")).toBeInTheDocument());
  });

  it("converts a unix timestamp (milliseconds) to the same date", async () => {
    render(<TimestampConverterTool />);
    fireEvent.change(screen.getByLabelText(/unix timestamp → date/i), { target: { value: "1700000000000" } });
    await waitFor(() => expect(screen.getByText("2023-11-14T22:13:20.000Z")).toBeInTheDocument());
  });

  it("shows an inline error for invalid timestamp input, without crashing", async () => {
    render(<TimestampConverterTool />);
    fireEvent.change(screen.getByLabelText(/unix timestamp → date/i), { target: { value: "not-a-number" } });
    await waitFor(() => expect(screen.getByText(/enter a whole number/i)).toBeInTheDocument());
  });

  it("converts a date to a unix timestamp", async () => {
    // <input type="datetime-local"> values have no timezone offset, so
    // `new Date(...)` (used internally) parses them as local time — the
    // expected unix value must be derived the same way rather than
    // hardcoded, or this test would be timezone-dependent.
    const expectedSeconds = Math.floor(new Date(2023, 10, 14, 22, 13, 20).getTime() / 1000);
    render(<TimestampConverterTool />);
    fireEvent.change(screen.getByLabelText(/date → unix timestamp/i), {
      target: { value: "2023-11-14T22:13:20" },
    });
    await waitFor(() => expect(screen.getByText(String(expectedSeconds))).toBeInTheDocument());
  });
});
