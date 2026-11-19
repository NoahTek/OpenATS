import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobFilters } from "@/app/(dashboard)/jobs/_components/job-filters";
import type { Client, Department } from "@/types";

vi.mock("@/hooks/use-role", () => ({
  useIsManager: () => true,
}));

const mockClients: Client[] = [
  {
    id: 1,
    name: "Acme Corp",
    slug: "acme-corp",
    email: null,
    website: null,
    phone: null,
    address: null,
    description: null,
    logoUrl: null,
    timeZone: "UTC",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: 2,
    name: "Globex",
    slug: "globex",
    email: null,
    website: null,
    phone: null,
    address: null,
    description: null,
    logoUrl: null,
    timeZone: "UTC",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const mockDepartments: Department[] = [
  { id: 10, name: "Engineering", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  { id: 20, name: "Product", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
];

const clientNameById = new Map<number, string>([
  [1, "Acme Corp"],
  [2, "Globex"],
]);

const departmentNameById = new Map<number, string>([
  [10, "Engineering"],
  [20, "Product"],
]);

describe("JobFilters", () => {
  it("renders client, department, type, and status filter triggers and clear button", () => {
    const onClientChange = vi.fn();
    const onDeptChange = vi.fn();
    const onTypeChange = vi.fn();
    const onStatusChange = vi.fn();
    const onClear = vi.fn();

    render(
      <JobFilters
        searchTerm=""
        onSearchChange={vi.fn()}
        filterClient="all"
        onClientChange={onClientChange}
        filterDept="all"
        onDeptChange={onDeptChange}
        filterType="all"
        onTypeChange={onTypeChange}
        filterStatus="all"
        onStatusChange={onStatusChange}
        clients={mockClients}
        clientNameById={clientNameById}
        departments={mockDepartments}
        departmentNameById={departmentNameById}
        onClear={onClear}
      />
    );

    expect(screen.getByText("All Clients")).toBeInTheDocument();
    expect(screen.getByText("All Departments")).toBeInTheDocument();
    expect(screen.getByText("All Types")).toBeInTheDocument();
    expect(screen.getByText("All Status")).toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: "Clear All" });
    fireEvent.click(clearButton);
    expect(onClear).toHaveBeenCalled();
  });

  it("displays the selected client name when a client is filtered", () => {
    render(
      <JobFilters
        searchTerm=""
        onSearchChange={vi.fn()}
        filterClient="1"
        onClientChange={vi.fn()}
        filterDept="all"
        onDeptChange={vi.fn()}
        filterType="all"
        onTypeChange={vi.fn()}
        filterStatus="all"
        onStatusChange={vi.fn()}
        clients={mockClients}
        clientNameById={clientNameById}
        departments={mockDepartments}
        departmentNameById={departmentNameById}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
