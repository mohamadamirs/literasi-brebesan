import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import AgendaStatusManager from "./AgendaStatusManager";

const statusValues = () =>
  (screen.getAllByRole("radio") as HTMLInputElement[]).map((r) => r.value);

describe("AgendaStatusManager", () => {
  it("menampilkan opsi archived agar radio selalu tercentang", () => {
    render(<AgendaStatusManager initialStatus="archived" initialPublishAt={null} />);

    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    const checked = radios.filter((r) => r.checked);

    expect(statusValues()).toContain("archived");
    expect(checked).toHaveLength(1);
    expect(checked[0].value).toBe("archived");
  });

  it.each(["draft", "scheduled", "published", "archived"] as const)(
    "status %s menghasilkan tepat satu radio tercentang",
    (status) => {
      render(<AgendaStatusManager initialStatus={status} initialPublishAt={null} />);

      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      const checked = radios.filter((r) => r.checked);

      expect(checked).toHaveLength(1);
      expect(checked[0].value).toBe(status);
    }
  );
});
