import { createIncident, submitReport } from "./incidentService";
import api from "./api";

jest.mock("./api", () => ({
  post: jest.fn(),
}));

describe("incidentService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should send a JSON payload when no file is attached", async () => {
    const mockData = {
      reportType: "Theft",
      title: "Stolen laptop",
      description: "Laptop taken from cafeteria",
      location: "Cafeteria",
      priority: "High",
    };

    const mockResponse = {
      data: {
        success: true,
        data: { id: 1, report_id: "RPT-20260827-0001", ...mockData },
      },
    };

    api.post.mockResolvedValueOnce(mockResponse);

    const result = await createIncident(mockData);

    expect(api.post).toHaveBeenCalledWith("/incidents", mockData, {
      headers: {},
    });
    expect(result).toEqual(mockResponse.data);
  });

  it("should send multipart/form-data when evidence File is attached", async () => {
    const fakeFile = new File(["dummy content"], "evidence.png", {
      type: "image/png",
    });
    const mockData = {
      reportType: "Harassment",
      title: "Verbal harassment",
      description: "Incident near hall",
      location: "Al-Beruni Hall",
      priority: "Medium",
      evidence: fakeFile,
    };

    const mockResponse = {
      data: {
        success: true,
        data: { id: 2, report_id: "RPT-20260827-0002" },
      },
    };

    api.post.mockResolvedValueOnce(mockResponse);

    const result = await createIncident(mockData);

    expect(api.post).toHaveBeenCalledWith(
      "/incidents",
      expect.any(FormData),
      expect.objectContaining({
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
    expect(result).toEqual(mockResponse.data);
  });

  it("should pass through existing FormData instance as payload", async () => {
    const formData = new FormData();
    formData.append("title", "Test title");

    const mockResponse = {
      data: { success: true },
    };

    api.post.mockResolvedValueOnce(mockResponse);

    const result = await submitReport(formData);

    expect(api.post).toHaveBeenCalledWith("/incidents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    expect(result).toEqual(mockResponse.data);
  });
});
