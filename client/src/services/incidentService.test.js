import {
  createIncident,
  submitReport,
  getIncidents,
  getIncidentById,
  getIncidentTimeline,
  exportIncidents,
} from "./incidentService";
import api from "./api";

jest.mock("./api", () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

describe("incidentService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createIncident & submitReport (Sprint 1)", () => {
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

  describe("getIncidents (Sprint 2)", () => {
    it("should call api.get with /incidents and provided query parameters", async () => {
      const queryParams = {
        status: "Submitted",
        priority: "High",
        report_type: "Theft",
        date_from: "2026-09-01",
        date_to: "2026-09-02",
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        data: {
          success: true,
          data: [{ id: 1, report_id: "RPT-20260901-0001", title: "Theft" }],
          pagination: { total: 1, page: 1, limit: 10 },
        },
      };

      api.get.mockResolvedValueOnce(mockResponse);

      const result = await getIncidents(queryParams);

      expect(api.get).toHaveBeenCalledWith("/incidents", {
        params: queryParams,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should call api.get with empty params if none provided", async () => {
      const mockResponse = {
        data: { success: true, data: [], pagination: { total: 0 } },
      };
      api.get.mockResolvedValueOnce(mockResponse);

      const result = await getIncidents();

      expect(api.get).toHaveBeenCalledWith("/incidents", { params: {} });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getIncidentById (Sprint 2)", () => {
    it("should call api.get with /incidents/:id", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 10, report_id: "RPT-20260901-0010" },
        },
      };
      api.get.mockResolvedValueOnce(mockResponse);

      const result = await getIncidentById(10);

      expect(api.get).toHaveBeenCalledWith("/incidents/10");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getIncidentTimeline (Sprint 2)", () => {
    it("should call api.get with /incidents/:id/timeline", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [{ id: 1, new_status: "Submitted" }],
        },
      };
      api.get.mockResolvedValueOnce(mockResponse);

      const result = await getIncidentTimeline(10);

      expect(api.get).toHaveBeenCalledWith("/incidents/10/timeline");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("exportIncidents (Sprint 2)", () => {
    it("should call api.get with /incidents/export and responseType blob", async () => {
      const filters = { status: "Resolved" };
      const mockBlob = new Blob(["Report ID,Title\nRPT-1,Theft"], {
        type: "text/csv",
      });
      const mockResponse = { data: mockBlob };

      api.get.mockResolvedValueOnce(mockResponse);

      const result = await exportIncidents(filters);

      expect(api.get).toHaveBeenCalledWith("/incidents/export", {
        params: filters,
        responseType: "blob",
      });
      expect(result).toEqual(mockBlob);
    });
  });
});
