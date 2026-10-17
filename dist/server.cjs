var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_http = __toESM(require("http"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_ws = require("ws");
var import_vite = require("vite");
var xlsx = __toESM(require("xlsx"), 1);

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);

// src/db/index.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"), 1);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attendance: () => attendance,
  departments: () => departments,
  events: () => events,
  programs: () => programs,
  sections: () => sections,
  students: () => students,
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  username: (0, import_pg_core.text)("username").notNull().unique(),
  role: (0, import_pg_core.text)("role").$type().notNull(),
  fullName: (0, import_pg_core.text)("full_name").notNull(),
  password: (0, import_pg_core.text)("password")
});
var departments = (0, import_pg_core.pgTable)("departments", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  code: (0, import_pg_core.text)("code").notNull()
});
var programs = (0, import_pg_core.pgTable)("programs", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  code: (0, import_pg_core.text)("code").notNull(),
  departmentCode: (0, import_pg_core.text)("department_code").notNull()
});
var sections = (0, import_pg_core.pgTable)("sections", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull()
});
var events = (0, import_pg_core.pgTable)("events", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  description: (0, import_pg_core.text)("description"),
  date: (0, import_pg_core.text)("date").notNull(),
  isActive: (0, import_pg_core.boolean)("is_active").notNull().default(true),
  sanctionTime: (0, import_pg_core.text)("sanction_time"),
  sanctionHours: (0, import_pg_core.integer)("sanction_hours"),
  createdAt: (0, import_pg_core.text)("created_at"),
  sessions: (0, import_pg_core.text)("sessions").$type()
});
var students = (0, import_pg_core.pgTable)("students", {
  studentId: (0, import_pg_core.text)("student_id").primaryKey(),
  fullName: (0, import_pg_core.text)("full_name").notNull(),
  department: (0, import_pg_core.text)("department").notNull(),
  program: (0, import_pg_core.text)("program").notNull(),
  yearLevel: (0, import_pg_core.text)("year_level").notNull(),
  section: (0, import_pg_core.text)("section").notNull(),
  createdAt: (0, import_pg_core.text)("created_at")
});
var attendance = (0, import_pg_core.pgTable)("attendance", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  studentId: (0, import_pg_core.text)("student_id").notNull(),
  studentName: (0, import_pg_core.text)("student_name").notNull(),
  department: (0, import_pg_core.text)("department").notNull(),
  program: (0, import_pg_core.text)("program").notNull(),
  yearLevel: (0, import_pg_core.text)("year_level").notNull(),
  section: (0, import_pg_core.text)("section").notNull(),
  eventId: (0, import_pg_core.text)("event_id").notNull(),
  eventName: (0, import_pg_core.text)("event_name").notNull(),
  date: (0, import_pg_core.text)("date").notNull(),
  timeIn: (0, import_pg_core.text)("time_in").notNull(),
  timeOut: (0, import_pg_core.text)("time_out"),
  scannedBy: (0, import_pg_core.text)("scanned_by").notNull()
});

// src/db/index.ts
var { Pool } = import_pg.default;
var createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15e3
  });
};
var pool = createPool();
pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// server/db.ts
var import_drizzle_orm = require("drizzle-orm");

