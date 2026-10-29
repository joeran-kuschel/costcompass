CREATE TYPE "public"."category" AS ENUM('housing', 'insurance', 'appliances', 'food', 'mobility');--> statement-breakpoint
CREATE TYPE "public"."recurring_interval" AS ENUM('monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" "category" NOT NULL,
	"business" boolean DEFAULT false NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" "category" NOT NULL,
	"business" boolean DEFAULT false NOT NULL,
	"interval" "recurring_interval" NOT NULL,
	"due_month" integer
);
