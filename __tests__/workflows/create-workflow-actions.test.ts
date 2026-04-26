import { beforeEach, describe, expect, it, vi } from "vitest"
import { createWorkflow } from "@/app/dashboard/workflows/new/actions"

const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args)
    throw new Error("NEXT_REDIRECT")
  },
}))

const mockGetUser = vi.fn()
const mockWorkflowInsert = vi.fn()
const mockTriggerInsert = vi.fn()
const mockWorkflowDeleteEq = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => {
      if (table === "workflows") {
        return {
          insert: (data: unknown) => {
            mockWorkflowInsert(data)
            return {
              select: () => ({
                single: () =>
                  Promise.resolve(
                    mockWorkflowInsert._result ?? {
                      data: { id: "workflow-123" },
                      error: null,
                    },
                  ),
              }),
            }
          },
          delete: () => ({
            eq: (...args: unknown[]) => {
              mockWorkflowDeleteEq(...args)
              return Promise.resolve({ error: null })
            },
          }),
        }
      }

      if (table === "triggers") {
        return {
          insert: (data: unknown) => {
            mockTriggerInsert(data)
            return {
              select: () => ({
                single: () =>
                  Promise.resolve(
                    mockTriggerInsert._result ?? {
                      data: { id: "trigger-123" },
                      error: null,
                    },
                  ),
              }),
            }
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }),
}))

const validInput = {
  name: "",
  description: "Premier League transfer rumors",
  frequency: "30m",
  handles: ["FabrizioRomano"],
}

describe("createWorkflow action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    })
    mockWorkflowInsert._result = {
      data: { id: "workflow-123" },
      error: null,
    }
    mockTriggerInsert._result = {
      data: { id: "trigger-123" },
      error: null,
    }
  })

  it("returns the created workflow id and inserts workflow plus trigger", async () => {
    const result = await createWorkflow(validInput)

    expect(result).toEqual({
      workflowId: "workflow-123",
      triggerId: "trigger-123",
    })
    expect(mockWorkflowInsert).toHaveBeenCalledWith({
      user_id: "user-123",
      name: "Premier League transfer rumors",
      description: "Premier League transfer rumors",
      status: "active",
    })
    expect(mockTriggerInsert).toHaveBeenCalledWith({
      workflow_id: "workflow-123",
      type: "x_search",
      config: {
        handles: ["FabrizioRomano"],
        description: "Premier League transfer rumors",
      },
      frequency: "30m",
      status: "active",
    })
  })

  it("uses a provided name when given", async () => {
    await createWorkflow({ ...validInput, name: "My Custom Name" })

    expect(mockWorkflowInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Custom Name",
      }),
    )
  })

  it("generates a name from the description when name is empty", async () => {
    await createWorkflow({
      ...validInput,
      name: "",
      description:
        "Premier League transfer rumors focusing on top 6 clubs and relegation",
      handles: [],
    })

    const insertArg = mockWorkflowInsert.mock.calls[0][0]
    expect(insertArg.name).toBeTruthy()
    expect(insertArg.name.length).toBeLessThanOrEqual(45)
    expect(insertArg.name.charAt(0)).toMatch(/[A-Z]/)
  })

  it("allows an empty handles array", async () => {
    await createWorkflow({ ...validInput, handles: [] })

    expect(mockTriggerInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          handles: [],
          description: "Premier League transfer rumors",
        },
      }),
    )
  })

  it("redirects to /login when the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await expect(createWorkflow(validInput)).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/login")
    expect(mockWorkflowInsert).not.toHaveBeenCalled()
    expect(mockTriggerInsert).not.toHaveBeenCalled()
  })

  it("returns an error when description is empty", async () => {
    const result = await createWorkflow({ ...validInput, description: "  " })

    expect(result).toEqual({ error: "Description is required." })
    expect(mockWorkflowInsert).not.toHaveBeenCalled()
  })

  it("returns an error when frequency is invalid", async () => {
    const result = await createWorkflow({ ...validInput, frequency: "5m" })

    expect(result).toEqual({ error: "Invalid frequency." })
    expect(mockWorkflowInsert).not.toHaveBeenCalled()
  })

  it("returns an error when more than 10 handles are provided", async () => {
    const result = await createWorkflow({
      ...validInput,
      handles: Array.from({ length: 11 }, (_, index) => `handle${index}`),
    })

    expect(result).toEqual({ error: "Maximum 10 handles allowed." })
    expect(mockWorkflowInsert).not.toHaveBeenCalled()
  })

  it("returns an error when workflow creation fails", async () => {
    mockWorkflowInsert._result = {
      data: null,
      error: { message: "DB error" },
    }

    const result = await createWorkflow(validInput)

    expect(result).toEqual({
      error: "Failed to create workflow. Please try again.",
    })
    expect(mockTriggerInsert).not.toHaveBeenCalled()
  })

  it("cleans up the workflow when trigger creation fails", async () => {
    mockTriggerInsert._result = {
      data: null,
      error: { message: "Trigger error" },
    }

    const result = await createWorkflow(validInput)

    expect(result).toEqual({
      error: "Failed to create trigger. Please try again.",
    })
    expect(mockWorkflowDeleteEq).toHaveBeenCalledWith("id", "workflow-123")
  })
})
