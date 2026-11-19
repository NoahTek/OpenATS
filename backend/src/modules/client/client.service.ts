import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { clients, departments, type Client } from "../../db/schema/company";

export type CreateClientInput = {
  name: string;
  slug?: string;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  timeZone?: string;
};

export type UpdateClientInput = Partial<CreateClientInput>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const clientService = {
  async getAll(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  },

  async getById(id: number): Promise<Client | null> {
    const [result] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
    return result ?? null;
  },

  async getBySlug(slug: string): Promise<Client | null> {
    const [result] = await db
      .select()
      .from(clients)
      .where(eq(clients.slug, slug))
      .limit(1);
    return result ?? null;
  },

  async create(input: CreateClientInput): Promise<Client> {
    const baseSlug = input.slug ? slugify(input.slug) : slugify(input.name);
    let finalSlug = baseSlug || `client-${Date.now()}`;

    // Verify slug uniqueness
    const existing = await this.getBySlug(finalSlug);
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const [created] = await db
      .insert(clients)
      .values({
        ...input,
        slug: finalSlug,
        updatedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create client");
    }

    return created;
  },

  async update(id: number, input: UpdateClientInput): Promise<Client | null> {
    const [updated] = await db
      .update(clients)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .returning();
    return result.length > 0;
  },

  async getDepartments(clientId: number) {
    return db
      .select()
      .from(departments)
      .where(eq(departments.clientId, clientId))
      .orderBy(departments.name);
  },

  async createDepartment(clientId: number, name: string) {
    const [created] = await db
      .insert(departments)
      .values({
        clientId,
        name: name.trim(),
      })
      .returning();
    return created;
  },

  async updateDepartment(clientId: number, deptId: number, name: string) {
    const [updated] = await db
      .update(departments)
      .set({
        name: name.trim(),
        updatedAt: new Date(),
      })
      .where(and(eq(departments.id, deptId), eq(departments.clientId, clientId)))
      .returning();
    return updated ?? null;
  },

  async deleteDepartment(clientId: number, deptId: number): Promise<boolean> {
    const [deleted] = await db
      .delete(departments)
      .where(and(eq(departments.id, deptId), eq(departments.clientId, clientId)))
      .returning();
    return !!deleted;
  },
};
