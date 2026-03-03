import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import bcrypt from "bcrypt";

// Mock database functions
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  getUserTasks: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import * as db from "./db";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

function createAuthenticatedContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("auth.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Mock database functions
    (db.getUserByEmail as any).mockResolvedValue(null);
    (db.createUser as any).mockResolvedValue({ insertId: 1 });
    (db.getUserByEmail as any).mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 1,
      email: "newuser@example.com",
      name: "New User",
      passwordHash: await bcrypt.hash("password123", 10),
    });

    const result = await caller.auth.register({
      email: "newuser@example.com",
      name: "New User",
      password: "password123",
    });

    expect(result.user.email).toBe("newuser@example.com");
    expect(result.user.name).toBe("New User");
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
  });

  it("should reject duplicate email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    (db.getUserByEmail as any).mockResolvedValue({
      id: 1,
      email: "existing@example.com",
      name: "Existing User",
    });

    try {
      await caller.auth.register({
        email: "existing@example.com",
        name: "New User",
        password: "password123",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("Email already registered");
    }
  });

  it("should validate email format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.register({
        email: "invalid-email",
        name: "User",
        password: "password123",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid email");
    }
  });

  it("should validate password length", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.register({
        email: "user@example.com",
        name: "User",
        password: "short",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("at least 6 characters");
    }
  });
});

describe("auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login user successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const passwordHash = await bcrypt.hash("password123", 10);
    (db.getUserByEmail as any).mockResolvedValue({
      id: 1,
      email: "user@example.com",
      name: "Test User",
      passwordHash,
    });

    const result = await caller.auth.login({
      email: "user@example.com",
      password: "password123",
    });

    expect(result.user.email).toBe("user@example.com");
    expect(result.token).toBeDefined();
  });

  it("should reject invalid password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const passwordHash = await bcrypt.hash("password123", 10);
    (db.getUserByEmail as any).mockResolvedValue({
      id: 1,
      email: "user@example.com",
      name: "Test User",
      passwordHash,
    });

    try {
      await caller.auth.login({
        email: "user@example.com",
        password: "wrongpassword",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid email or password");
    }
  });

  it("should reject non-existent user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    (db.getUserByEmail as any).mockResolvedValue(null);

    try {
      await caller.auth.login({
        email: "nonexistent@example.com",
        password: "password123",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("Invalid email or password");
    }
  });
});

describe("tasks.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list user tasks", async () => {
    const ctx = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    const mockTasks = [
      {
        id: 1,
        userId: 1,
        title: "Task 1",
        description: "Description 1",
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        title: "Task 2",
        description: null,
        status: "completed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (db.getUserTasks as any).mockResolvedValue(mockTasks);

    const result = await caller.tasks.list();

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Task 1");
    expect(result[1].status).toBe("completed");
  });

  it("should require authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.tasks.list();
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });
});

describe("tasks.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new task", async () => {
    const ctx = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    const newTask = {
      id: 1,
      userId: 1,
      title: "New Task",
      description: "Task description",
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db.createTask as any).mockResolvedValue({ insertId: 1 });
    (db.getUserTasks as any).mockResolvedValue([newTask]);

    const result = await caller.tasks.create({
      title: "New Task",
      description: "Task description",
    });

    expect(result.title).toBe("New Task");
    expect(result.userId).toBe(1);
    expect(result.status).toBe("pending");
  });

  it("should validate title is required", async () => {
    const ctx = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.tasks.create({
        title: "",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("Title is required");
    }
  });

  it("should require authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.tasks.create({
        title: "Task",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });
});

describe("tasks.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update a task", async () => {
    const ctx = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    const updatedTask = {
      id: 1,
      userId: 1,
      title: "Updated Task",
      description: "Updated description",
      status: "in-progress" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db.updateTask as any).mockResolvedValue({ changes: 1 });
    (db.getTaskById as any).mockResolvedValue(updatedTask);

    const result = await caller.tasks.update({
      id: 1,
      title: "Updated Task",
      description: "Updated description",
      status: "in-progress",
    });

    expect(result.title).toBe("Updated Task");
    expect(result.status).toBe("in-progress");
  });

  it("should reject update of non-existent task", async () => {
    const ctx = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    (db.updateTask as any).mockResolvedValue(null);

    try {
      await caller.tasks.update({
        id: 999,
        title: "Updated",
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});

describe("tasks.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a task", async () => {
    const ctx = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    (db.deleteTask as any).mockResolvedValue({ changes: 1 });

    const result = await caller.tasks.delete({
      id: 1,
    });

    expect(result.success).toBe(true);
  });

  it("should reject delete of non-existent task", async () => {
    const ctx = createAuthenticatedContext(1);
    const caller = appRouter.createCaller(ctx);

    (db.deleteTask as any).mockResolvedValue(null);

    try {
      await caller.tasks.delete({
        id: 999,
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});
