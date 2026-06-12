import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock server actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// Mock anon-work-tracker
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
  });

  describe("initial state", () => {
    it("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("returns signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    describe("happy path — anon work exists with messages", () => {
      it("migrates anon work to a new project and navigates to it", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "/": { type: "directory" } },
        };
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockSignIn.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "migrated-project" } as any);

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signIn("user@example.com", "password123");
        });

        expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: anonWork.messages,
            data: anonWork.fileSystemData,
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/migrated-project");
        expect(returnValue).toEqual({ success: true });
      });
    });

    describe("happy path — no anon work, existing projects", () => {
      it("navigates to the most recent project", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockSignIn.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([
          { id: "project-1" } as any,
          { id: "project-2" } as any,
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/project-1");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });

    describe("happy path — no anon work, no existing projects", () => {
      it("creates a new project and navigates to it", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockSignIn.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new-project" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
      });
    });

    describe("failed sign-in", () => {
      it("returns the error result without navigating", async () => {
        mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signIn("user@example.com", "wrongpassword");
        });

        expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });

    describe("loading state", () => {
      it("sets isLoading to true during sign-in and false after", async () => {
        let resolveSignIn!: (v: any) => void;
        mockSignIn.mockReturnValue(
          new Promise((res) => { resolveSignIn = res; })
        );

        const { result } = renderHook(() => useAuth());

        act(() => {
          result.current.signIn("user@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
          resolveSignIn({ success: false, error: "err" });
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    describe("error state — action throws", () => {
      it("resets isLoading to false even when signIn action throws", async () => {
        mockSignIn.mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123").catch(() => {});
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    describe("edge case — anon work present but no messages", () => {
      it("does not migrate anon work and falls through to project lookup", async () => {
        mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
        mockSignIn.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([{ id: "existing-project" } as any]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-project");
      });
    });
  });

  describe("signUp", () => {
    describe("happy path — anon work exists with messages", () => {
      it("migrates anon work and navigates to new project", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "a design" }],
          fileSystemData: { "/": {} },
        };
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockSignUp.mockResolvedValue({ success: true });
        mockCreateProject.mockResolvedValue({ id: "signup-project" } as any);

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signUp("new@example.com", "password123");
        });

        expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: anonWork.messages,
            data: anonWork.fileSystemData,
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/signup-project");
        expect(returnValue).toEqual({ success: true });
      });
    });

    describe("happy path — no anon work, no existing projects", () => {
      it("creates a new blank project and navigates to it", async () => {
        mockSignUp.mockResolvedValue({ success: true });
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "fresh-signup-project" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/fresh-signup-project");
      });
    });

    describe("failed sign-up", () => {
      it("returns the error result without navigating", async () => {
        mockSignUp.mockResolvedValue({
          success: false,
          error: "Email already registered",
        });

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signUp("existing@example.com", "password123");
        });

        expect(returnValue).toEqual({ success: false, error: "Email already registered" });
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    describe("loading state", () => {
      it("sets isLoading to true during sign-up and false after", async () => {
        let resolveSignUp!: (v: any) => void;
        mockSignUp.mockReturnValue(
          new Promise((res) => { resolveSignUp = res; })
        );

        const { result } = renderHook(() => useAuth());

        act(() => {
          result.current.signUp("new@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
          resolveSignUp({ success: false, error: "err" });
        });

        expect(result.current.isLoading).toBe(false);
      });
    });

    describe("error state — action throws", () => {
      it("resets isLoading to false even when signUp action throws", async () => {
        mockSignUp.mockRejectedValue(new Error("Server error"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@example.com", "password123").catch(() => {});
        });

        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
