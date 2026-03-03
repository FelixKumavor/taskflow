import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import {
  getUserByEmail,
  getUserById,
  createUser,
  getUserTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "./db";
import { ENV } from "./_core/env";

const jwtSecret = new TextEncoder().encode(ENV.cookieSecret || "your-secret-key");

/**
 * Generate a JWT token for a user.
 */
async function generateToken(userId: number): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(jwtSecret);
  return token;
}

/**
 * Verify a JWT token and extract the userId.
 */
async function verifyToken(token: string): Promise<number | null> {
  try {
    const verified = await jwtVerify(token, jwtSecret);
    return verified.payload.userId as number;
  } catch (error) {
    return null;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    /**
     * Register a new user with email and password.
     */
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email("Invalid email address"),
          name: z.string().min(1, "Name is required"),
          password: z.string().min(6, "Password must be at least 6 characters"),
        })
      )
      .mutation(async ({ input }) => {
        // Check if user already exists
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already registered",
          });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Create user
        await createUser(input.email, input.name, passwordHash);

        // Get the created user to return
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        // Generate token
        const token = await generateToken(user.id);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        };
      }),
    /**
     * Login user with email and password.
     */
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Invalid email address"),
          password: z.string().min(1, "Password is required"),
        })
      )
      .mutation(async ({ input }) => {
        // Find user by email
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
        if (!passwordMatch) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Generate token
        const token = await generateToken(user.id);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        };
      }),
  }),

  /**
   * Task management procedures.
   */
  tasks: router({
    /**
     * Get all tasks for the authenticated user.
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return await getUserTasks(ctx.user.id);
    }),

    /**
     * Get a single task by ID (with ownership validation).
     */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const task = await getTaskById(input.id, ctx.user.id);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }
        return task;
      }),

    /**
     * Create a new task.
     */
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1, "Title is required"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        await createTask(ctx.user.id, input.title, input.description || null);
        const tasks = await getUserTasks(ctx.user.id);
        return tasks[tasks.length - 1]; // Return the newly created task
      }),

    /**
     * Update a task.
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["pending", "in-progress", "completed"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const updates: any = {};
        if (input.title !== undefined) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.status !== undefined) updates.status = input.status;

        const result = await updateTask(input.id, ctx.user.id, updates);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found or you don't have permission to update it",
          });
        }
        return await getTaskById(input.id, ctx.user.id);
      }),

    /**
     * Delete a task.
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const result = await deleteTask(input.id, ctx.user.id);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found or you don't have permission to delete it",
          });
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