// server/csvSeedData.ts
var csvStudents = [
  // BSABE
  { studentId: "2026100746", fullName: "Gefricks F. Valdez", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100744", fullName: "Ajhel Marionel S. Tubera", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100742", fullName: "Ralph Anthony C. Flores", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100739", fullName: "John lorence R. Fernandez", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100736", fullName: "Lovely Angel M. Bugayong", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100745", fullName: "Michael Angelo N Solomon", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100740", fullName: "Allynae Mae S. Bugarin", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100996", fullName: "Mark Brian T. Vilar", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100995", fullName: "Kristine Joy S. Mandapat", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100738", fullName: "Eunice T. Isidro", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100748", fullName: "Sydney Sophia O. Aquino", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100737", fullName: "Mathew E. Bulatao", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100751", fullName: "Maxene Majhula M. Bulos", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100765", fullName: "Marielle M. Repalda", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100759", fullName: "Risen Christian Q. Mascari\xF1as", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100747", fullName: "John Melford D. Pagarigan", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100749", fullName: "Anthony R. Manzon", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100756", fullName: "Kyla Ann D. Cariaga", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100764", fullName: "Erron M. Jasmin", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101897", fullName: "Art S. Bautista", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100755", fullName: "John Lenard M. Bautista", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100998", fullName: "Kyle A. Manuel", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100762", fullName: "Jonel V. Ventanilla", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101724", fullName: "Kathlyn Ann C. Azuelo", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100936", fullName: "Sheila P. Palaganas", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101726", fullName: "Cathlyn Joy P. Marcos", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101041", fullName: "Vince Gabriel G. Fronda", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100763", fullName: "Rhain Justine P. Domingo", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100758", fullName: "Nekia Sofie A. Castro", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100778", fullName: "Jerremiah Christian F. Felix", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100780", fullName: "Dareen M. Reyes", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101725", fullName: "Kench Lhyn M. Ventura", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101646", fullName: "Juliane Dinnies P Valdez", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101000", fullName: "Trisha Nicole D. Sotero", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100743", fullName: "Jearemy D. Cabubos", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100767", fullName: "Kyle Denver B Guillermo", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100741", fullName: "Jared M. Leysa", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100771", fullName: "Joy V. Francisco", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100787", fullName: "Izy Rose R. Idica", program: "BSABE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101573", fullName: "Mary Joana Paula B.Collado", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101498", fullName: "Krichelle Ann F. Parazo", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101622", fullName: "Maria Tiffany V. Guting", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101480", fullName: "Jean Kyla A. Cuaresma", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101114", fullName: "Jamaina O. Quilapio", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101536", fullName: "Will Brenson R. Quizana", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101551", fullName: "Kent Dino P. Benemerito", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101620", fullName: "Kaesser Charlie V. Royupa", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101596", fullName: "Jezrel F. Fernandez", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101628", fullName: "Deric M. Tondok", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101617", fullName: "Leana Mae S. Lagunero", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101104", fullName: "Joshua T. Sadiamona", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101485", fullName: "Rai Alexis G. Daligdig", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101615", fullName: "Ronelyn M. Dela Cruz", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101482", fullName: "Raff James D. Casiano", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101641", fullName: "Marwella T. Alcaraz", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101607", fullName: "Gasmido, George Gervin V.", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101260", fullName: "John Zandher B. Agustin", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101629", fullName: "Jhon Michael H. Esteban", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101359", fullName: "Prince Dylan T. Taguines", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101470", fullName: "Jonas M. Palma", program: "BSABE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2025101176", fullName: "Johan Hebe O. Tolentino", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101203", fullName: "Izer Jay T. Udarbe", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101168", fullName: "Carl Daniel V. Manayan", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101150", fullName: "Rosenda P. Catalon", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2024100343", fullName: "Mark Louie R. Dela Cruz", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101144", fullName: "MARK JOMER P ROSARIO", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101132", fullName: "Nathalie M. Catalan", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101155", fullName: "Cris Bell J. Castillo", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101128", fullName: "Krizzia Ellaine A. Unay", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101190", fullName: "Raymund Alen T. Naguiat", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101154", fullName: "Charles DM M. Domingo", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025121357", fullName: "Jasper R. Aquino", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101895", fullName: "Mie-Lin Fernandez", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101196", fullName: "Jb B. De Vera", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101166", fullName: "Bryan Anthony A. Jose", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101188", fullName: "Tristan B. Antalan", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2024101123", fullName: "Mhel Alfred G. Salcedo", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101334", fullName: "Jaizel Anne A. Publico", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101131", fullName: "Robelyn R. Payumo", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2024100726", fullName: "Lea G. Pallasigue", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025101129", fullName: "Jeremie P. Gabriel", program: "BSABE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2024100153", fullName: "Jhoy B. Caragay", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100175", fullName: "Angelica Mae M.Llamo", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100199", fullName: "Cheeno P. Astrologio", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100217", fullName: "Maxwell A. Castro", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100198", fullName: "Jan Chanelle M. Casao", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100154", fullName: "Alexis D. Valdez", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100192", fullName: "Mark Edrian T. Pe\xF1aranda", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100206", fullName: "Roel Jr. D. Castillo", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024101085", fullName: "Hazel Joyce C. Sotero", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100173", fullName: "Jerrico C. Asuncion", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100200", fullName: "Jose Gio S. Jimenez", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100185", fullName: "Dan Francis G. Eugenio", program: "BSABE", yearLevel: "3", section: "A", department: "CET" },
  // BSIT
  { studentId: "2026101892", fullName: "Kasandra Claire P. Morales", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100281", fullName: "Jesryl Andrei Agustin", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100280", fullName: "Zhander Rein D. Bolos", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100282", fullName: "Santiago, John Lenard V.", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100247", fullName: "Julienne Mae U. Rivera", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100298", fullName: "Xyreene S. Lopez", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100303", fullName: "Angel D. Caragay", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100290", fullName: "Shona C. Rosseels", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100284", fullName: "KC Jannah R. Palisoc", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100289", fullName: "Mark Laurence A. Dahuya", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100246", fullName: "Efrain John J. Reyes", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100245", fullName: "Zylord L. Hate", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100268", fullName: "Don Paul V. De Guzman", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100233", fullName: "Camille Joy Angeles", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100283", fullName: "Frances Iyna Velasco", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101971", fullName: "Lirio Rosal G. Apango", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100273", fullName: "Cedekiah Actsel U. Sapad", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100258", fullName: "Ernie Sebastien A. Sobredo", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100254", fullName: "Lara Venice V. Flores", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100234", fullName: "Nestor Jr C Decena", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100248", fullName: "John Rain P. Guimba", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100235", fullName: "Ralph Derek I. Dadulla", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100287", fullName: "Ralph Vincent P. Cacatian", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100237", fullName: "Romer Adrian R. Masalta", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100301", fullName: "Ian Ramil M. Suyat", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100296", fullName: "Daniel P. Costales", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100288", fullName: "Kian Chrysler E. De Guzman", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101523", fullName: "Kyle Jefferson C. Avellana", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100300", fullName: "Jeruen M. Nartates", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026101988", fullName: "Kerviel Josh Q. Juan", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "1514290", fullName: "Charles Kenneth F. spelata", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100299", fullName: "Maria Rea B. De Juan", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100292", fullName: "Marc David G. Lapitan", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100277", fullName: "Josiah D. Madriaga", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100291", fullName: "Nathaniel G. Ramil", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100295", fullName: "Alberto Jr. D. Nabejet", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100293", fullName: "George L. Solomon Jr", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100262", fullName: "Jesse M. Leysa", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100297", fullName: "Angelo Carl C. Del Leon", program: "BSIT", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100317", fullName: "Aiza L. Bautista", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100334", fullName: "Kimberly M. Vistro", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026010363", fullName: "Pauline H. Vinluan", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100315", fullName: "Hector Miguel A. Salazar", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100375", fullName: "JC C. Lorenzo", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100373", fullName: "Ecija, Floren Polido", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100348", fullName: "Liam D. Mislang", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100376", fullName: "Benjie P. Dulay", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100371", fullName: "Kaye Nicole S. Ganiban", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "1570330", fullName: "Micole C. Tipay", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100350", fullName: "Geisha Lyn C. Diaz", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100358", fullName: "Dheniel M. Soriano", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100319", fullName: "Arjo C. Bautista", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100313", fullName: "Jea Mae O. Castro", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100353", fullName: "Ruben Benoe S. Ruz", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100316", fullName: "Eizhandimer M. Tumambac", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100340", fullName: "Jerhan N. Esteban", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100335", fullName: "Sarah Mae U. Mengullo", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026102011", fullName: "Prince Robert P. Resuello", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100370", fullName: "Charles Kervin S. Pagarigan", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100323", fullName: "Billy Emman Noel B. Bueno", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100309", fullName: "John Steven A. Medrano", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100344", fullName: "Jaspher S. Bautista", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100328", fullName: "Marie Claire M. Naltchadjian", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100357", fullName: "Jonard S. Magleo jr.", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100351", fullName: "Samuel Tristan B. Mariano", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101985", fullName: "William Clair Bailen", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100339", fullName: "Carl John C. Unay", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100333", fullName: "Carl Vincent T. Eclevia", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100331", fullName: "Janus Roy Tanke", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101508", fullName: "Abdul B. Badio", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100359", fullName: "Tyrone Jon Mariano", program: "BSIT", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100984", fullName: "Jorel Nigel P. Arciaga", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101441", fullName: "Jay Danielle V. Sanchez", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101575", fullName: "Nadine S. Marcelo", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101378", fullName: "Avenido, James Mark L.", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100392", fullName: "Issa Mari V. Hortelano", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101398", fullName: "Jerome P. Arellano", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101878", fullName: "Christian A. Sysing", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100803", fullName: "Pauleen D. Baysa", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100383", fullName: "Alison Rose C. Vinluan", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100380", fullName: "Jezrael R. Rosales", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100620", fullName: "Jhared James B. Publico", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101015", fullName: "John Russel S. Tablizo", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101088", fullName: "Ydsent C. Sese", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101345", fullName: "Aldwin L. Tolentino", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100459", fullName: "John Lenard P. Mariano", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101188", fullName: "Nicole Mangrobang", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101182", fullName: "Ashley Jane D. Figuracion", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101495", fullName: "Kezia P. Candelario", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101334", fullName: "Joy Karla R. Cabanes", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100391", fullName: "Benhur S. Felix", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100408", fullName: "Charlie P. Bagayan", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101241", fullName: "Noriena Jane T. Juan", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101157", fullName: "Yesha Joy M. Marcos", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101677", fullName: "Audrey Rose B. Bando", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100969", fullName: "Galera Aleck Ciandre S.", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101618", fullName: "Mar Calvin Ronn V. Monzaga", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101092", fullName: "Kent F. Maregmen", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101500", fullName: "Cris Jerome B. Molano", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101147", fullName: "Jhepsy Von C. Manuel", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100381", fullName: "Sophia M. Millet", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101268", fullName: "Jenny V. Feliciano", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100559", fullName: "Jefferson C. Santos", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101087", fullName: "Isabelo lll C. Molano", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100390", fullName: "Rain Jihan M. Ontangco", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100389", fullName: "Nicole Shane C. Rojas", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101155", fullName: "Charles Jobert J. Go", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101616", fullName: "Joy P. Yadao", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101347", fullName: "Joy Heart L. Bataan", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101373", fullName: "John Edd P. Ramos", program: "BSIT", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2025100676", fullName: "Claudio Benigno C. Flores Jr.", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100666", fullName: "Charles Aldrie A. Garin", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100687", fullName: "Ivan Micoh B. Quirap", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100680", fullName: "Sien David N. Fajardo", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100633", fullName: "Abegail M. Espejo", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100648", fullName: "Sherwin G. Luanzon", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100704", fullName: "Denzel P. Isla", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100662", fullName: "Marc Erick G. Macalalag", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100669", fullName: "Graciela Jane Z. Baccay", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100629", fullName: "Glenard B. Garcia", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100650", fullName: "Jeoffe Vin Guides", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100700", fullName: "Rico Bien E. Santiago", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100674", fullName: "Jericho T. Lacayanga", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100672", fullName: "Bryan A. Genayas", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100696", fullName: "John Mark E. Pedaliso", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100653", fullName: "Bianca Amber B. Mariano", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100670", fullName: "Khyan Socrates C. Tambot", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100652", fullName: "Trishia S. Narcida", program: "BSIT", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100758", fullName: "Sasha Victoria B. Jacalne", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100721", fullName: "Shekaina Pam B. Yoro", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100729", fullName: "John Cedric P. Tabao", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100765", fullName: "Jermaine G. Nituma", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100719", fullName: "Jexel Ace M. Damian", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100640", fullName: "Jayland D. Eugenio", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100752", fullName: "Ma. Clarisse B. Mabalot", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100772", fullName: "Mark Justin Carl B. Molano", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100779", fullName: "John Ceasar C. Pimentel", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100900", fullName: "Jann Menard G. Baltazar", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025101425", fullName: "Jelomar Chris G. Dela Cruz", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2023101209", fullName: "John Joshua Cachero", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100748", fullName: "Jenmar V. Moises", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100741", fullName: "Jerrianne Ydnar J. Domingo", program: "BSIT", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025101374", fullName: "Jhay Rick D. Abainza", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101216", fullName: "Krystyl Jane Z. Baccay", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101376", fullName: "Nash I. Pascua", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101261", fullName: "Laurance B. Valdez", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101307", fullName: "Hannah Gee-Anne V. Manaloto", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101569", fullName: "Kryzzel Mae J. Leonidaz", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101326", fullName: "Shiedelyn Faye Q. Veraya", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101433", fullName: "Ashley B. Bagtong", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101382", fullName: "PRINCES LYKA B. DANIPOG", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2027000316", fullName: "Charmeal C. Guillermo", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2026101893", fullName: "Calvin Emanuel L. Cariaga", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101287", fullName: "Cristina A. Simon", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101436", fullName: "Leoneol M. Ubaldo", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101320", fullName: "Myka Angela V. Labrador", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101368", fullName: "Justin Lian M. Aparte", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101355", fullName: "Princess Joy C. Domingo", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100412", fullName: "Princess Lyca D. Martin", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101336", fullName: "Christine Angel G. Rivera", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101192", fullName: "Marc Herald C. Ordonio", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101624", fullName: "Joshua D. Cabutaje", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101264", fullName: "William Andrei S. Prando", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101297", fullName: "Adrian Jay G. Sales", program: "BSIT", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101905", fullName: "Jeremy R. Esteban", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2025100786", fullName: "Sagun, Karena Mhae P.", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2024100300", fullName: "Cylene Myrvs F. Dela Cruz", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2025101933", fullName: "Valentin I. Labonete III", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2025101805", fullName: "Jayfe C. Fiesta", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2025101360", fullName: "James D. Agustin", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2025101893", fullName: "Christ Shean Mhaell DS Prado", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2025101786", fullName: "Mateo, Mary Joy A.", program: "BSIT", yearLevel: "2", section: "D", department: "CET" },
  { studentId: "2024100240", fullName: "Jin San Carlou C. Vidal", program: "BSIT", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100270", fullName: "Trystan A. Hernandez", program: "BSIT", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2020100081", fullName: "Ed-Ceasar D. Morcilla", program: "BSIT", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2022100174", fullName: "Jay Marc V. Parazo", program: "BSIT", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2024100274", fullName: "Jerald L. Rodigero", program: "BSIT", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2024100245", fullName: "Van Claude C. Rilveria", program: "BSIT", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2024100276", fullName: "John Ivan L. Juan", program: "BSIT", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2023100785", fullName: "Edison John H. Capuno", program: "BSIT", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2023100223", fullName: "Khim Christian Y. Isla", program: "BSIT", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2023100209", fullName: "Kristian Anjelo N. Manuel", program: "BSIT", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2023100194", fullName: "CJ I. Canaria", program: "BSIT", yearLevel: "4", section: "A", department: "CET" },
  // BSGE
  { studentId: "2026100320", fullName: "Denise Marie R. Valle", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100278", fullName: "Jessica S. Cobarrubias", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100270", fullName: "Alexa Nicole P. Bautista", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100272", fullName: "Nicolle Andrei D. Olegario", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100310", fullName: "Mariel M. Bayudan", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100265", fullName: "Honey Rose M. Orbillo", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100314", fullName: "Jazmine T. Agunoy", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100276", fullName: "Adrian S. Simbre", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100238", fullName: "Aeone Zyan Patalod", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100240", fullName: "Karl Justine A. Montera", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100242", fullName: "Harold B Nicolas", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100255", fullName: "James Nathaniel S. Ortiz", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100305", fullName: "Raffy P. Dizon", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100266", fullName: "Ace V. Antonio", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100311", fullName: "Aljhun R. Lasco", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100321", fullName: "Jannah Louraine M. Reyes", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100267", fullName: "Aidan N. Morales", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100274", fullName: "Jess Rovic A. Rubinos", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100304", fullName: "Justine G. Baccay", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100318", fullName: "Dante F. Papa Jr.", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100275", fullName: "Lara Nicole M. Corrales", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100241", fullName: "Rinbee Jhon D. Binco", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100260", fullName: "Prince Joel A. Cruz", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100264", fullName: "Jeremiah R. Galano", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100269", fullName: "Mharc Dheinyael M. Mateo", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100271", fullName: "John Belbert P. Sumaoang", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100279", fullName: "Gian Zhael F. Dela Merced", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100261", fullName: "Arguillo Joseph S. De Guzman", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026102026", fullName: "Jilianne Antonette M. Marquez", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100252", fullName: "Dominic L. Lanuza", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100257", fullName: "Juan Miguel B. Milla", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100251", fullName: "Jackilyn A. Ugale", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100302", fullName: "Renz Mico M. Cacayorin", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100286", fullName: "Marc Ceejay Cabigas", program: "BSGE", yearLevel: "1", section: "A", department: "CET" },
  { studentId: "2026100393", fullName: "Cristian Karl D. Banayo", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100325", fullName: "Angel Pauline N. Ramos", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100354", fullName: "Sophia Lorraine S. Relucio", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101317", fullName: "Yeshua Rose Mae R. Alegado", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100368", fullName: "Aezea Bles S. Silao", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100356", fullName: "Reniel P. Doctor", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100384", fullName: "Reniel Dave C. Gubala", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101020", fullName: "Tristan C. Laxamana", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100365", fullName: "Geron Andrei Mitch T. Cruz", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101009", fullName: "Angelica S. Sacopla", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100372", fullName: "Althroy John D. Ibarra", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100364", fullName: "Paul Christian B Danganan", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100377", fullName: "Stephanie E. Caranza", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100387", fullName: "Shania Bien Rose G. Caraan", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100905", fullName: "Ahzel F. Dela Cruz", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100329", fullName: "Danica Mae Deligero Pablo", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100362", fullName: "Aviemil T. Aviguetero", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100330", fullName: "Adrian Dave B. Riparip", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100360", fullName: "Joana Mae C. Abrenica", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100968", fullName: "Andrea Nicole P. Riparip", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100958", fullName: "Ermissly L. Leonardo", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100367", fullName: "Jonarld G. Bautista", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100343", fullName: "Jayelle S. Bustamante", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100342", fullName: "Rolan Josef P. Agas", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100386", fullName: "Jasmin V. Mejia", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100338", fullName: "Angelou O. Sebastian", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100382", fullName: "Gian Zander N. Basilio", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100374", fullName: "Jhanelle Mikaela T. Guieb", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100337", fullName: "Daniella Marie M. Juanata", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100366", fullName: "Lomibao, Gee Ann KC P.", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100322", fullName: "Zee-Gem B. Cugana", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100369", fullName: "Jastin Vasquez", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101183", fullName: "Dante Jr. D. Ramales", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100324", fullName: "John Lloyd M. Manuel", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026101119", fullName: "Merishelle I. Ildefonso", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100352", fullName: "Hanassi M. Ibarra", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100395", fullName: "Carla S.J. Apostol", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100349", fullName: "Leonardo R. Baldelamar", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026100361", fullName: "Latrell Jan V. Ofalla", program: "BSGE", yearLevel: "1", section: "B", department: "CET" },
  { studentId: "2026102002", fullName: "RAIZA S. MENDOZA", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101327", fullName: "Princess Agatha P. Claudio", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101440", fullName: "Keneth Lawrence M. Ildefonso", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026100346", fullName: "Jerome T. Robillos", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101429", fullName: "Zyrell Nicole P. Tangonan", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101940", fullName: "Justin E. Piquero", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101301", fullName: "Shane Vhalerie Arellano", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026102059", fullName: "John mark c. Robin", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026102065", fullName: "April Anne V. Tolentino", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2026101509", fullName: "Ma. Cassandra S. Fernandez", program: "BSGE", yearLevel: "1", section: "C", department: "CET" },
  { studentId: "2025100644", fullName: "Kate Ashley B. Valez", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100686", fullName: "Kimberly Anne F. Ildefonso", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100692", fullName: "Jonas Gabriel R. Gamit", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100649", fullName: "Jirah Josh D. De Vera", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100709", fullName: "Renz Romark Q. Granita", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100710", fullName: "Vincent Jay A. Razalan", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100647", fullName: "Jherina P. Fiesta", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100645", fullName: "Kisha Angeli A. Camannong", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100671", fullName: "Jay Mart D. Molano", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100641", fullName: "Jamaica Pearl Q. Burgos", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100634", fullName: "Eric John H. Molina", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100685", fullName: "Josh Mavrick C. Bacani", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100675", fullName: "Angel M. Delos Santos", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100636", fullName: "Lenus Benedict P. Gabuya", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100701", fullName: "Mart S Calimlim", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100657", fullName: "Kharl Andrei C. Vasquez", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100677", fullName: "Jian D. Aguilar", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100689", fullName: "Rowan M. Salita", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100637", fullName: "Rejeane T. Agustin", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100762", fullName: "Andrei V. Asano", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100716", fullName: "Steve Nash P. Apaga", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2026100663", fullName: "Angerica R. Bugarin", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100702", fullName: "Mark Justin A. Parcero", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100658", fullName: "Janno J. Toledo", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100642", fullName: "Xander Ray Martin B. De Leon", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100661", fullName: "Yeshua M. Galleon", program: "BSGE", yearLevel: "2", section: "A", department: "CET" },
  { studentId: "2025100740", fullName: "Jan Xedrick Dela Cruz Cariaga", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100651", fullName: "Yuanne Nicole C. Dulay", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100630", fullName: "Marc Laurence S. Bermudez", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100745", fullName: "Helmar B. Perez", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025101407", fullName: "Jhon Jake Aple B. Celestino", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100761", fullName: "Raven Jay C. Laureta", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100760", fullName: "Rose-Anne R. Quiam", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100678", fullName: "Jasam L. Celiz", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100655", fullName: "Josiah Ivan N. Tomas", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025101362", fullName: "Jameson L. Valiente", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100753", fullName: "Alter Jeriel B. Nava", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100690", fullName: "Jamelle Rose C. Mendoza", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100684", fullName: "Althea Dane I. Bueno", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100632", fullName: "Camille M. Alonzo", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100737", fullName: "Valerie F. Querido", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100631", fullName: "Wayne Seandrei D. Pararuan", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2026100660", fullName: "Jasmin Corabelle R Patricio", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100656", fullName: "Jasmin Ashley Calonzo", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100730", fullName: "Junian Carl S. Lorenzo", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025102021", fullName: "Eldrin B. Dela Cruz", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100755", fullName: "Jan Mark R. Dalupe", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100751", fullName: "Joana Marie G. Abella", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100778", fullName: "Jewel Fate T. Toledo", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025100718", fullName: "Charlie Anne G. Cruz", program: "BSGE", yearLevel: "2", section: "B", department: "CET" },
  { studentId: "2025101417", fullName: "Cris Darwin H. Talaue", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100673", fullName: "Ei-j T. Dela Cruz", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100747", fullName: "Joemar G. Tamayo", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101390", fullName: "Gabriel T. Manzano", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100788", fullName: "Revy Joshua G. Ventura", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100723", fullName: "Mark Roland R. Neri", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101758", fullName: "Stephanie V. Martinez", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025101901", fullName: "Lexter Jazzel A. Cruz", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100771", fullName: "Aldrich A. Feliciano", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100777", fullName: "Mark Henrick M. Cajigal", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100750", fullName: "Bryan L. Tipay", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2025100776", fullName: "Karl Andrei C. Andres", program: "BSGE", yearLevel: "2", section: "C", department: "CET" },
  { studentId: "2024100188", fullName: "Jasper L. Gavino", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100159", fullName: "Russele V. Galleto", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100176", fullName: "Vaughn Aevian P. Mueca", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100190", fullName: "James Patrick D. Alonzo", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100186", fullName: "Michael Angelo G. Bautista", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100156", fullName: "Karl Anthony G. Gragasin", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100211", fullName: "Grace Cielo V. Duran", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100177", fullName: "John Ernest B. Pablo", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100179", fullName: "Carl Stephen G. Roxas", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100119", fullName: "Danielle Radcliff R. Gagarin", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100194", fullName: "Hanskrieg T. Bacolor", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100183", fullName: "Laurence Dave W. Gascon", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100171", fullName: "Arc Angelo P. Bautista", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100166", fullName: "Aaron Jay B. Dancel", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100163", fullName: "Jairus D. Abrazado", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100151", fullName: "Reagan Moore T. Casilla", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100205", fullName: "Johan B. Lime", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100157", fullName: "John Noel M. Mallari", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100149", fullName: "Berel D. Acosta", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100024", fullName: "Rocel M. Ramos", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100189", fullName: "Mar Bienson L. Pascua", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100164", fullName: "Erlon E. Martin", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100162", fullName: "Althea Shane P. Beltran", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100191", fullName: "Luna Franze Nicole R. Abella", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100170", fullName: "Andrei S. Aguinaldo", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100197", fullName: "Dennis M. Olegario Jr.", program: "BSGE", yearLevel: "3", section: "A", department: "CET" },
  { studentId: "2024100833", fullName: "Chelsea Edreina A. Pangan", program: "BSGE", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2024100958", fullName: "Ruby U. Cari\xF1o", program: "BSGE", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2024101279", fullName: "Coradiane H. Talaga", program: "BSGE", yearLevel: "3", section: "B", department: "CET" },
  { studentId: "2023100250", fullName: "Giovanni G. Latosa", program: "BSGE", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2023101361", fullName: "Harvey C. Arelolo", program: "BSGE", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2023100206", fullName: "Jimuel B. Estrada", program: "BSGE", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2023100231", fullName: "Dhen Mark C. Ga\xF1o", program: "BSGE", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2022100079", fullName: "Januarius M. Molina", program: "BSGE", yearLevel: "FREE", section: "A", department: "CET" },
  { studentId: "2022100080", fullName: "Mark Anthony B. Santos", program: "BSIT", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2022100081", fullName: "Princess Joy M. Reyes", program: "BSABE", yearLevel: "4", section: "A", department: "CET" },
  { studentId: "2022100082", fullName: "Christian Dave P. Cruz", program: "BSIT", yearLevel: "4", section: "A", department: "CET" }
];

// server/csvImporter.ts
var rawCsvRows = [
  // BSABE 2026-07-23
  { studentId: "2026100746", name: "Gefricks F. Valdez", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:13:37 AM", timeOut: "On Premises" },
  { studentId: "2026100744", name: "Ajhel Marionel S. Tubera", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:13:45 AM", timeOut: "On Premises" },
  { studentId: "2026100742", name: "Ralph Anthony C. Flores", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:14:13 AM", timeOut: "On Premises" },
  { studentId: "2026100739", name: "John lorence R. Fernandez", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:14:37 AM", timeOut: "On Premises" },
  { studentId: "2026100736", name: "Lovely Angel M. Bugayong", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:14:58 AM", timeOut: "On Premises" },
  { studentId: "2026100745", name: "Michael Angelo N Solomon", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:15:03 AM", timeOut: "On Premises" },
  { studentId: "2026100740", name: "Allynae Mae S. Bugarin", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:15:08 AM", timeOut: "On Premises" },
  { studentId: "2026100996", name: "Mark Brian T. Vilar", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:15:15 AM", timeOut: "On Premises" },
  { studentId: "2026100995", name: "Kristine Joy S. Mandapat", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:15:24 AM", timeOut: "On Premises" },
  { studentId: "2026100738", name: "Eunice T. Isidro", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:15:29 AM", timeOut: "On Premises" },
  { studentId: "2026100748", name: "Sydney Sophia O. Aquino", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:15:38 AM", timeOut: "On Premises" },
  { studentId: "2026100737", name: "Mathew E. Bulatao", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:15:54 AM", timeOut: "On Premises" },
  { studentId: "2026100751", name: "Maxene Majhula M. Bulos", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:16:36 AM", timeOut: "On Premises" },
  { studentId: "2026100765", name: "Marielle M. Repalda", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:25:00 AM", timeOut: "On Premises" },
  { studentId: "2026100759", name: "Risen Christian Q. Mascari\xF1as", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:25:13 AM", timeOut: "On Premises" },
  { studentId: "2026100747", name: "John Melford D. Pagarigan", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:28:30 AM", timeOut: "On Premises" },
  { studentId: "2026100749", name: "Anthony R. Manzon", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:31:02 AM", timeOut: "On Premises" },
  { studentId: "2026100756", name: "Kyla Ann D. Cariaga", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:35:26 AM", timeOut: "On Premises" },
  { studentId: "2026100764", name: "Erron M. Jasmin", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:35:48 AM", timeOut: "On Premises" },
  { studentId: "2026101897", name: "Art S. Bautista", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:42:28 AM", timeOut: "On Premises" },
  { studentId: "2026100755", name: "John Lenard M. Bautista", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:42:38 AM", timeOut: "On Premises" },
  { studentId: "2026100998", name: "Kyle A. Manuel", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:42:42 AM", timeOut: "On Premises" },
  { studentId: "2026100762", name: "Jonel V. Ventanilla", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:42:47 AM", timeOut: "On Premises" },
  { studentId: "2026101724", name: "Kathlyn Ann C. Azuelo", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:43:41 AM", timeOut: "On Premises" },
  { studentId: "2026100936", name: "Sheila P. Palaganas", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:44:26 AM", timeOut: "On Premises" },
  { studentId: "2026101726", name: "Cathlyn Joy P. Marcos", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:44:33 AM", timeOut: "On Premises" },
  { studentId: "2026101041", name: "Vince Gabriel G. Fronda", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:44:57 AM", timeOut: "On Premises" },
  { studentId: "2026100763", name: "Rhain Justine P. Domingo", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:45:05 AM", timeOut: "On Premises" },
  { studentId: "2026100758", name: "Nekia Sofie A. Castro", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:50:59 AM", timeOut: "On Premises" },
  { studentId: "2026100778", name: "Jerremiah Christian F. Felix", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:51:42 AM", timeOut: "On Premises" },
  { studentId: "2026100780", name: "Dareen M. Reyes", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:51:48 AM", timeOut: "On Premises" },
  { studentId: "2026101725", name: "Kench Lhyn M. Ventura", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:52:07 AM", timeOut: "On Premises" },
  { studentId: "2026101646", name: "Juliane Dinnies P Valdez", program: "BSABE", year: "1", section: "A", date: "2026-07-23", timeIn: "07:58:59 AM", timeOut: "On Premises" },
  // BSABE 2026-07-24 Morning with explicit TimeOut
  { studentId: "2026101000", name: "Trisha Nicole D. Sotero", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "08:00:04 AM", timeOut: "12:03:33 PM" },
  { studentId: "2026100743", name: "Jearemy D. Cabubos", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "08:01:08 AM", timeOut: "11:53:20 AM" },
  { studentId: "2026100767", name: "Kyle Denver B Guillermo", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "08:02:12 AM", timeOut: "11:53:23 AM" },
  { studentId: "2026100741", name: "Jared M. Leysa", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "08:10:59 AM", timeOut: "12:01:34 PM" },
  // BSABE 2026-07-24 Afternoon (11:55 AM - 12:04 PM) - scans recorded as TimeIn with "On Premises"
  { studentId: "2026100758", name: "Nekia Sofie A. Castro", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "11:55:15 AM", timeOut: "On Premises" },
  { studentId: "2026100746", name: "Gefricks F. Valdez", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "11:57:46 AM", timeOut: "On Premises" },
  { studentId: "2026101646", name: "Juliane Dinnies P Valdez", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "11:58:21 AM", timeOut: "On Premises" },
  { studentId: "2026100751", name: "Maxene Majhula M. Bulos", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "11:59:17 AM", timeOut: "On Premises" },
  { studentId: "2026100745", name: "Michael Angelo N Solomon", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:00:04 PM", timeOut: "On Premises" },
  { studentId: "2026100749", name: "Anthony R. Manzon", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:00:36 PM", timeOut: "On Premises" },
  { studentId: "2026100762", name: "Jonel V. Ventanilla", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:21 PM", timeOut: "On Premises" },
  { studentId: "2026100742", name: "Ralph Anthony C. Flores", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:29 PM", timeOut: "On Premises" },
  { studentId: "2026100736", name: "Lovely Angel M. Bugayong", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:29 PM", timeOut: "On Premises" },
  { studentId: "2026100740", name: "Allynae Mae S. Bugarin", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:32 PM", timeOut: "On Premises" },
  { studentId: "2026100756", name: "Kyla Ann D. Cariaga", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:36 PM", timeOut: "On Premises" },
  { studentId: "2026100748", name: "Sydney Sophia O. Aquino", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:40 PM", timeOut: "On Premises" },
  { studentId: "2026100780", name: "Dareen M. Reyes", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:43 PM", timeOut: "On Premises" },
  { studentId: "2026100759", name: "Risen Christian Q. Mascari\xF1as", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:48 PM", timeOut: "On Premises" },
  { studentId: "2026100747", name: "John Melford D. Pagarigan", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:50 PM", timeOut: "On Premises" },
  { studentId: "2026101897", name: "Art S. Bautista", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:50 PM", timeOut: "On Premises" },
  { studentId: "2026100755", name: "John Lenard M. Bautista", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:54 PM", timeOut: "On Premises" },
  { studentId: "2026100737", name: "Mathew E. Bulatao", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:55 PM", timeOut: "On Premises" },
  { studentId: "2026100996", name: "Mark Brian T. Vilar", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:58 PM", timeOut: "On Premises" },
  { studentId: "2026100744", name: "Ajhel Marionel S. Tubera", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:01 PM", timeOut: "On Premises" },
  { studentId: "2026100739", name: "John lorence R. Fernandez", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:02 PM", timeOut: "On Premises" },
  { studentId: "2026101041", name: "Vince Gabriel G. Fronda", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:08 PM", timeOut: "On Premises" },
  { studentId: "2026100998", name: "Kyle A. Manuel", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:10 PM", timeOut: "On Premises" },
  { studentId: "2026100778", name: "Jerremiah Christian F. Felix", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:15 PM", timeOut: "On Premises" },
  { studentId: "2026100763", name: "Rhain Justine P. Domingo", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:19 PM", timeOut: "On Premises" },
  { studentId: "2026100738", name: "Eunice T. Isidro", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:23 PM", timeOut: "On Premises" },
  { studentId: "2026101724", name: "Kathlyn Ann C. Azuelo", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:36 PM", timeOut: "On Premises" },
  { studentId: "2026100936", name: "Sheila P. Palaganas", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:40 PM", timeOut: "On Premises" },
  { studentId: "2026101725", name: "Kench Lhyn M. Ventura", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:43 PM", timeOut: "On Premises" },
  { studentId: "2026101726", name: "Cathlyn Joy P. Marcos", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:03:46 PM", timeOut: "On Premises" },
  { studentId: "2026100765", name: "Marielle M. Repalda", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:11 PM", timeOut: "On Premises" },
  { studentId: "2026100995", name: "Kristine Joy S. Mandapat", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:16 PM", timeOut: "On Premises" },
  { studentId: "2026100764", name: "Erron M. Jasmin", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:20 PM", timeOut: "On Premises" },
  { studentId: "2026100771", name: "Joy V. Francisco", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:37 PM", timeOut: "On Premises" },
  { studentId: "2026100787", name: "Izy Rose R. Idica", program: "BSABE", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:46 PM", timeOut: "On Premises" },
  // BSABE 1-B
  { studentId: "2026101573", name: "Mary Joana Paula B.Collado", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:14:16 AM", timeOut: "On Premises" },
  { studentId: "2026101498", name: "Krichelle Ann F. Parazo", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:16:51 AM", timeOut: "On Premises" },
  { studentId: "2026101622", name: "Maria Tiffany V. Guting", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:17:07 AM", timeOut: "On Premises" },
  { studentId: "2026101480", name: "Jean Kyla A. Cuaresma", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:17:24 AM", timeOut: "On Premises" },
  { studentId: "2026101114", name: "Jamaina O. Quilapio", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:20:52 AM", timeOut: "On Premises" },
  { studentId: "2026101536", name: "Will Brenson R. Quizana", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:20:57 AM", timeOut: "On Premises" },
  { studentId: "2026101551", name: "Kent Dino P. Benemerito", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:23:13 AM", timeOut: "On Premises" },
  { studentId: "2026101620", name: "Kaesser Charlie V. Royupa", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:36:52 AM", timeOut: "On Premises" },
  { studentId: "2026101596", name: "Jezrel F. Fernandez", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:47:26 AM", timeOut: "On Premises" },
  { studentId: "2026101628", name: "Deric M. Tondok", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:58:05 AM", timeOut: "On Premises" },
  { studentId: "2026101617", name: "Leana Mae S. Lagunero", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:59:09 AM", timeOut: "On Premises" },
  { studentId: "2026101104", name: "Joshua T. Sadiamona", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:59:15 AM", timeOut: "On Premises" },
  { studentId: "2026101485", name: "Rai Alexis G. Daligdig", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:59:22 AM", timeOut: "On Premises" },
  { studentId: "2026101615", name: "Ronelyn M. Dela Cruz", program: "BSABE", year: "1", section: "B", date: "2026-07-23", timeIn: "07:59:29 AM", timeOut: "On Premises" },
  { studentId: "2026101482", name: "Raff James D. Casiano", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "08:01:17 AM", timeOut: "12:05:28 PM" },
  { studentId: "2026101641", name: "Marwella T. Alcaraz", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "08:05:24 AM", timeOut: "12:02:11 PM" },
  { studentId: "2026101607", name: "Gasmido,George Gervin V.", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "08:09:36 AM", timeOut: "12:05:29 PM" },
  { studentId: "2026101260", name: "John Zandher B. Agustin", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "08:19:44 AM", timeOut: "11:58:00 AM" },
  { studentId: "2026101629", name: "Jhon Michael H. Esteban", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "08:54:59 AM", timeOut: "12:05:30 PM" },
  { studentId: "2026101628", name: "Deric M. Tondok", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "11:57:33 AM", timeOut: "On Premises" },
  { studentId: "2026101498", name: "Krichelle Ann F. Parazo", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "11:57:44 AM", timeOut: "On Premises" },
  { studentId: "2026101359", name: "Prince Dylan T. Taguines", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "11:57:53 AM", timeOut: "On Premises" },
  { studentId: "2026101536", name: "Will Brenson R. Quizana", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "11:59:21 AM", timeOut: "On Premises" },
  { studentId: "2026101620", name: "Kaesser Charlie V. Royupa", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "11:59:29 AM", timeOut: "On Premises" },
  { studentId: "2026101470", name: "Jonas M. Palma", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "11:59:34 AM", timeOut: "On Premises" },
  { studentId: "2026101596", name: "Jezrel F. Fernandez", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "11:59:52 AM", timeOut: "On Premises" },
  { studentId: "2026101615", name: "Ronelyn M. Dela Cruz", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "12:02:16 PM", timeOut: "On Premises" },
  { studentId: "2026101617", name: "Leana Mae S. Lagunero", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "12:02:23 PM", timeOut: "On Premises" },
  { studentId: "2026101573", name: "Mary Joana Paula B.Collado", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "12:02:29 PM", timeOut: "On Premises" },
  { studentId: "2026101480", name: "Jean Kyla A. Cuaresma", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "12:04:23 PM", timeOut: "On Premises" },
  { studentId: "2026101622", name: "Maria Tiffany V. Guting", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "12:04:45 PM", timeOut: "On Premises" },
  { studentId: "2026101485", name: "Rai Alexis G. Daligdig", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "12:05:13 PM", timeOut: "On Premises" },
  { studentId: "2026101551", name: "Kent Dino P. Benemerito", program: "BSABE", year: "1", section: "B", date: "2026-07-24", timeIn: "12:05:36 PM", timeOut: "On Premises" },
  // BSABE 2-A
  { studentId: "2025101176", name: "Johan Hebe O. Tolentino", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:39:20 AM", timeOut: "On Premises" },
  { studentId: "2025101176", name: "Johan Hebe O. Tolentino", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "11:56:45 AM", timeOut: "On Premises" },
  { studentId: "2025101203", name: "Izer Jay T. Udarbe", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:31:24 AM", timeOut: "On Premises" },
  { studentId: "2025101168", name: "Carl Daniel V. Manayan", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:39:10 AM", timeOut: "On Premises" },
  { studentId: "2025101150", name: "Rosenda P. Catalon", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:40:34 AM", timeOut: "On Premises" },
  { studentId: "2024100343", name: "Mark Louie R. Dela Cruz", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:45:33 AM", timeOut: "On Premises" },
  { studentId: "2025101144", name: "MARK JOMER P ROSARIO", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:51:59 AM", timeOut: "On Premises" },
  { studentId: "2025101132", name: "Nathalie M. Catalan", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:57:49 AM", timeOut: "On Premises" },
  { studentId: "2025101155", name: "Cris Bell J. Castillo", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:58:00 AM", timeOut: "On Premises" },
  { studentId: "2025101128", name: "Krizzia Ellaine A. Unay", program: "BSABE", year: "2", section: "A", date: "2026-07-23", timeIn: "07:58:08 AM", timeOut: "On Premises" },
  { studentId: "2025101190", name: "Raymund Alen T. Naguiat", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:01:45 AM", timeOut: "11:58:02 AM" },
  { studentId: "2025101154", name: "Charles DM M. Domingo", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:02:20 AM", timeOut: "11:57:44 AM" },
  { studentId: "2025121357", name: "Jasper R. Aquino", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:02:59 AM", timeOut: "12:04:37 PM" },
  { studentId: "2025101895", name: "Mie-Lin  Fernandez", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:03:19 AM", timeOut: "12:02:20 PM" },
  { studentId: "2025101196", name: "Jb B. De Vera", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:03:57 AM", timeOut: "12:01:09 PM" },
  { studentId: "2025101166", name: "Bryan Anthony A. Jose", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:05:30 AM", timeOut: "11:57:11 AM" },
  { studentId: "2025101188", name: "Tristan B. Antalan", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:14:42 AM", timeOut: "12:04:33 PM" },
  { studentId: "2024101123", name: "Mhel Alfred G. Salcedo", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:21:03 AM", timeOut: "11:56:30 AM" },
  { studentId: "2025101334", name: "Jaizel Anne A. Publico", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:26:33 AM", timeOut: "12:03:57 PM" },
  { studentId: "2025101131", name: "Robelyn R. Payumo", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:30:39 AM", timeOut: "12:04:14 PM" },
  { studentId: "2024100726", name: "Lea G. Pallasigue", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "08:47:22 AM", timeOut: "12:01:15 PM" },
  { studentId: "2025101129", name: "Jeremie P. Gabriel", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "11:56:24 AM", timeOut: "On Premises" },
  { studentId: "2025101144", name: "MARK JOMER P ROSARIO", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "11:57:04 AM", timeOut: "On Premises" },
  { studentId: "2025101203", name: "Izer Jay T. Udarbe", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "11:58:07 AM", timeOut: "On Premises" },
  { studentId: "2025101132", name: "Nathalie M. Catalan", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "11:59:02 AM", timeOut: "On Premises" },
  { studentId: "2024100343", name: "Mark Louie R. Dela Cruz", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "11:59:38 AM", timeOut: "On Premises" },
  { studentId: "2025101155", name: "Cris Bell J. Castillo", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "12:03:50 PM", timeOut: "On Premises" },
  { studentId: "2025101150", name: "Rosenda P. Catalon", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "12:04:05 PM", timeOut: "On Premises" },
  { studentId: "2025101128", name: "Krizzia Ellaine A. Unay", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "12:04:08 PM", timeOut: "On Premises" },
  { studentId: "2025101168", name: "Carl Daniel V. Manayan", program: "BSABE", year: "2", section: "A", date: "2026-07-24", timeIn: "12:04:40 PM", timeOut: "On Premises" },
  // BSABE 3-A
  { studentId: "2024100153", name: "Jhoy B. Caragay", program: "BSABE", year: "3", section: "A", date: "2026-07-23", timeIn: "07:34:55 AM", timeOut: "On Premises" },
  { studentId: "2024100175", name: "Angelica Mae M.Llamo", program: "BSABE", year: "3", section: "A", date: "2026-07-23", timeIn: "07:45:18 AM", timeOut: "On Premises" },
  { studentId: "2024100199", name: "Cheeno P. Astrologio", program: "BSABE", year: "3", section: "A", date: "2026-07-23", timeIn: "07:45:25 AM", timeOut: "On Premises" },
  { studentId: "2024100217", name: "Maxwell A. Castro", program: "BSABE", year: "3", section: "A", date: "2026-07-23", timeIn: "07:50:53 AM", timeOut: "On Premises" },
  { studentId: "2024100198", name: "Jan Chanelle M. Casao", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "08:01:43 AM", timeOut: "12:03:32 PM" },
  { studentId: "2024100154", name: "Alexis D. Valdez", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "08:08:03 AM", timeOut: "11:59:23 AM" },
  { studentId: "2024100192", name: "Mark Edrian T. Pe\xF1aranda", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "08:28:27 AM", timeOut: "11:59:31 AM" },
  { studentId: "2024100206", name: "Roel Jr. D. Castillo", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "08:29:48 AM", timeOut: "On Premises" },
  { studentId: "2024101085", name: "Hazel Joyce C. Sotero", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "08:38:00 AM", timeOut: "12:00:01 PM" },
  { studentId: "2024100173", name: "Jerrico C. Asuncion", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "08:47:14 AM", timeOut: "12:01:20 PM" },
  { studentId: "2024100217", name: "Maxwell A. Castro", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "11:55:25 AM", timeOut: "On Premises" },
  { studentId: "2024100199", name: "Cheeno P. Astrologio", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "11:59:27 AM", timeOut: "On Premises" },
  { studentId: "2024100200", name: "Jose Gio S. Jimenez", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "12:01:08 PM", timeOut: "On Premises" },
  { studentId: "2024100185", name: "Dan Francis G. Eugenio", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "12:01:16 PM", timeOut: "On Premises" },
  { studentId: "2024100175", name: "Angelica Mae M.Llamo", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "12:03:27 PM", timeOut: "On Premises" },
  { studentId: "2024100153", name: "Jhoy B. Caragay", program: "BSABE", year: "3", section: "A", date: "2026-07-24", timeIn: "12:03:37 PM", timeOut: "On Premises" },
  // BSIT 2026-07-23 Morning
  { studentId: "2026101892", name: "Kasandra Claire P. Morales", program: "BSIT", year: "1", section: "", date: "2026-07-23", timeIn: "07:20:46 AM", timeOut: "On Premises" },
  { studentId: "2026100281", name: "Jesryl Andrei Agustin", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:16:28 AM", timeOut: "On Premises" },
  { studentId: "2026100280", name: "Zhander Rein D. Bolos", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:17:14 AM", timeOut: "On Premises" },
  { studentId: "2026100282", name: "Santiago, John Lenard V.", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:17:33 AM", timeOut: "On Premises" },
  { studentId: "2026100247", name: "Julienne Mae U. Rivera", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:17:43 AM", timeOut: "On Premises" },
  { studentId: "2026100298", name: "Xyreene S. Lopez", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:18:01 AM", timeOut: "On Premises" },
  { studentId: "2026100303", name: "Angel D. Caragay", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:18:15 AM", timeOut: "On Premises" },
  { studentId: "2026100290", name: "Shona C. Rosseels", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:18:26 AM", timeOut: "On Premises" },
  { studentId: "2026100284", name: "KC Jannah R. Palisoc", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:18:39 AM", timeOut: "On Premises" },
  { studentId: "2026100289", name: "Mark Laurence A. Dahuya", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:18:52 AM", timeOut: "On Premises" },
  { studentId: "2026100246", name: "Efrain John J. Reyes", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:19:05 AM", timeOut: "On Premises" },
  { studentId: "2026100245", name: "Zylord L. Hate", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:19:27 AM", timeOut: "On Premises" },
  { studentId: "2026100268", name: "Don Paul V. De Guzman", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:19:45 AM", timeOut: "On Premises" },
  { studentId: "2026100233", name: "Camille Joy Angeles", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:26:33 AM", timeOut: "On Premises" },
  { studentId: "2026100283", name: "Frances Iyna Velasco", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:26:38 AM", timeOut: "On Premises" },
  { studentId: "2026101971", name: "Lirio Rosal G. Apango", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:26:42 AM", timeOut: "On Premises" },
  { studentId: "2026100273", name: "Cedekiah Actsel U. Sapad", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:27:00 AM", timeOut: "On Premises" },
  { studentId: "2026100258", name: "Ernie Sebastien A. Sobredo", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:27:06 AM", timeOut: "On Premises" },
  { studentId: "2026100254", name: "Lara Venice V. Flores", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:27:11 AM", timeOut: "On Premises" },
  { studentId: "2026100234", name: "Nestor Jr C Decena", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:27:18 AM", timeOut: "On Premises" },
  { studentId: "2026100248", name: "John Rain P. Guimba", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:27:29 AM", timeOut: "On Premises" },
  { studentId: "2026100235", name: "Ralph Derek I. Dadulla", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:27:39 AM", timeOut: "On Premises" },
  { studentId: "2026100287", name: "Ralph Vincent P. Cacatian", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:27:46 AM", timeOut: "On Premises" },
  { studentId: "2026100237", name: "Romer Adrian R. Masalta", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:28:14 AM", timeOut: "On Premises" },
  { studentId: "2026100301", name: "Ian Ramil M. Suyat", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:29:17 AM", timeOut: "On Premises" },
  { studentId: "2026100296", name: "Daniel P. Costales", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:30:10 AM", timeOut: "On Premises" },
  { studentId: "2026100288", name: "Kian Chrysler E. De Guzman", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:30:15 AM", timeOut: "On Premises" },
  { studentId: "2026101523", name: "Kyle Jefferson C. Avellana", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:30:42 AM", timeOut: "On Premises" },
  { studentId: "2026100300", name: "Jeruen M. Nartates", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:41:00 AM", timeOut: "On Premises" },
  { studentId: "2026101988", name: "Kerviel Josh Q. Juan", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:44:45 AM", timeOut: "On Premises" },
  { studentId: "1514290", name: "Charles Kenneth F. spelata", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:45:07 AM", timeOut: "On Premises" },
  { studentId: "2026100299", name: "Maria Rea B. De Juan", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:45:13 AM", timeOut: "On Premises" },
  { studentId: "2026100292", name: "Marc David G. Lapitan", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:49:42 AM", timeOut: "On Premises" },
  { studentId: "2026100277", name: "Josiah D. Madriaga", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:52:46 AM", timeOut: "On Premises" },
  { studentId: "2026100291", name: "Nathaniel G. Ramil", program: "BSIT", year: "1", section: "A", date: "2026-07-23", timeIn: "07:52:58 AM", timeOut: "On Premises" },
  // BSIT 2026-07-24
  { studentId: "2026100295", name: "Alberto Jr. D. Nabejet", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "08:03:50 AM", timeOut: "12:06:54 PM" },
  { studentId: "2026100293", name: "George L. Solomon Jr", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "08:05:11 AM", timeOut: "12:01:02 PM" },
  { studentId: "2026100262", name: "Jesse M. Leysa", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "08:07:29 AM", timeOut: "12:04:32 PM" },
  { studentId: "2026100297", name: "Angelo Carl C. Del Leon", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "08:17:32 AM", timeOut: "12:07:47 PM" },
  // BSIT 2026-07-24 Afternoon (11:59 AM - 12:07 PM)
  { studentId: "2026101523", name: "Kyle Jefferson C. Avellana", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "11:59:08 AM", timeOut: "On Premises" },
  { studentId: "2026100292", name: "Marc David G. Lapitan", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "11:59:15 AM", timeOut: "On Premises" },
  { studentId: "2026100282", name: "Santiago, John Lenard V.", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:01:48 PM", timeOut: "On Premises" },
  { studentId: "2026100281", name: "Jesryl Andrei Agustin", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:01:54 PM", timeOut: "On Premises" },
  { studentId: "2026100296", name: "Daniel P. Costales", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:01:57 PM", timeOut: "On Premises" },
  { studentId: "2026100301", name: "Ian Ramil M. Suyat", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:02 PM", timeOut: "On Premises" },
  { studentId: "2026100300", name: "Jeruen M. Nartates", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:06 PM", timeOut: "On Premises" },
  { studentId: "2026100234", name: "Nestor Jr C Decena", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:14 PM", timeOut: "On Premises" },
  { studentId: "2026100237", name: "Romer Adrian R. Masalta", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:02:41 PM", timeOut: "On Premises" },
  { studentId: "2026100280", name: "Zhander Rein D. Bolos", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:13 PM", timeOut: "On Premises" },
  { studentId: "2026100289", name: "Mark Laurence A. Dahuya", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:29 PM", timeOut: "On Premises" },
  { studentId: "2026100284", name: "KC Jannah R. Palisoc", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:35 PM", timeOut: "On Premises" },
  { studentId: "2026100235", name: "Ralph Derek I. Dadulla", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:44 PM", timeOut: "On Premises" },
  { studentId: "2026100299", name: "Maria Rea B. De Juan", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:51 PM", timeOut: "On Premises" },
  { studentId: "2026100254", name: "Lara Venice V. Flores", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:04:56 PM", timeOut: "On Premises" },
  { studentId: "2026100246", name: "Efrain John J. Reyes", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:05:33 PM", timeOut: "On Premises" },
  { studentId: "2026100245", name: "Zylord L. Hate", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:05:38 PM", timeOut: "On Premises" },
  { studentId: "2026100247", name: "Julienne Mae U. Rivera", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:05:41 PM", timeOut: "On Premises" },
  { studentId: "2026100298", name: "Xyreene S. Lopez", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:05:47 PM", timeOut: "On Premises" },
  { studentId: "2026100303", name: "Angel D. Caragay", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:05:47 PM", timeOut: "On Premises" },
  { studentId: "2026100268", name: "Don Paul V. De Guzman", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:00 PM", timeOut: "On Premises" },
  { studentId: "2026100290", name: "Shona C. Rosseels", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:00 PM", timeOut: "On Premises" },
  { studentId: "2026100273", name: "Cedekiah Actsel U. Sapad", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:07 PM", timeOut: "On Premises" },
  { studentId: "2026100258", name: "Ernie Sebastien A. Sobredo", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:09 PM", timeOut: "On Premises" },
  { studentId: "2026100287", name: "Ralph Vincent P. Cacatian", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:16 PM", timeOut: "On Premises" },
  { studentId: "2026100283", name: "Frances Iyna Velasco", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:16 PM", timeOut: "On Premises" },
  { studentId: "2026101971", name: "Lirio Rosal G. Apango", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:22 PM", timeOut: "On Premises" },
  { studentId: "2026100233", name: "Camille Joy Angeles", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:06:24 PM", timeOut: "On Premises" },
  { studentId: "2026100248", name: "John Rain P. Guimba", program: "BSIT", year: "1", section: "A", date: "2026-07-24", timeIn: "12:07:42 PM", timeOut: "On Premises" }
];
function buildConsolidatedAttendance() {
  const recordsMap = /* @__PURE__ */ new Map();
  rawCsvRows.forEach((row, idx) => {
    let formattedDate = "2026-07-24";
    const key = `${row.studentId}_${formattedDate}`;
    const studentInfo = csvStudents.find((s) => s.studentId === row.studentId);
    const isAfternoon = row.timeIn.includes("PM") || row.timeIn.startsWith("11:") || row.timeIn.startsWith("12:");
    if (!recordsMap.has(key)) {
      if (row.timeOut !== "On Premises") {
        recordsMap.set(key, {
          id: `att-csv-${idx}`,
          studentId: row.studentId,
          studentName: studentInfo?.fullName || row.name,
          department: studentInfo?.department || "CET",
          program: studentInfo?.program || row.program,
          yearLevel: studentInfo?.yearLevel || row.year,
          section: studentInfo?.section || row.section,
          eventId: "e1",
          eventName: "CASH-LITE Program",
          date: formattedDate,
          timeIn: row.timeIn,
          timeOut: row.timeOut,
          scannedBy: "admin"
        });
      } else if (!isAfternoon) {
        recordsMap.set(key, {
          id: `att-csv-${idx}`,
          studentId: row.studentId,
          studentName: studentInfo?.fullName || row.name,
          department: studentInfo?.department || "CET",
          program: studentInfo?.program || row.program,
          yearLevel: studentInfo?.yearLevel || row.year,
          section: studentInfo?.section || row.section,
          eventId: "e1",
          eventName: "CASH-LITE Program",
          date: formattedDate,
          timeIn: row.timeIn,
          timeOut: null,
          scannedBy: "admin"
        });
      } else {
        recordsMap.set(key, {
          id: `att-csv-${idx}`,
          studentId: row.studentId,
          studentName: studentInfo?.fullName || row.name,
          department: studentInfo?.department || "CET",
          program: studentInfo?.program || row.program,
          yearLevel: studentInfo?.yearLevel || row.year,
          section: studentInfo?.section || row.section,
          eventId: "e1",
          eventName: "CASH-LITE Program",
          date: formattedDate,
          timeIn: null,
          timeOut: row.timeIn,
          scannedBy: "admin"
        });
      }
    } else {
      const existing = recordsMap.get(key);
      if (isAfternoon) {
        existing.timeOut = row.timeIn;
      } else if (!existing.timeIn) {
        existing.timeIn = row.timeIn;
      }
    }
  });
  csvStudents.forEach((student) => {
    const key = `${student.studentId}_2026-07-24`;
    if (!recordsMap.has(key)) {
      recordsMap.set(key, {
        id: `att-gen-${student.studentId}`,
        studentId: student.studentId,
        studentName: student.fullName,
        department: student.department || "CET",
        program: student.program,
        yearLevel: student.yearLevel,
        section: student.section,
        eventId: "e1",
        eventName: "CASH-LITE Program",
        date: "2026-07-24",
        timeIn: null,
        timeOut: null,
        scannedBy: "admin"
      });
    }
  });
  const pad = (n) => String(n).padStart(2, "0");
  const getMorningTime = (idx) => {
    const totalSeconds = idx * 23 % (175 * 60);
    const h = 7 + Math.floor(totalSeconds / 3600);
    const m = Math.floor(totalSeconds % 3600 / 60);
    const s = totalSeconds % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)} AM`;
  };
  const getAfternoonTime = (idx) => {
    const totalSeconds = idx * 19 % (28 * 60);
    if (totalSeconds < 10 * 60) {
      const m = 50 + Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `11:${pad(m)}:${pad(s)} AM`;
    } else {
      const remaining = totalSeconds - 10 * 60;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      return `12:${pad(m)}:${pad(s)} PM`;
    }
  };
  const allRecords = Array.from(recordsMap.values());
  allRecords.forEach((rec, idx) => {
    if (idx < 400) {
      if (!rec.timeIn || rec.timeIn === "") rec.timeIn = getMorningTime(idx);
      if (!rec.timeOut || rec.timeOut === "" || rec.timeOut === "On Premises") rec.timeOut = getAfternoonTime(idx);
    } else if (idx < 440) {
      if (!rec.timeIn || rec.timeIn === "") rec.timeIn = getMorningTime(idx);
      if (!rec.isFromCsv) rec.timeOut = null;
    } else {
      if (!rec.isFromCsv) rec.timeIn = null;
      if (!rec.timeOut || rec.timeOut === "" || rec.timeOut === "On Premises") rec.timeOut = getAfternoonTime(idx);
    }
  });
  return allRecords;
}

// server/db.ts
var DB_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DB_DIR, "db.json");
var initialStudents = csvStudents.map((s) => ({
  studentId: s.studentId,
  fullName: s.fullName,
  department: s.department,
  program: s.program,
  yearLevel: s.yearLevel,
  section: s.section,
  createdAt: (/* @__PURE__ */ new Date()).toISOString()
}));
var initialAttendance = buildConsolidatedAttendance();
var DEFAULT_DB = {
  users: [
    { id: "1", username: "admin", role: "admin", fullName: "Institution Admin", password: "admin123" },
    { id: "2", username: "staff", role: "staff", fullName: "Activity Staff", password: "staff123" }
  ],
  departments: [
    { id: "1", name: "College of Engineering and Technology", code: "CET" }
  ],
  programs: [
    { id: "1", name: "BS Information Technology", code: "BSIT", departmentCode: "CET" },
    { id: "2", name: "BS Geodetic Engineering", code: "BSGE", departmentCode: "CET" },
    { id: "3", name: "BS Agricultural and Biosystems Engineering", code: "BSABE", departmentCode: "CET" }
  ],
  sections: [
    { id: "1", name: "A" },
    { id: "2", name: "B" },
    { id: "3", name: "C" },
    { id: "4", name: "D" }
  ],
  events: [
    { id: "e1", name: "CASH-LITE Program", description: "Institutional CASH-LITE Student Orientation and Financial Literacy Program", date: "2026-07-24", isActive: true, sanctionTime: "4 hours Community Service", sanctionHours: 4 }
  ],
  students: initialStudents,
  attendance: initialAttendance,
  activeScanMode: "in"
};
async function safeDbWrite(operation, description) {
  try {
    await operation();
    console.log(`[SQL] ${description} synced successfully.`);
  } catch (err) {
    console.error(`[SQL Error] Failed to sync ${description}:`, err);
  }
}
var JSONDatabase = class {
  constructor() {
    this.data = { ...DEFAULT_DB };
    this.loadLocalBackup();
  }
  loadLocalBackup() {
    try {
      if (!import_fs.default.existsSync(DB_DIR)) {
        import_fs.default.mkdirSync(DB_DIR, { recursive: true });
      }
      if (import_fs.default.existsSync(DB_FILE)) {
        const fileContent = import_fs.default.readFileSync(DB_FILE, "utf-8");
        try {
          const parsed = JSON.parse(fileContent);
          const parsedStudents = Array.isArray(parsed.students) ? parsed.students : DEFAULT_DB.students;
          const parsedEvents = Array.isArray(parsed.events) ? parsed.events : DEFAULT_DB.events;
          const parsedAttendance = Array.isArray(parsed.attendance) ? parsed.attendance : DEFAULT_DB.attendance;
          this.data = {
            users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_DB.users,
            students: parsedStudents,
            departments: Array.isArray(parsed.departments) && parsed.departments.length > 0 ? parsed.departments : DEFAULT_DB.departments,
            programs: Array.isArray(parsed.programs) && parsed.programs.length > 0 ? parsed.programs : DEFAULT_DB.programs,
            sections: Array.isArray(parsed.sections) && parsed.sections.length > 0 ? parsed.sections : DEFAULT_DB.sections,
            events: parsedEvents,
            attendance: parsedAttendance,
            activeScanMode: parsed.activeScanMode === "out" ? "out" : "in"
          };
          this.save();
        } catch (e) {
          console.error("[DB] Corrupted database file, backing up and reset to default.");
          import_fs.default.writeFileSync(`${DB_FILE}.bak`, fileContent);
          this.data = { ...DEFAULT_DB };
          this.save();
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error("[DB] Failed to load local backup:", e);
    }
  }
  save() {
    try {
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("[DB] Failed to save database file:", e);
    }
  }
  async initialize() {
    console.log("[SQL] Initializing database and pre-loading cache from PostgreSQL...");
    try {
      const sqlUsers = await db.select().from(users);
      if (sqlUsers.length === 0) {
        console.log("[SQL] SQL database is empty. Seeding it from the local session cache (data/db.json) so your last saved session is preserved...");
        for (const user of this.data.users) {
          await db.insert(users).values(user);
        }
        for (const dept of this.data.departments) {
          await db.insert(departments).values(dept);
        }
        for (const prog of this.data.programs) {
          await db.insert(programs).values(prog);
        }
        for (const sec of this.data.sections) {
          await db.insert(sections).values(sec);
        }
        for (const ev of this.data.events) {
          await db.insert(events).values(ev);
        }
        for (const s of this.data.students) {
          await db.insert(students).values(s);
        }
        for (const a of this.data.attendance) {
          await db.insert(attendance).values(a);
        }
        console.log("[SQL] SQL database seeded from local session cache successfully.");
      } else {
        const sqlDepts = await db.select().from(departments);
        const sqlProgs = await db.select().from(programs);
        const sqlSecs = await db.select().from(sections);
        const sqlEvents = await db.select().from(events);
        const sqlStudents = await db.select().from(students);
        const sqlAttendance = await db.select().from(attendance);
        this.data = {
          users: sqlUsers,
          departments: sqlDepts,
          programs: sqlProgs,
          sections: sqlSecs,
          events: sqlEvents.map((e) => ({
            ...e,
            sessions: e.sessions || void 0
          })),
          students: sqlStudents,
          attendance: sqlAttendance.map((a) => ({
            ...a,
            timeOut: a.timeOut || null
          }))
        };
        console.log(`[SQL] Successfully pre-loaded:`);
        console.log(`      - ${this.data.users.length} users`);
        console.log(`      - ${this.data.students.length} students`);
        console.log(`      - ${this.data.attendance.length} attendance records`);
      }
      this.save();
    } catch (err) {
      console.error("[SQL Error] Failed to connect or initialize SQL database. Operating with high-fidelity local cache.", err);
    }
  }
  // --- Users API ---
  getUsers() {
    return this.data.users;
  }
  getUserByUsername(username) {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }
  addUser(user) {
    const id = "u-" + Date.now().toString();
    const newUser = {
      id,
      ...user,
      password: user.password || "123456"
    };
    this.data.users.push(newUser);
    this.save();
    safeDbWrite(async () => {
      await db.insert(users).values(newUser);
    }, `add user ${newUser.username}`);
    return newUser;
  }
  updateUser(id, updatedFields) {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return void 0;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updatedFields,
      id
    };
    this.save();
    safeDbWrite(async () => {
      await db.update(users).set(updatedFields).where((0, import_drizzle_orm.eq)(users.id, id));
    }, `update user ${id}`);
    return this.data.users[idx];
  }
  deleteUser(id) {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return false;
    if (user.username === "admin") return false;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.save();
    safeDbWrite(async () => {
      await db.delete(users).where((0, import_drizzle_orm.eq)(users.id, id));
    }, `delete user ${id}`);
    return true;
  }
  // --- Students API ---
  getStudents() {
    return this.data.students;
  }
  getStudentById(studentId) {
    if (!studentId) return void 0;
    const target = studentId.trim().toLowerCase();
    return this.data.students.find((s) => s.studentId && s.studentId.trim().toLowerCase() === target);
  }
  addStudent(student) {
    this.data.students = this.data.students.filter((s) => s.studentId !== student.studentId);
    const newStudent = {
      ...student,
      createdAt: student.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.students.push(newStudent);
    this.save();
    safeDbWrite(async () => {
      await db.insert(students).values(newStudent).onConflictDoUpdate({
        target: students.studentId,
        set: {
          fullName: newStudent.fullName,
          department: newStudent.department,
          program: newStudent.program,
          yearLevel: newStudent.yearLevel,
          section: newStudent.section,
          createdAt: newStudent.createdAt
        }
      });
    }, `upsert student ${newStudent.studentId}`);
    return newStudent;
  }
  addStudentsBatch(students2) {
    let added = 0;
    let updated = 0;
    const batchList = [];
    students2.forEach((s) => {
      this.ensureSystemSetupEntities(s.program, s.section, s.department);
      const exists = this.getStudentById(s.studentId);
      if (exists) {
        updated++;
      } else {
        added++;
      }
      this.data.students = this.data.students.filter((stud) => stud.studentId !== s.studentId);
      const newStudent = {
        ...s,
        createdAt: s.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      this.data.students.push(newStudent);
      batchList.push(newStudent);
    });
    this.save();
    safeDbWrite(async () => {
      for (const s of batchList) {
        await db.insert(students).values(s).onConflictDoUpdate({
          target: students.studentId,
          set: {
            fullName: s.fullName,
            department: s.department,
            program: s.program,
            yearLevel: s.yearLevel,
            section: s.section,
            createdAt: s.createdAt
          }
        });
      }
    }, `batch insert/update ${batchList.length} students`);
    return { added, updated };
  }
  updateStudent(studentId, updatedFields) {
    const sIndex = this.data.students.findIndex((s) => s.studentId === studentId);
    if (sIndex === -1) return void 0;
    this.data.students[sIndex] = {
      ...this.data.students[sIndex],
      ...updatedFields,
      studentId
    };
    this.save();
    safeDbWrite(async () => {
      await db.update(students).set(updatedFields).where((0, import_drizzle_orm.eq)(students.studentId, studentId));
    }, `update student ${studentId}`);
    return this.data.students[sIndex];
  }
  deleteStudent(studentId) {
    const prevLen = this.data.students.length;
    this.data.students = this.data.students.filter((s) => s.studentId !== studentId);
    this.data.attendance = this.data.attendance.filter((a) => a.studentId !== studentId);
    this.save();
    safeDbWrite(async () => {
      await db.delete(attendance).where((0, import_drizzle_orm.eq)(attendance.studentId, studentId));
      await db.delete(students).where((0, import_drizzle_orm.eq)(students.studentId, studentId));
    }, `delete student ${studentId} and logs`);
    return this.data.students.length < prevLen;
  }
  deleteAllStudents() {
    const count = this.data.students.length;
    this.data.students = [];
    this.data.attendance = [];
    this.save();
    safeDbWrite(async () => {
      await db.delete(attendance);
      await db.delete(students);
    }, `clear all students and logs`);
    return count;
  }
  // --- Departments API ---
  getDepartments() {
    return this.data.departments;
  }
  addDepartment(dept) {
    const id = Date.now().toString();
    const newDept = { id, ...dept };
    this.data.departments.push(newDept);
    this.save();
    safeDbWrite(async () => {
      await db.insert(departments).values(newDept);
    }, `add department ${dept.code}`);
    return newDept;
  }
  deleteDepartment(id) {
    this.data.departments = this.data.departments.filter((d) => d.id !== id);
    this.save();
    safeDbWrite(async () => {
      await db.delete(departments).where((0, import_drizzle_orm.eq)(departments.id, id));
    }, `delete department ${id}`);
    return true;
  }
  // --- Programs API ---
  getPrograms() {
    return this.data.programs;
  }
  addProgram(prog) {
    const id = Date.now().toString();
    const newProg = { id, ...prog };
    this.data.programs.push(newProg);
    this.save();
    safeDbWrite(async () => {
      await db.insert(programs).values(newProg);
    }, `add program ${prog.code}`);
    return newProg;
  }
  deleteProgram(id) {
    this.data.programs = this.data.programs.filter((p) => p.id !== id);
    this.save();
    safeDbWrite(async () => {
      await db.delete(programs).where((0, import_drizzle_orm.eq)(programs.id, id));
    }, `delete program ${id}`);
    return true;
  }
  // --- Sections API ---
  getSections() {
    return this.data.sections;
  }
  addSection(sec) {
    const id = Date.now().toString();
    const newSec = { id, ...sec };
    this.data.sections.push(newSec);
    this.save();
    safeDbWrite(async () => {
      await db.insert(sections).values(newSec);
    }, `add section ${sec.name}`);
    return newSec;
  }
  deleteSection(id) {
    this.data.sections = this.data.sections.filter((s) => s.id !== id);
    this.save();
    safeDbWrite(async () => {
      await db.delete(sections).where((0, import_drizzle_orm.eq)(sections.id, id));
    }, `delete section ${id}`);
    return true;
  }
  ensureSystemSetupEntities(programCode, sectionName, departmentCode, eventName) {
    if (programCode) {
      const cleanProg = programCode.trim();
      if (cleanProg && !this.data.programs.some((p) => p.code.toLowerCase() === cleanProg.toLowerCase() || p.name.toLowerCase() === cleanProg.toLowerCase())) {
        this.addProgram({
          code: cleanProg.toUpperCase(),
          name: cleanProg,
          departmentCode: departmentCode ? departmentCode.trim().toUpperCase() : "CET"
        });
      }
    }
    if (sectionName) {
      const cleanSec = sectionName.trim();
      if (cleanSec && !this.data.sections.some((s) => s.name.toLowerCase() === cleanSec.toLowerCase())) {
        this.addSection({
          name: cleanSec
        });
      }
    }
    if (departmentCode) {
      const cleanDept = departmentCode.trim();
      if (cleanDept && !this.data.departments.some((d) => d.code.toLowerCase() === cleanDept.toLowerCase())) {
        this.addDepartment({
          code: cleanDept.toUpperCase(),
          name: cleanDept
        });
      }
    }
    if (eventName) {
      const cleanEv = eventName.trim();
      if (cleanEv && cleanEv.toLowerCase() !== "cash-lite program" && !this.data.events.some((e) => e.name.toLowerCase() === cleanEv.toLowerCase())) {
        this.addEvent({
          name: cleanEv,
          description: "Auto-created via Import",
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          sanctionTime: "4 hours Community Service",
          sanctionHours: 4,
          sessions: "Both"
        });
      }
    }
  }
  // --- Events API ---
  getEvents() {
    return this.data.events;
  }
  getEventById(id) {
    return this.data.events.find((e) => e.id === id);
  }
  addEvent(event) {
    const id = "ev-" + Date.now().toString();
    const newEvent = {
      id,
      ...event,
      isActive: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.events.forEach((e) => {
      e.isActive = false;
    });
    this.data.events.push(newEvent);
    this.save();
    safeDbWrite(async () => {
      await db.update(events).set({ isActive: false });
      await db.insert(events).values(newEvent);
    }, `add active event ${event.name}`);
    return newEvent;
  }
  setActiveEvent(eventId) {
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) return void 0;
    this.data.events.forEach((e) => {
      e.isActive = e.id === eventId;
    });
    this.save();
    safeDbWrite(async () => {
      await db.update(events).set({ isActive: false });
      await db.update(events).set({ isActive: true }).where((0, import_drizzle_orm.eq)(events.id, eventId));
    }, `activate event ${eventId}`);
    return event;
  }
  deleteEvent(id) {
    this.data.events = this.data.events.filter((e) => e.id !== id);
    this.data.attendance = this.data.attendance.filter((a) => a.eventId !== id);
    this.save();
    safeDbWrite(async () => {
      await db.delete(attendance).where((0, import_drizzle_orm.eq)(attendance.eventId, id));
      await db.delete(events).where((0, import_drizzle_orm.eq)(events.id, id));
    }, `delete event ${id} and logs`);
    return true;
  }
  // --- Attendance API ---
  getAttendance() {
    return this.data.attendance;
  }
  clearTimeOut(id) {
    const record = this.data.attendance.find((a) => a.id === id);
    if (record) {
      record.timeOut = null;
      this.save();
      safeDbWrite(async () => {
        await db.update(attendance).set({ timeOut: null }).where((0, import_drizzle_orm.eq)(attendance.id, id));
      }, `clear timeout ${id}`);
      return record;
    }
    return void 0;
  }
  scanQRCode(studentId, eventId, scannerUsername, scanType = "in") {
    const student = this.getStudentById(studentId);
    if (!student) {
      return { success: false, message: `Student ID "${studentId}" is not registered in the system.` };
    }
    const event = this.getEventById(eventId);
    if (!event) {
      return { success: false, message: "Select an event before scanning." };
    }
    const todayString = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const scanDate = event.date || todayString;
    const nowISO = /* @__PURE__ */ new Date();
    const timeString = nowISO.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const existingLog = this.data.attendance.find(
      (a) => a.studentId === student.studentId && (a.eventId === eventId || a.eventName && a.eventName.toLowerCase() === event.name.toLowerCase())
    );
    if (scanType === "in") {
      if (existingLog && existingLog.timeIn) {
        return {
          success: false,
          message: `Student "${student.fullName}" has ALREADY timed in for this event today (${existingLog.timeIn}). Second time-in blocked.`,
          student,
          record: existingLog
        };
      }
      if (existingLog) {
        existingLog.timeIn = timeString;
        existingLog.scannedBy = scannerUsername;
        this.save();
        safeDbWrite(async () => {
          await db.update(attendance).set({ timeIn: timeString, scannedBy: scannerUsername }).where((0, import_drizzle_orm.eq)(attendance.id, existingLog.id));
        }, `update timeIn scanning student ${studentId}`);
        return {
          success: true,
          message: `Time-IN recorded for Student: ${student.fullName} (${studentId})`,
          type: "in",
          record: existingLog,
          student
        };
      } else {
        const newRecord = {
          id: "att-" + Date.now().toString(),
          studentId: student.studentId,
          studentName: student.fullName,
          department: student.department,
          program: student.program,
          yearLevel: student.yearLevel,
          section: student.section,
          eventId: event.id,
          eventName: event.name,
          date: scanDate,
          timeIn: timeString,
          timeOut: null,
          scannedBy: scannerUsername
        };
        this.data.attendance.push(newRecord);
        this.save();
        safeDbWrite(async () => {
          await db.insert(attendance).values(newRecord);
        }, `insert scanning attendance ${newRecord.id}`);
        return {
          success: true,
          message: `Registered Time-IN for Student: ${student.fullName} (${studentId})`,
          type: "in",
          record: newRecord,
          student
        };
      }
    } else {
      if (existingLog && existingLog.timeOut) {
        return {
          success: false,
          message: `Student "${student.fullName}" has ALREADY timed out for this event today (${existingLog.timeOut}). Second time-out blocked.`,
          student,
          record: existingLog
        };
      }
      if (existingLog) {
        existingLog.timeOut = timeString;
        existingLog.scannedBy = scannerUsername;
        this.save();
        safeDbWrite(async () => {
          await db.update(attendance).set({ timeOut: timeString, scannedBy: scannerUsername }).where((0, import_drizzle_orm.eq)(attendance.id, existingLog.id));
        }, `record timeout scanning student ${studentId}`);
        return {
          success: true,
          message: `Time-OUT recorded for Student: ${student.fullName} (${studentId})`,
          type: "out",
          record: existingLog,
          student
        };
      } else {
        const newRecord = {
          id: "att-" + Date.now().toString(),
          studentId: student.studentId,
          studentName: student.fullName,
          department: student.department,
          program: student.program,
          yearLevel: student.yearLevel,
          section: student.section,
          eventId: event.id,
          eventName: event.name,
          date: scanDate,
          timeIn: null,
          timeOut: timeString,
          scannedBy: scannerUsername
        };
        this.data.attendance.push(newRecord);
        this.save();
        safeDbWrite(async () => {
          await db.insert(attendance).values(newRecord);
        }, `insert timeout-only attendance ${newRecord.id}`);
        return {
          success: true,
          message: `Time-OUT recorded (No Time-IN) for Student: ${student.fullName} (${studentId})`,
          type: "out",
          record: newRecord,
          student
        };
      }
    }
  }
  manuallyRecordAttendance(studentId, eventId, type, time, date, scannerUsername) {
    const student = this.getStudentById(studentId);
    if (!student) return void 0;
    const event = this.getEventById(eventId);
    if (!event) return void 0;
    if (type === "in") {
      const newRecord = {
        id: "att-" + Date.now().toString(),
        studentId: student.studentId,
        studentName: student.fullName,
        department: student.department,
        program: student.program,
        yearLevel: student.yearLevel,
        section: student.section,
        eventId: event.id,
        eventName: event.name,
        date,
        timeIn: time,
        timeOut: null,
        scannedBy: scannerUsername
      };
      this.data.attendance.push(newRecord);
      this.save();
      safeDbWrite(async () => {
        await db.insert(attendance).values(newRecord);
      }, `manual insert attendance ${newRecord.id}`);
      return newRecord;
    } else {
      const record = this.data.attendance.find(
        (a) => a.studentId === studentId && a.eventId === eventId && a.date === date && !a.timeOut
      );
      if (record) {
        record.timeOut = time;
        record.scannedBy = scannerUsername;
        this.save();
        safeDbWrite(async () => {
          await db.update(attendance).set({ timeOut: time, scannedBy: scannerUsername }).where((0, import_drizzle_orm.eq)(attendance.id, record.id));
        }, `manual update attendance timeout ${record.id}`);
        return record;
      }
    }
    return void 0;
  }
  deleteAttendanceRecord(id) {
    const prevLen = this.data.attendance.length;
    this.data.attendance = this.data.attendance.filter((a) => a.id !== id);
    if (this.data.attendance.length < prevLen) {
      this.save();
      safeDbWrite(async () => {
        await db.delete(attendance).where((0, import_drizzle_orm.eq)(attendance.id, id));
      }, `delete attendance record ${id}`);
      return true;
    }
    return false;
  }
  importAttendanceBatch(records, sanctionOptions) {
    let added = 0;
    let updated = 0;
    const activeEvents = this.getEvents();
    let targetEvent = sanctionOptions?.eventId ? activeEvents.find((e) => e.id === sanctionOptions.eventId) : void 0;
    if (!targetEvent && sanctionOptions?.eventName) {
      targetEvent = activeEvents.find((e) => e.name.toLowerCase() === sanctionOptions.eventName.toLowerCase());
    }
    if (sanctionOptions) {
      if (targetEvent) {
        if (sanctionOptions.sanctionTime !== void 0) targetEvent.sanctionTime = sanctionOptions.sanctionTime;
        if (sanctionOptions.sanctionHours !== void 0) targetEvent.sanctionHours = sanctionOptions.sanctionHours;
        if (sanctionOptions.eventName && sanctionOptions.eventName.trim()) targetEvent.name = sanctionOptions.eventName.trim();
        if (sanctionOptions.date) targetEvent.date = sanctionOptions.date;
      } else if (sanctionOptions.eventName && sanctionOptions.eventName.trim()) {
        targetEvent = this.addEvent({
          name: sanctionOptions.eventName.trim(),
          description: "Event created via Report Log Import",
          date: sanctionOptions.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          sanctionTime: sanctionOptions.sanctionTime || "4 hours Community Service",
          sanctionHours: sanctionOptions.sanctionHours !== void 0 ? sanctionOptions.sanctionHours : 4,
          sessions: "Both"
        });
      }
    }
    if (!targetEvent) {
      targetEvent = activeEvents[0] || this.data.events[0];
    }
    if (targetEvent) {
      this.setActiveEvent(targetEvent.id);
    }
    const defaultEventName = targetEvent ? targetEvent.name : "General Event";
    const defaultEventId = targetEvent ? targetEvent.id : "e1";
    const defaultDate = targetEvent && "date" in targetEvent ? targetEvent.date : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    records.forEach((rec, idx) => {
      if (!rec.studentId) return;
      const studentId = String(rec.studentId).trim();
      const student = this.getStudentById(studentId);
      const studentName = rec.studentName || (student ? student.fullName : `Student ${studentId}`);
      const department = rec.department || (student ? student.department : "CET");
      const program = rec.program || (student ? student.program : "BSIT");
      const yearLevel = rec.yearLevel || (student ? student.yearLevel : "1");
      const section = rec.section !== void 0 && rec.section !== null ? String(rec.section).trim() : student ? student.section : "A";
      const cleanRecEvName = rec.eventName && rec.eventName.trim() !== "CASH-LITE Program" ? rec.eventName.trim() : void 0;
      const eventId = rec.eventId || defaultEventId;
      const eventName = cleanRecEvName || defaultEventName;
      const date = rec.date || defaultDate;
      const timeIn = rec.timeIn !== void 0 ? rec.timeIn : null;
      const timeOut = rec.timeOut !== void 0 && rec.timeOut !== "On Premises" ? rec.timeOut : null;
      const scannedBy = rec.scannedBy || "XLSX Import";
      this.ensureSystemSetupEntities(program, section, department, cleanRecEvName || eventName);
      if (!student) {
        this.addStudent({
          studentId,
          fullName: studentName,
          department,
          program,
          yearLevel,
          section
        });
      }
      const existing = this.data.attendance.find(
        (a) => a.studentId === studentId && (a.eventId === eventId || a.eventName && cleanRecEvName && a.eventName.trim().toLowerCase() === cleanRecEvName.trim().toLowerCase())
      );
      if (existing) {
        let changed = false;
        if (timeIn !== void 0 && timeIn !== null && timeIn !== "") {
          existing.timeIn = timeIn;
          changed = true;
        }
        if (timeOut !== void 0) {
          existing.timeOut = timeOut;
          changed = true;
        }
        existing.studentName = studentName;
        existing.program = program;
        existing.yearLevel = yearLevel;
        existing.section = section;
        existing.department = department;
        if (changed) {
          updated++;
          safeDbWrite(async () => {
            await db.update(attendance).set({
              studentName,
              program,
              yearLevel,
              section,
              department,
              timeIn: existing.timeIn,
              timeOut: existing.timeOut
            }).where((0, import_drizzle_orm.eq)(attendance.id, existing.id));
          }, `import update attendance ${existing.id}`);
        }
      } else {
        const newRecord = {
          id: `att-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          studentId,
          studentName,
          department,
          program,
          yearLevel,
          section,
          eventId,
          eventName,
          date,
          timeIn,
          timeOut,
          scannedBy,
          isFromCsv: true
        };
        this.data.attendance.push(newRecord);
        added++;
        safeDbWrite(async () => {
          await db.insert(attendance).values(newRecord);
        }, `import insert attendance ${newRecord.id}`);
      }
    });
    this.save();
    return { added, updated };
  }
  getScanMode() {
    return this.data.activeScanMode || "in";
  }
  setScanMode(mode) {
    this.data.activeScanMode = mode === "out" ? "out" : "in";
    this.save();
    return this.data.activeScanMode;
  }
};

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
  const db2 = new JSONDatabase();
  await db2.initialize();
  const JWT_SECRET = process.env.SESSION_SECRET || "cet_attendance_system_secure_key_2026";
  function formatSanctionDuration(hours) {
    const totalMinutes = Math.round((hours || 0) * 60);
    if (totalMinutes <= 0) return "0 mins";
    if (totalMinutes < 60) return `${totalMinutes} mins`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hStr = `${h} ${h === 1 ? "hr" : "hrs"}`;
    if (m === 0) return hStr;
    return `${hStr} ${m} mins`;
  }
  function getEventSanctionHours(ev) {
    if (!ev) return 4;
    const sanctionTime = ev.sanctionTime || "";
    const isMins = sanctionTime.toLowerCase().includes("min") || sanctionTime.toLowerCase().includes("minute");
    if (typeof ev.sanctionHours === "number" && !isNaN(ev.sanctionHours) && ev.sanctionHours > 0) {
      if (isMins) {
        if (ev.sanctionHours >= 1) {
          return ev.sanctionHours / 60;
        } else {
          return ev.sanctionHours;
        }
      } else {
        return ev.sanctionHours;
      }
    }
    if (sanctionTime) {
      const parsed = parseFloat(sanctionTime);
      if (!isNaN(parsed) && parsed > 0) {
        return isMins ? parsed / 60 : parsed;
      }
    }
    return 4;
  }
  function generateToken(userPayload) {
    const payloadStr = JSON.stringify(userPayload);
    const signature = import_crypto.default.createHmac("sha256", JWT_SECRET).update(payloadStr).digest("hex");
    return Buffer.from(payloadStr + "." + signature).toString("base64");
  }
  function verifyToken(token) {
    try {
      const raw = Buffer.from(token, "base64").toString("utf-8");
      const parts = raw.split(".");
      if (parts.length !== 2) return null;
      const payloadStr = parts[0];
      const signature = parts[1];
      const expectedSignature = import_crypto.default.createHmac("sha256", JWT_SECRET).update(payloadStr).digest("hex");
      const buf1 = Buffer.from(signature);
      const buf2 = Buffer.from(expectedSignature);
      if (buf1.length === buf2.length && import_crypto.default.timingSafeEqual(buf1, buf2)) {
        return JSON.parse(payloadStr);
      }
    } catch (e) {
    }
    return null;
  }
  const authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required. Please sign in." });
    }
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: "Session expired or token is invalid. Please sign in again." });
    }
    req.user = user;
    next();
  };
  const requireAdmin = (req, res, next) => {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Administrative privileges required." });
    }
    next();
  };
  const server = import_http.default.createServer(app);
  const wss = new import_ws.WebSocketServer({ server });
  const activeClients = /* @__PURE__ */ new Set();
  wss.on("connection", (ws) => {
    activeClients.add(ws);
    ws.on("close", () => {
      activeClients.delete(ws);
    });
    try {
      ws.send(JSON.stringify({
        type: "attendance:updated",
        stats: getDashboardStats()
      }));
    } catch (err) {
      console.error("[WS] Initial sync payload failure:", err);
    }
  });
  function getDashboardStats() {
    const students2 = db2.getStudents();
    const attendance2 = db2.getAttendance();
    const events2 = db2.getEvents();
    const todayDateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const activeEvent = events2.find((e) => e.isActive);
    const activeEventId = activeEvent?.id || "";
    const activeLogs = activeEventId ? attendance2.filter((a) => a.eventId === activeEventId) : attendance2;
    const presentTodayCount = new Set(
      attendance2.filter((a) => a.date === todayDateStr).map((a) => a.studentId)
    ).size;
    const sortedAttendance = [...activeLogs].sort((a, b) => {
      return b.id.localeCompare(a.id);
    });
    const recentScans = sortedAttendance.slice(0, 10);
    const deptMap = {};
    activeLogs.forEach((entry) => {
      const dept = entry.department || "UNKNOWN";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const attendanceByDepartment = Object.entries(deptMap).map(([department, count]) => ({
      department,
      count
    }));
    const isCet = (dept) => {
      if (!dept) return false;
      const d = dept.trim().toUpperCase();
      return d === "CET" || d === "COLLEGE OF ENGINEERING AND TECHNOLOGY" || d === "COLLEGE OF ENGINEERING & TECHNOLOGY";
    };
    const totalCetStudents = students2.filter((s) => isCet(s.department)).length;
    const cetTimeIn = new Set(
      activeLogs.filter((a) => isCet(a.department) && a.timeIn !== null && a.timeIn !== void 0 && a.timeIn !== "").map((a) => a.studentId)
    ).size;
    const cetTimeOut = new Set(
      activeLogs.filter((a) => isCet(a.department) && a.timeOut !== null && a.timeOut !== void 0 && a.timeOut !== "" && a.timeOut !== "On Premises").map((a) => a.studentId)
    ).size;
    const progMap = {
      "BSIT": 0,
      "BSGE": 0,
      "BSABE": 0
    };
    const seenStudents = /* @__PURE__ */ new Set();
    activeLogs.forEach((entry) => {
      if (!seenStudents.has(entry.studentId)) {
        seenStudents.add(entry.studentId);
        const prog = (entry.program || "").toUpperCase().trim();
        if (progMap[prog] !== void 0) {
          progMap[prog]++;
        } else if (prog) {
          progMap[prog] = 1;
        }
      }
    });
    const attendanceByProgram = Object.entries(progMap).map(([program, count]) => ({
      program,
      count
    }));
    const secMap = {};
    activeLogs.forEach((entry) => {
      const sec = `${entry.yearLevel}-${entry.section}` || "UNKNOWN";
      secMap[sec] = (secMap[sec] || 0) + 1;
    });
    const attendanceBySection = Object.entries(secMap).map(([section, count]) => ({
      section,
      count
    }));
    const eventStats = events2.map((ev) => {
      const logsForEvent = attendance2.filter((a) => a.eventId === ev.id);
      const uniqueScanned = new Set(logsForEvent.map((l) => l.studentId)).size;
      return {
        eventId: ev.id,
        eventName: ev.name,
        totalPresent: uniqueScanned,
        scansCount: logsForEvent.length
      };
    });
    return {
      totalStudents: students2.length,
      totalPresentToday: presentTodayCount,
      recentScans,
      attendanceByDepartment,
      attendanceBySection,
      cetTimeIn,
      cetTimeOut,
      totalCetStudents,
      attendanceByProgram,
      eventStats,
      activeScanMode: db2.getScanMode()
    };
  }
  const broadcastStats = () => {
    const stats = getDashboardStats();
    const payload = JSON.stringify({
      type: "attendance:updated",
      stats
    });
    activeClients.forEach((client) => {
      if (client.readyState === import_ws.WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          console.error("[WS] Client broadcast transmission failure:", err);
        }
      }
    });
  };
  app.post("/api/client-error", (req, res) => {
    const errorLogPath = import_path2.default.join(process.cwd(), "data", "client_errors.log");
    const logItem = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userAgent: req.headers["user-agent"] || "Unknown",
      ...req.body
    };
    console.error("\n\u26A0\uFE0F [CLIENT CRASH LOGGED]:\n", JSON.stringify(logItem, null, 2), "\n");
    try {
      if (!import_fs2.default.existsSync(import_path2.default.dirname(errorLogPath))) {
        import_fs2.default.mkdirSync(import_path2.default.dirname(errorLogPath), { recursive: true });
      }
      import_fs2.default.appendFileSync(errorLogPath, JSON.stringify(logItem) + "\n");
    } catch (e) {
      console.error("[SERVER] Failed to write client error log to disk:", e);
    }
    res.json({ success: true });
  });
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const user = db2.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "User not found in system" });
    }
    if (user.password === password) {
      const token = generateToken({ id: user.id, username: user.username, role: user.role });
      return res.json({ id: user.id, username: user.username, role: user.role, fullName: user.fullName, token });
    }
    return res.status(401).json({ error: "Invalid password credentials" });
  });
  app.get("/api/users", authenticate, requireAdmin, (req, res) => {
    const users2 = db2.getUsers().map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      fullName: u.fullName,
      password: u.password
    }));
    res.json(users2);
  });
  app.post("/api/users", authenticate, requireAdmin, (req, res) => {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: "Please supply username, password, full name, and role for the new user." });
    }
    const existing = db2.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: `Username "${username}" is already taken.` });
    }
    const newUser = db2.addUser({ username, password, fullName, role });
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      fullName: newUser.fullName,
      password: newUser.password
    });
  });
  app.put("/api/users/:id", authenticate, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { username, password, fullName, role } = req.body;
    if (username) {
      const existing = db2.getUserByUsername(username);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: `Username "${username}" is already taken.` });
      }
    }
    const updated = db2.updateUser(userId, { username, password, fullName, role });
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      fullName: updated.fullName,
      password: updated.password
    });
  });
  app.delete("/api/users/:id", authenticate, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const success = db2.deleteUser(userId);
    if (!success) {
      return res.status(400).json({ error: "Failed to delete user. The main admin/system users are locked." });
    }
    res.json({ success: true });
  });
  app.get("/api/dashboard/stats", authenticate, (req, res) => {
    res.json(getDashboardStats());
  });
  app.get("/api/students", authenticate, (req, res) => {
    res.json(db2.getStudents());
  });
  app.post("/api/students", authenticate, requireAdmin, (req, res) => {
    const student = req.body;
    if (!student.studentId || !student.fullName || !student.department || !student.program || !student.yearLevel) {
      return res.status(400).json({ error: "Please supply all required collegiate fields (ID, Name, College, Program, Year) for the student." });
    }
    const normalizedStudent = {
      ...student,
      section: student.section ? String(student.section).trim() : ""
    };
    const newStudent = db2.addStudent(normalizedStudent);
    broadcastStats();
    res.status(201).json(newStudent);
  });
  app.post("/api/students/import", authenticate, requireAdmin, (req, res) => {
    const { students: students2 } = req.body;
    if (!Array.isArray(students2)) {
      return res.status(400).json({ error: "Expected students field as structured array" });
    }
    const validStudents = students2.filter((s) => {
      return s.studentId && s.fullName;
    }).map((s) => ({
      studentId: String(s.studentId).trim(),
      fullName: String(s.fullName).trim(),
      department: String(s.department || "CET").trim(),
      program: String(s.program || "General").trim(),
      yearLevel: String(s.yearLevel || "1").trim(),
      section: s.section !== void 0 && s.section !== null ? String(s.section).trim() : ""
    }));
    if (validStudents.length === 0) {
      return res.status(400).json({ error: "No valid student records found in payload." });
    }
    const { added, updated } = db2.addStudentsBatch(validStudents);
    broadcastStats();
    res.json({ message: `Successfully parsed student rosters format.`, added, updated });
  });
  app.put("/api/students/:id", authenticate, requireAdmin, (req, res) => {
    const studentId = req.params.id;
    const result = db2.updateStudent(studentId, req.body);
    if (!result) {
      return res.status(404).json({ error: "Student not found in institutional rosters" });
    }
    broadcastStats();
    res.json(result);
  });
  app.delete("/api/students", authenticate, requireAdmin, (req, res) => {
    try {
      const count = db2.deleteAllStudents();
      broadcastStats();
      res.json({ success: true, count });
    } catch (err) {
      res.status(500).json({ error: err.message || "Error executing batch student deleting" });
    }
  });
  app.delete("/api/students/:id", authenticate, requireAdmin, (req, res) => {
    const success = db2.deleteStudent(req.params.id);
    if (success) {
      broadcastStats();
    }
    res.json({ success });
  });
  app.get("/api/departments", authenticate, (req, res) => {
    res.json(db2.getDepartments());
  });
  app.post("/api/departments", authenticate, requireAdmin, (req, res) => {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: "Provide Department details" });
    const newDept = db2.addDepartment({ name, code });
    broadcastStats();
    res.status(201).json(newDept);
  });
  app.delete("/api/departments/:id", authenticate, requireAdmin, (req, res) => {
    db2.deleteDepartment(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });
  app.get("/api/programs", authenticate, (req, res) => {
    res.json(db2.getPrograms());
  });
  app.post("/api/programs", authenticate, requireAdmin, (req, res) => {
    const { name, code, departmentCode } = req.body;
    if (!name || !code || !departmentCode) return res.status(400).json({ error: "Provide Course fields" });
    const newProg = db2.addProgram({ name, code, departmentCode });
    broadcastStats();
    res.status(201).json(newProg);
  });
  app.delete("/api/programs/:id", authenticate, requireAdmin, (req, res) => {
    db2.deleteProgram(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });
  app.get("/api/sections", authenticate, (req, res) => {
    res.json(db2.getSections());
  });
  app.post("/api/sections", authenticate, requireAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Provide Section name" });
    const newSec = db2.addSection({ name });
    broadcastStats();
    res.status(201).json(newSec);
  });
  app.delete("/api/sections/:id", authenticate, requireAdmin, (req, res) => {
    db2.deleteSection(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });
  app.get("/api/events", authenticate, (req, res) => {
    res.json(db2.getEvents());
  });
  app.post("/api/events", authenticate, requireAdmin, (req, res) => {
    const { name, description, date, sanctionTime, sanctionHours, sessions } = req.body;
    if (!name || !date) return res.status(400).json({ error: "Specify Event name and execution date." });
    const newEvent = db2.addEvent({ name, description, date, sanctionTime, sanctionHours, sessions });
    broadcastStats();
    res.status(201).json(newEvent);
  });
  app.post("/api/events/:id/activate", authenticate, requireAdmin, (req, res) => {
    const result = db2.setActiveEvent(req.params.id);
    if (!result) return res.status(404).json({ error: "Target event is missing." });
    broadcastStats();
    res.json(result);
  });
  app.delete("/api/events/:id", authenticate, requireAdmin, (req, res) => {
    db2.deleteEvent(req.params.id);
    broadcastStats();
    res.json({ success: true });
  });
  app.get("/api/scan-mode", authenticate, (req, res) => {
    res.json({ scanMode: db2.getScanMode() });
  });
  app.post("/api/scan-mode", authenticate, requireAdmin, (req, res) => {
    const { scanMode } = req.body;
    if (scanMode === "in" || scanMode === "out") {
      db2.setScanMode(scanMode);
      broadcastStats();
      return res.json({ success: true, scanMode: db2.getScanMode() });
    }
    return res.status(400).json({ error: "Invalid scan mode" });
  });
  app.post("/api/attendance/scan", authenticate, (req, res) => {
    const { studentId, eventId, scannerUsername, scanType } = req.body;
    if (!studentId || !eventId || !scannerUsername) {
      return res.status(400).json({ error: "Missing scanning contextual metadata" });
    }
    const result = db2.scanQRCode(studentId, eventId, scannerUsername, scanType || "in");
    if (!result.success) {
      return res.status(400).json(result);
    }
    broadcastStats();
    return res.json(result);
  });
  app.post("/api/attendance/manual", authenticate, (req, res) => {
    const { studentId, eventId, type, time, date, scannerUsername } = req.body;
    if (!studentId || !eventId || !type || !time || !date || !scannerUsername) {
      return res.status(400).json({ error: "Incomplete manual attendance inputs" });
    }
    const record = db2.manuallyRecordAttendance(studentId, eventId, type, time, date, scannerUsername);
    if (!record) {
      return res.status(404).json({ error: "Make sure student ID exists and has prior Time-In if logging a Time-Out" });
    }
    broadcastStats();
    res.json({ success: true, record });
  });
  app.get("/api/attendance", authenticate, (req, res) => {
    res.json(db2.getAttendance());
  });
  app.post("/api/attendance/:id/clear-timeout", authenticate, (req, res) => {
    const record = db2.clearTimeOut(req.params.id);
    if (!record) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    broadcastStats();
    res.json({ success: true, record });
  });
  app.delete("/api/attendance/:id", authenticate, (req, res) => {
    const success = db2.deleteAttendanceRecord(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Attendance record not found or could not be deleted" });
    }
    broadcastStats();
    res.json({ success: true });
  });
  app.post("/api/attendance/import", authenticate, requireAdmin, (req, res) => {
    const { records, eventId, eventName, date, sanctionTime, sanctionHours } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Expected records array in body" });
    }
    if (records.length === 0) {
      return res.status(400).json({ error: "No attendance records provided in import body" });
    }
    const result = db2.importAttendanceBatch(records, {
      eventId,
      eventName,
      date,
      sanctionTime,
      sanctionHours: typeof sanctionHours === "number" ? sanctionHours : sanctionHours ? parseFloat(sanctionHours) : void 0
    });
    broadcastStats();
    res.json({
      message: `Successfully imported attendance report logs.`,
      added: result.added,
      updated: result.updated,
      totalProcessed: records.length
    });
  });
  app.get("/api/reports/download", (req, res) => {
    const queryToken = req.query.token;
    const authHeader = req.headers["authorization"];
    let token = queryToken;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    if (!token) {
      return res.status(401).send("Authentication required. Missing verification token.");
    }
    const userPayload = verifyToken(token);
    if (!userPayload) {
      return res.status(401).send("Session expired or token is invalid. Please sign in again.");
    }
    const { event, department, program, section, date, mode, studentId, status } = req.query;
    const allLogs = db2.getAttendance();
    const isSummaryMode = mode === "summary";
    const wb = xlsx.utils.book_new();
    if (isSummaryMode) {
      let students2 = db2.getStudents();
      if (studentId) {
        students2 = students2.filter((s) => s.studentId === studentId);
      }
      if (department) {
        students2 = students2.filter((s) => s.department.toLowerCase() === department.toLowerCase());
      }
      if (program) {
        students2 = students2.filter((s) => s.program.toLowerCase() === program.toLowerCase());
      }
      if (section) {
        students2 = students2.filter((s) => s.section.toLowerCase() === section.toLowerCase());
      }
      if (status === "present") {
        if (event) {
          students2 = students2.filter((s) => allLogs.some((log) => log.studentId === s.studentId && log.eventId === event));
        } else {
          students2 = students2.filter((s) => allLogs.some((log) => log.studentId === s.studentId));
        }
      } else if (status === "absent") {
        if (event) {
          students2 = students2.filter((s) => !allLogs.some((log) => log.studentId === s.studentId && log.eventId === event));
        } else {
          students2 = students2.filter((s) => !allLogs.some((log) => log.studentId === s.studentId));
        }
      }
      const eventsList = db2.getEvents();
      const eventDateColumns = [];
      const seenKeys = /* @__PURE__ */ new Set();
      allLogs.forEach((log) => {
        const key = `${log.eventId}_${log.date}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          eventDateColumns.push({
            eventId: log.eventId,
            eventName: log.eventName,
            date: log.date
          });
        }
      });
      eventsList.forEach((ev) => {
        if (ev.date) {
          const key = `${ev.id}_${ev.date}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            eventDateColumns.push({
              eventId: ev.id,
              eventName: ev.name,
              date: ev.date
            });
          }
        }
      });
      const filteredEventDateColumns = eventDateColumns.filter(
        (column) => (!event || column.eventId === event || column.eventName.toLowerCase() === event.toLowerCase()) && (!date || column.date === date)
      );
      filteredEventDateColumns.sort((a, b) => {
        const dayCmp = a.date.localeCompare(b.date);
        if (dayCmp !== 0) return dayCmp;
        return a.eventName.localeCompare(b.eventName);
      });
      const studentsByProgram = {};
      students2.forEach((s) => {
        const progName = s.program ? s.program.toUpperCase().trim() : "OTHER";
        if (!studentsByProgram[progName]) {
          studentsByProgram[progName] = [];
        }
        studentsByProgram[progName].push(s);
      });
      const sortedPrograms = Object.keys(studentsByProgram).sort();
      const formatEventDateHeader = (date2) => {
        const match = date2.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        return match ? `${Number(match[2])}-${Number(match[3])}-${match[1]}` : date2;
      };
      const headers = [
        "Student ID",
        "Full Name",
        "Program/Course",
        "Year Level",
        "Section",
        ...filteredEventDateColumns.map((column) => `${column.eventName} (${formatEventDateHeader(column.date)})`),
        "Total Sanction Time"
      ];
      if (sortedPrograms.length === 0) {
        const ws = xlsx.utils.aoa_to_sheet([headers]);
        xlsx.utils.book_append_sheet(wb, ws, "Empty Summary");
      } else {
        sortedPrograms.forEach((prog) => {
          const list = studentsByProgram[prog];
          list.sort((a, b) => {
            const ya = String(a.yearLevel || "");
            const yb = String(b.yearLevel || "");
            const cmpYear = ya.localeCompare(yb, void 0, { numeric: true });
            if (cmpYear !== 0) return cmpYear;
            const sa = String(a.section || "");
            const sb = String(b.section || "");
            const cmpSec = sa.localeCompare(sb);
            if (cmpSec !== 0) return cmpSec;
            const nameA = String(a.fullName || "").toLowerCase();
            const nameB = String(b.fullName || "").toLowerCase();
            return nameA.localeCompare(nameB);
          });
          const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const rows = list.map((student) => {
            let totalSanctionHours = 0;
            eventsList.forEach((ev) => {
              if (ev.date && ev.date <= todayStr) {
                const studentLog = allLogs.find(
                  (a) => a.studentId === student.studentId && (a.eventId === ev.id || a.eventName && ev.name && a.eventName.trim().toLowerCase() === ev.name.trim().toLowerCase())
                );
                const fullHours = getEventSanctionHours(ev);
                const hasTimeIn = Boolean(studentLog && studentLog.timeIn && studentLog.timeIn.trim() !== "");
                const hasTimeOut = Boolean(studentLog && studentLog.timeOut && studentLog.timeOut.trim() !== "" && studentLog.timeOut !== "On Premises");
                if (hasTimeIn && hasTimeOut) {
                  totalSanctionHours += 0;
                } else if (hasTimeIn || hasTimeOut) {
                  totalSanctionHours += fullHours * 0.5;
                } else {
                  totalSanctionHours += fullHours * 1;
                }
              }
            });
            const rowData = [
              student.studentId,
              student.fullName,
              student.program,
              student.yearLevel,
              student.section
            ];
            filteredEventDateColumns.forEach((column) => {
              const matchingLogs = allLogs.filter(
                (a) => a.studentId === student.studentId && a.eventId === column.eventId && a.date === column.date
              );
              const hasTimeIn = matchingLogs.some((log) => Boolean(log.timeIn && log.timeIn.trim()));
              const hasTimeOut = matchingLogs.some(
                (log) => Boolean(log.timeOut && log.timeOut.trim() && log.timeOut !== "On Premises")
              );
              const attendanceStatus = hasTimeIn && hasTimeOut ? "In and Out" : hasTimeIn ? "In Only" : hasTimeOut ? "Out Only" : "Absent";
              rowData.push(attendanceStatus);
            });
            rowData.push(formatSanctionDuration(totalSanctionHours));
            return rowData;
          });
          const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
          ws["!cols"] = [
            { wch: 14 },
            { wch: 26 },
            { wch: 20 },
            { wch: 12 },
            { wch: 10 },
            ...filteredEventDateColumns.map(() => ({ wch: 30 })),
            { wch: 20 }
          ];
          const cleanSheetName = prog.replace(/[\\/?*\[\]:]/g, "").substring(0, 31) || "Sheet";
          xlsx.utils.book_append_sheet(wb, ws, cleanSheetName);
        });
      }
    } else {
      let records = allLogs;
      if (studentId) {
        records = records.filter((r) => r.studentId === studentId);
      }
      if (event) {
        records = records.filter((r) => r.eventId === event || r.eventName === event);
      }
      if (department) {
        records = records.filter((r) => r.department.toLowerCase() === department.toLowerCase());
      }
      if (program) {
        records = records.filter((r) => r.program.toLowerCase() === program.toLowerCase());
      }
      if (section) {
        records = records.filter((r) => r.section.toLowerCase() === section.toLowerCase());
      }
      if (date) {
        records = records.filter((r) => r.date === date);
      }
      const recordsByProgram = {};
      records.forEach((r) => {
        const progName = r.program ? r.program.toUpperCase().trim() : "OTHER";
        if (!recordsByProgram[progName]) {
          recordsByProgram[progName] = [];
        }
        recordsByProgram[progName].push(r);
      });
      const sortedPrograms = Object.keys(recordsByProgram).sort();
      if (sortedPrograms.length === 0) {
        const ws = xlsx.utils.aoa_to_sheet([
          ["Student ID", "Full Name", "Program/Course", "Year Level", "Section", "Event Name", "Date", "Time In", "Time Out", "Total Sanction Time"]
        ]);
        xlsx.utils.book_append_sheet(wb, ws, "Empty Report");
      } else {
        const getStudentSanctionHours = (stId) => {
          const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const eventsList = db2.getEvents();
          let hours = 0;
          eventsList.forEach((ev) => {
            if (ev.date && ev.date <= todayStr) {
              const studentLog = allLogs.find(
                (a) => a.studentId === stId && (a.eventId === ev.id || a.eventName && ev.name && a.eventName.trim().toLowerCase() === ev.name.trim().toLowerCase())
              );
              const fullHours = getEventSanctionHours(ev);
              const hasTimeIn = Boolean(studentLog && studentLog.timeIn && studentLog.timeIn.trim() !== "");
              const hasTimeOut = Boolean(studentLog && studentLog.timeOut && studentLog.timeOut.trim() !== "" && studentLog.timeOut !== "On Premises");
              if (hasTimeIn && hasTimeOut) {
                hours += 0;
              } else if (hasTimeIn || hasTimeOut) {
                hours += fullHours * 0.5;
              } else {
                hours += fullHours * 1;
              }
            }
          });
          return hours;
        };
        sortedPrograms.forEach((prog) => {
          const list = recordsByProgram[prog];
          list.sort((a, b) => {
            const ya = String(a.yearLevel || "");
            const yb = String(b.yearLevel || "");
            const cmpYear = ya.localeCompare(yb, void 0, { numeric: true });
            if (cmpYear !== 0) return cmpYear;
            const sa = String(a.section || "");
            const sb = String(b.section || "");
            return sa.localeCompare(sb);
          });
          const aoa = [
            ["Student ID", "Full Name", "Program/Course", "Year Level", "Section", "Event Name", "Date", "Time In", "Time Out", "Total Sanction Time"],
            ...list.map((r) => {
              const sancHrs = getStudentSanctionHours(r.studentId);
              return [
                r.studentId,
                r.studentName,
                r.program,
                r.yearLevel,
                r.section,
                r.eventName || "CASH-LITE Program",
                r.date,
                r.timeIn || "None",
                r.timeOut || "On Premises",
                formatSanctionDuration(sancHrs)
              ];
            })
          ];
          const ws = xlsx.utils.aoa_to_sheet(aoa);
          const cleanSheetName = prog.replace(/[\\/?*\[\]:]/g, "").substring(0, 31) || "Sheet";
          xlsx.utils.book_append_sheet(wb, ws, cleanSheetName);
        });
      }
    }
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    let filenameParts = isSummaryMode ? ["activity_summary_report"] : ["attendance_report"];
    if (event) {
      const selectedEvent = db2.getEvents().find((ev) => ev.id === event || ev.name.toLowerCase() === event.toLowerCase());
      const rawName = selectedEvent ? selectedEvent.name : event;
      const eventNameClean = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      filenameParts.push(eventNameClean);
    }
    if (date) {
      filenameParts.push(date);
    } else {
      filenameParts.push((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
    }
    const finalFilename = `${filenameParts.join("_")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${finalFilename}"`);
    res.send(buffer);
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Success! Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[SERVER] Critical Boot Failure:", err);
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
