import React, { act } from "react";
import { createRoot } from "react-dom/client";
import IncidentDetail from "./IncidentDetail";
import * as incidentService from "../../services/incidentService";

jest.mock("../../services/incidentService");

global.IS_REACT_ACT_ENVIRONMENT = true;

describe("IncidentDetail Component", () => {
  let container;
  let root;

  const mockIncident = {
    id: 101,
    report_id: "RPT-20260901-0101",
    report_type: "Theft",
    title: "Stolen Bicycle at Dorm Rack",
    description:
      "A black mountain bicycle was taken from the rack outside Dorm A.",
    location: "Dorm A Rack",
    priority: "High",
    status: "Under Investigation",
    reported_by: 10,
    reporter_name: "Rafiqul Islam",
    reporter_email: "rafiq@juniv.edu",
    assigned_to: 20,
    assigned_officer_name: "Officer Kamal",
    assigned_officer_email: "kamal@juniv.edu",
    evidence_url: "/uploads/evidence-101.jpg",
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-01T12:00:00.000Z",
    resolved_at: null,
    investigation_notes: "Checked CCTV footage near Dorm A gate.",
  };

  const mockTimeline = [
    {
      id: 1,
      incident_id: 101,
      old_status: null,
      new_status: "Submitted",
      changed_by: 10,
      changed_by_name: "Rafiqul Islam",
      changed_by_role: "Student",
      changed_at: "2026-09-01T10:00:00.000Z",
      notes: "Incident reported by student",
    },
    {
      id: 2,
      incident_id: 101,
      old_status: "Submitted",
      new_status: "Under Investigation",
      changed_by: 20,
      changed_by_name: "Officer Kamal",
      changed_by_role: "Security Officer",
      changed_at: "2026-09-01T12:00:00.000Z",
      notes: "Investigation initiated",
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

  it("displays loading state initially while fetching incident details", async () => {
    let resolveDetail;
    incidentService.getIncidentById.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDetail = resolve;
      })
    );
    incidentService.getIncidentTimeline.mockReturnValueOnce(
      new Promise(() => {})
    );

    act(() => {
      root.render(<IncidentDetail incidentId={101} />);
    });

    expect(container.querySelector(".loading-state")).not.toBeNull();
    expect(container.textContent).toContain("Loading incident details");

    await act(async () => {
      resolveDetail({ success: true, data: mockIncident });
    });
  });

  it("successfully loads and renders full report information and timeline", async () => {
    incidentService.getIncidentById.mockResolvedValueOnce({
      success: true,
      data: mockIncident,
    });
    incidentService.getIncidentTimeline.mockResolvedValueOnce({
      success: true,
      data: mockTimeline,
    });

    await act(async () => {
      root.render(<IncidentDetail incidentId={101} />);
    });

    expect(incidentService.getIncidentById).toHaveBeenCalledWith(101);
    expect(incidentService.getIncidentTimeline).toHaveBeenCalledWith(101);

    // Report Header & ID
    expect(container.textContent).toContain("RPT-20260901-0101");
    expect(container.textContent).toContain("Stolen Bicycle at Dorm Rack");

    // Key metadata
    expect(container.textContent).toContain("Theft");
    expect(container.textContent).toContain("High");
    expect(container.textContent).toContain("Under Investigation");
    expect(container.textContent).toContain("Dorm A Rack");
    expect(container.textContent).toContain("Rafiqul Islam");
    expect(container.textContent).toContain("Officer Kamal");

    // Description & Notes
    expect(container.textContent).toContain(
      "A black mountain bicycle was taken from the rack outside Dorm A."
    );
    expect(container.textContent).toContain(
      "Checked CCTV footage near Dorm A gate."
    );

    // Evidence link
    const evidenceLink = container.querySelector(".evidence-link");
    expect(evidenceLink).not.toBeNull();
    expect(evidenceLink.getAttribute("href")).toBe("/uploads/evidence-101.jpg");

    // Timeline items
    const timelineItems = container.querySelectorAll(".timeline-item");
    expect(timelineItems.length).toBe(2);
    expect(container.textContent).toContain("Submitted");
    expect(container.textContent).toContain("Incident reported by student");
    expect(container.textContent).toContain("Investigation initiated");
  });

  it("renders empty timeline state when no status history is returned", async () => {
    incidentService.getIncidentById.mockResolvedValueOnce({
      success: true,
      data: mockIncident,
    });
    incidentService.getIncidentTimeline.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    await act(async () => {
      root.render(<IncidentDetail incidentId={101} />);
    });

    expect(container.querySelector(".timeline-empty")).not.toBeNull();
    expect(container.textContent).toContain("No status history available");
  });

  it("handles missing evidence gracefully when evidence_url is not present", async () => {
    const noEvidenceIncident = {
      ...mockIncident,
      evidence_url: null,
    };

    incidentService.getIncidentById.mockResolvedValueOnce({
      success: true,
      data: noEvidenceIncident,
    });
    incidentService.getIncidentTimeline.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    await act(async () => {
      root.render(<IncidentDetail incidentId={101} />);
    });

    expect(container.querySelector(".evidence-link")).toBeNull();
    expect(container.textContent).toContain("No evidence attached");
  });

  it("renders resolved date when available and handles unassigned officer", async () => {
    const resolvedIncident = {
      ...mockIncident,
      status: "Resolved",
      assigned_to: null,
      assigned_officer_name: null,
      resolved_at: "2026-09-02T15:30:00.000Z",
    };

    incidentService.getIncidentById.mockResolvedValueOnce({
      success: true,
      data: resolvedIncident,
    });
    incidentService.getIncidentTimeline.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    await act(async () => {
      root.render(<IncidentDetail incidentId={101} />);
    });

    expect(container.textContent).toContain("Resolved");
    expect(container.textContent).toContain("Unassigned");
    expect(container.querySelector(".detail-resolved-date")).not.toBeNull();
  });

  it("displays error state when incident fetch fails", async () => {
    const errorResponse = {
      response: {
        status: 404,
        data: { error: "Incident report not found" },
      },
    };
    incidentService.getIncidentById.mockRejectedValueOnce(errorResponse);
    incidentService.getIncidentTimeline.mockResolvedValueOnce({
      success: true,
      data: [],
    });

    await act(async () => {
      root.render(<IncidentDetail incidentId={999} />);
    });

    expect(container.querySelector(".alert-error")).not.toBeNull();
    expect(container.textContent).toContain("Incident report not found");
  });

  it("calls onBack callback when the back button is clicked", async () => {
    incidentService.getIncidentById.mockResolvedValueOnce({
      success: true,
      data: mockIncident,
    });
    incidentService.getIncidentTimeline.mockResolvedValueOnce({
      success: true,
      data: mockTimeline,
    });

    const onBackMock = jest.fn();

    await act(async () => {
      root.render(<IncidentDetail incidentId={101} onBack={onBackMock} />);
    });

    const backButton = container.querySelector(".btn-back");
    expect(backButton).not.toBeNull();

    await act(async () => {
      backButton.click();
    });

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});
