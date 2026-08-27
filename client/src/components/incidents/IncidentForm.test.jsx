import React, { act } from "react";
import { createRoot } from "react-dom/client";
import IncidentForm from "./IncidentForm";
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

describe("IncidentForm Component", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    jest.clearAllMocks();
  });

  it("renders all form fields, labels, and submit button", () => {
    act(() => {
      root.render(<IncidentForm />);
    });

    expect(container.querySelector("#reportType")).not.toBeNull();
    expect(container.querySelector("#priority")).not.toBeNull();
    expect(container.querySelector("#title")).not.toBeNull();
    expect(container.querySelector("#location")).not.toBeNull();
    expect(container.querySelector("#description")).not.toBeNull();
    expect(container.querySelector("#evidence")).not.toBeNull();
    expect(container.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it("displays client-side validation errors when submitted empty", async () => {
    act(() => {
      root.render(<IncidentForm />);
    });

    const form = container.querySelector("form");

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });

    const errorElements = container.querySelectorAll(".error-text");
    expect(errorElements.length).toBeGreaterThan(0);
    expect(incidentService.submitReport).not.toHaveBeenCalled();
  });

  it("submits form successfully and displays success summary card", async () => {
    const mockReport = {
      id: 101,
      report_id: "RPT-20260827-0101",
      report_type: "Theft",
      title: "Stolen Bicycle",
      priority: "High",
      status: "Submitted",
    };

    incidentService.submitReport.mockResolvedValueOnce({
      success: true,
      data: mockReport,
    });

    const onSuccessMock = jest.fn();

    act(() => {
      root.render(<IncidentForm onSuccess={onSuccessMock} />);
    });

    const reportTypeSelect = container.querySelector("#reportType");
    const prioritySelect = container.querySelector("#priority");
    const titleInput = container.querySelector("#title");
    const locationInput = container.querySelector("#location");
    const descTextarea = container.querySelector("#description");
    const form = container.querySelector("form");

    act(() => {
      setNativeValue(reportTypeSelect, "Theft");
      setNativeValue(prioritySelect, "High");
      setNativeValue(titleInput, "Stolen Bicycle");
      setNativeValue(locationInput, "Dormitory B");
      setNativeValue(
        descTextarea,
        "My bicycle was taken from the parking area near Dorm B."
      );
    });

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });

    expect(incidentService.submitReport).toHaveBeenCalled();
    expect(onSuccessMock).toHaveBeenCalledWith(mockReport);
    expect(container.textContent).toContain(
      "Incident Report Submitted Successfully"
    );
    expect(container.textContent).toContain("RPT-20260827-0101");
  });

  it("displays error banner when submitReport fails", async () => {
    incidentService.submitReport.mockRejectedValueOnce({
      response: { data: { error: "Database connection failed" } },
    });

    act(() => {
      root.render(<IncidentForm />);
    });

    const reportTypeSelect = container.querySelector("#reportType");
    const prioritySelect = container.querySelector("#priority");
    const titleInput = container.querySelector("#title");
    const locationInput = container.querySelector("#location");
    const descTextarea = container.querySelector("#description");
    const form = container.querySelector("form");

    act(() => {
      setNativeValue(reportTypeSelect, "Theft");
      setNativeValue(prioritySelect, "High");
      setNativeValue(titleInput, "Stolen Bicycle");
      setNativeValue(locationInput, "Dormitory B");
      setNativeValue(
        descTextarea,
        "My bicycle was taken from the parking area near Dorm B."
      );
    });

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });

    expect(container.querySelector(".alert-error")).not.toBeNull();
    expect(container.textContent).toContain("Database connection failed");
  });
});
