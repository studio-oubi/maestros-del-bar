import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const registros = pgTable("registros", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  cedula: text("cedula").notNull(),
  telefono: text("telefono").notNull(),
  correo: text("correo").notNull(),
  ciudad: text("ciudad").default("").notNull(),
  establecimiento: text("establecimiento").default("").notNull(),
  // Regalo asignado desde el panel (solo panel; el juego no lo toca). "" = sin
  // asignar. La asignación es única: se garantiza en el servidor con
  // UPDATE ... WHERE regalo = '' (ver app/api/regalo/route.ts).
  regalo: text("regalo").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const partidas = pgTable("partidas", {
  id: serial("id").primaryKey(),
  registroId: integer("registro_id").references(() => registros.id),
  trago: text("trago").notNull(),
  resultado: text("resultado").notNull(), // 'gano' | 'fallo' | 'tiempo'
  tiempoRestante: integer("tiempo_restante").notNull(),
  detalles: jsonb("detalles"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
