#!/usr/bin/env bun
import { getDatabase, initDatabase } from "./src/lib/db.ts";

const db = getDatabase();
initDatabase(db);
console.log("Database initialized successfully");
db.close();
