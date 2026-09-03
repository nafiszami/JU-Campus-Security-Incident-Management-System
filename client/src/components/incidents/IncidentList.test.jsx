import React, { act } from "react";
import { createRoot } from "react-dom/client";
import IncidentList from "./IncidentList";
import * as incidentService from "../../services/incidentService";

jest.mock("../../services/incidentService");

global.IS_REACT_ACT_ENVIRONMENT = true;

const setNativeValue = (element, value) => {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor.set.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("IncidentList Component", () => {
  let container;
  let root;

  const mockIncidents = [
    {
      id: 1,
      report_id: "RPT-20260901-0001",
      report_type: "Theft",
      title: "Stolen Bicycle",
      priority: "High",
      status: "Submitted",
      location: "Dorm A",
      created_at: "2026-09-01T10:00:00.000Z",
    },
    {
      id: 2,
      report_id: "RPT-20260901-0002",
      report_type: "Harassment",
      title: "Gate Incident",
      priority: "Medium",
      status: "Assigned",
      location: "Main Gate",
      created_at: "2026-09-01T11:00:00.000Z",
    },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    jest.clearAllMocks();
  });

  it("renders filter controls, headers, and calls getIncidents on mount", async () => {
    incidentService.getIncidents.mockResolvedValueOnce({
      success: true,
      data: mockIncidents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    await act(async () => {
      root.render(<IncidentList />);
    });

    expect(container.querySelector("#filter-status")).not.toBeNull();
    expect(container.querySelector("#filter-priority")).not.toBeNull();
    expect(container.querySelector("#filter-report-type")).not.toBeNull();
    expect(container.querySelector("#filter-date-from")).not.toBeNull();
    expect(container.querySelector("#filter-date-to")).not.toBeNull();
    expect(container.querySelector(".btn-apply-filters")).not.toBeNull();
    expect(container.querySelector(".btn-reset-filters")).not.toBeNull();

    expect(incidentService.getIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 })
    );

    const rows = container.querySelectorAll(".incident-table tbody tr");
    expect(rows.length).toBe(2);
    expect(container.textContent).toContain("RPT-20260901-0001");
    expect(container.textContent).toContain("Stolen Bicycle");
  });

  it("displays loading state while reports are being fetched", async () => {
    let resolvePromise;
    incidentService.getIncidents.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    act(() => {
      root.render(<IncidentList />);
    });

    expect(container.querySelector(".loading-state")).not.toBeNull();
    expect(container.textContent).toContain("Loading incident reports");

    await act(async () => {
      resolvePromise({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 20 },
      });
    });

    expect(container.querySelector(".loading-state")).toBeNull();
  });

  it("displays empty state when no reports are returned", async () => {
    incidentService.getIncidents.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20 },
    });

    await act(async () => {
      root.render(<IncidentList />);
    });

    expect(container.querySelector(".empty-state")).not.toBeNull();
    expect(container.textContent).toContain("No incident reports found");
  });

  it("displays error alert when fetch fails and allows retry", async () => {
    incidentService.getIncidents.mockRejectedValueOnce(
      new Error("Network Error")
    );

    await act(async () => {
      root.render(<IncidentList />);
    });

    expect(container.querySelector(".alert-error")).not.toBeNull();
    expect(container.textContent).toContain("Network Error");

    incidentService.getIncidents.mockResolvedValueOnce({
      success: true,
      data: mockIncidents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    const retryBtn = container.querySelector(".btn-retry");
    expect(retryBtn).not.toBeNull();

    await act(async () => {
      retryBtn.click();
    });

    expect(container.querySelector(".alert-error")).toBeNull();
    expect(container.querySelectorAll(".incident-table tbody tr").length).toBe(
      2
    );
  });

  it("applies filters when form is submitted or Apply button is clicked", async () => {
    incidentService.getIncidents.mockResolvedValue({
      success: true,
      data: [mockIncidents[0]],
      pagination: { total: 1, page: 1, limit: 20 },
    });

    await act(async () => {
      root.render(<IncidentList />);
    });

    const statusSelect = container.querySelector("#filter-status");
    const prioritySelect = container.querySelector("#filter-priority");
    const typeSelect = container.querySelector("#filter-report-type");
    const dateFromInput = container.querySelector("#filter-date-from");
    const dateToInput = container.querySelector("#filter-date-to");
    const applyBtn = container.querySelector(".btn-apply-filters");

    act(() => {
      setNativeValue(statusSelect, "Submitted");
      setNativeValue(prioritySelect, "High");
      setNativeValue(typeSelect, "Theft");
      setNativeValue(dateFromInput, "2026-09-01");
      setNativeValue(dateToInput, "2026-09-02");
    });

    await act(async () => {
      applyBtn.click();
    });

    expect(incidentService.getIncidents).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Submitted",
        priority: "High",
        report_type: "Theft",
        date_from: "2026-09-01",
        date_to: "2026-09-02",
        page: 1,
      })
    );
  });

  it("resets filters when Reset button is clicked", async () => {
    incidentService.getIncidents.mockResolvedValue({
      success: true,
      data: mockIncidents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    await act(async () => {
      root.render(<IncidentList />);
    });

    const statusSelect = container.querySelector("#filter-status");
    act(() => {
      setNativeValue(statusSelect, "Assigned");
    });

    const resetBtn = container.querySelector(".btn-reset-filters");
    await act(async () => {
      resetBtn.click();
    });

    expect(statusSelect.value).toBe("");
    expect(incidentService.getIncidents).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        status: "Assigned",
      })
    );
    expect(incidentService.getIncidents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      })
    );
  });

  it("triggers onView callback when View button is clicked", async () => {
    incidentService.getIncidents.mockResolvedValueOnce({
      success: true,
      data: mockIncidents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    const onViewMock = jest.fn();

    await act(async () => {
      root.render(<IncidentList onView={onViewMock} />);
    });

    const viewButtons = container.querySelectorAll(".btn-view-report");
    expect(viewButtons.length).toBe(2);

    act(() => {
      viewButtons[0].click();
    });

    expect(onViewMock).toHaveBeenCalledWith(mockIncidents[0]);
  });

  describe("Role-aware Export CSV", () => {
    it("does not render Export CSV button for Student user", async () => {
      incidentService.getIncidents.mockResolvedValueOnce({
        success: true,
        data: mockIncidents,
        pagination: { total: 2, page: 1, limit: 20 },
      });

      const studentUser = { id: 1, role: "Student" };

      await act(async () => {
        root.render(<IncidentList currentUser={studentUser} />);
      });

      expect(container.querySelector(".btn-export-csv")).toBeNull();
    });

    it("renders Export CSV button for Security Officer and triggers export", async () => {
      incidentService.getIncidents.mockResolvedValueOnce({
        success: true,
        data: mockIncidents,
        pagination: { total: 2, page: 1, limit: 20 },
      });

      const officerUser = { id: 2, role: "Security Officer" };
      const fakeBlob = new Blob(["Report ID,Title"], { type: "text/csv" });
      incidentService.exportIncidents.mockResolvedValueOnce(fakeBlob);

      // Mock URL.createObjectURL and link click to prevent JSDOM navigation warning
      global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/dummy");
      global.URL.revokeObjectURL = jest.fn();
      const clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});

      await act(async () => {
        root.render(<IncidentList currentUser={officerUser} />);
      });

      const exportBtn = container.querySelector(".btn-export-csv");
      expect(exportBtn).not.toBeNull();

      await act(async () => {
        exportBtn.click();
      });

      expect(incidentService.exportIncidents).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it("renders Export CSV button for Admin user", async () => {
      incidentService.getIncidents.mockResolvedValueOnce({
        success: true,
        data: mockIncidents,
        pagination: { total: 2, page: 1, limit: 20 },
      });

      const adminUser = { id: 3, role: "Admin" };

      await act(async () => {
        root.render(<IncidentList currentUser={adminUser} />);
      });

      expect(container.querySelector(".btn-export-csv")).not.toBeNull();
    });
  });

  describe("Pagination & Sorting", () => {
    it("handles page navigation buttons", async () => {
      incidentService.getIncidents.mockResolvedValueOnce({
        success: true,
        data: mockIncidents,
        pagination: { total: 40, page: 1, limit: 20 },
      });

      await act(async () => {
        root.render(<IncidentList />);
      });

      const nextBtn = container.querySelector(".btn-page-next");
      expect(nextBtn).not.toBeNull();
      expect(nextBtn.disabled).toBe(false);

      incidentService.getIncidents.mockResolvedValueOnce({
        success: true,
        data: mockIncidents,
        pagination: { total: 40, page: 2, limit: 20 },
      });

      await act(async () => {
        nextBtn.click();
      });

      expect(incidentService.getIncidents).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    it("changes sorting criteria and re-fetches", async () => {
      incidentService.getIncidents.mockResolvedValue({
        success: true,
        data: mockIncidents,
        pagination: { total: 2, page: 1, limit: 20 },
      });

      await act(async () => {
        root.render(<IncidentList />);
      });

      const sortSelect = container.querySelector("#sort-by");
      const orderSelect = container.querySelector("#sort-order");

      act(() => {
        setNativeValue(sortSelect, "priority");
        setNativeValue(orderSelect, "asc");
      });

      const applyBtn = container.querySelector(".btn-apply-filters");
      await act(async () => {
        applyBtn.click();
      });

      expect(incidentService.getIncidents).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_by: "priority",
          sort_order: "asc",
        })
      );
    });
  });
});
