# AGENTS.md

# NexusFlow

**Tagline:** Where Projects, People, and Progress Connect.

---

# Product Overview

NexusFlow is a modern enterprise-grade Project Lifecycle Management System (PLMS) that centralizes project planning, execution, resource management, utilization tracking, billing, risk management, document management, workflow approvals, and executive reporting.

The platform serves as the operational hub for organizations by connecting projects, resources, finances, risks, approvals, and documentation into a single unified system.

---

# Product Vision

Build the operating system for project delivery.

NexusFlow should provide complete visibility into:

* Projects
* Resources
* Utilization
* Risks
* Billing
* Approvals
* Documentation
* Executive Reporting

The platform should help organizations improve visibility, reduce manual effort, automate workflows, optimize resource utilization, and improve project outcomes.

---

# Target Users

## PMO

Responsible for:

* Portfolio oversight
* Governance
* Reporting
* Project health monitoring

---

## Project Managers

Responsible for:

* Planning
* Execution
* Milestones
* Team coordination
* Risk tracking

---

## Resource Managers

Responsible for:

* Resource allocation
* Capacity planning
* Skills management
* Utilization monitoring

---

## Finance Team

Responsible for:

* Billing
* Cost analysis
* Revenue tracking
* Invoicing

---

## Executive Leadership

Responsible for:

* Portfolio visibility
* Strategic decisions
* Revenue insights
* Risk visibility

---

## Team Members

Responsible for:

* Timesheets
* Task updates
* Document collaboration
* Project execution

---

# Product Modules

## Dashboard

Executive overview containing:

* Total Projects
* Active Projects
* Delayed Projects
* Open Risks
* Resource Utilization
* Revenue
* Pending Approvals
* Resource Availability

Features:

* KPI Cards
* Analytics (Recharts-based visualizations)
* Activity Feed
* Project Health Indicators
* Revenue Trends
* Utilization Trends

---

## Project Management

Features:

* Project Creation
* Project Tracking
* Milestones
* Timelines
* Budget Tracking
* Project Closure
* Status Management

Lifecycle:

Initiation
→ Planning
→ Execution
→ Monitoring
→ Closure

---

## Resource Management

Features:

* Employee Directory
* Skills Matrix
* Department Mapping
* Availability Tracking
* Capacity Management
* Bench Management

---

## Resource Allocation

Features:

* Calendar Allocation
* Workload Planning
* Capacity Analysis
* Conflict Detection
* Resource Forecasting

---

## Utilization Tracking

Features:

* Billable Hours
* Non-Billable Hours
* Utilization Percentage
* Department Utilization
* Productivity Metrics

---

## Billing Management

Features:

* Billing Rates
* Invoice Generation
* Revenue Analytics
* Cost Tracking
* Profitability Analysis
* Payment Tracking

---

## Risk Management

Features:

* Risk Register
* Risk Scoring
* Severity Analysis
* Impact Analysis
* Mitigation Planning
* Risk Heatmaps

---

## Document Management

Features:

* Folder Structure
* File Upload
* Version Control
* File Preview
* Search
* Permissions

Supported Documents:

* BRD
* SRS
* Contracts
* Design Files
* Invoices
* Test Reports

---

## Workflow Approvals

Workflow Example:

Draft
→ Manager Review
→ PMO Review
→ Finance Review
→ Approved

Features:

* Approval History
* Comments
* Audit Logs
* Workflow Tracking
* Notifications

---

## Reports & Analytics

Reports:

* Project Reports
* Resource Reports
* Utilization Reports
* Billing Reports
* Risk Reports
* Executive Reports

Exports:

* PDF
* Excel
* CSV

---

# Technology Stack

## Frontend

* Next.js 15 (App Router, React 19)
* TypeScript
* Tailwind CSS v4 (via PostCSS plugin integration)
* shadcn/ui
* Lucide React (Icons)
* Recharts (Data Visualization)
* React Hook Form
* Zod (Validation schemas)

---

## Backend (Target / Future)

* NestJS / Node.js or Next.js Route Handlers
* REST APIs / Server Actions

---

## Database

* PostgreSQL

---

## Storage

* AWS S3 / Cloud Storage

---

## Authentication

* JWT / Clerk / Next-Auth
* SSO Ready

---

# Design References

Use inspiration from:

* Linear
* Stripe Dashboard
* Jira
* Monday.com
* Notion
* Power BI
* Vercel
* ServiceNow

DO NOT clone any single product.

Combine the best parts of each platform into a unique NexusFlow experience.

---

# Design System

## Theme

Obsidian + Copper Gold

Colors:

* Sidebar: #111111 (Obsidian Dark)
* Primary: #C67C4E (Copper)
* Accent: #D4A373 (Gold)
* Background: #FAFAF9 (Warm Gray)
* Card: #FFFFFF (White)
* Text Primary: #1C1917 (Stone-900)
* Text Secondary: #78716C (Stone-500)
* Border: #E7E5E4 (Stone-200)
* Success: #22C55E (Green)
* Warning: #F59E0B (Amber)
* Danger: #EF4444 / #EF4444 (Red)

---

# UI & UX Standards

## Production-Level UI

Every screen must look like a real enterprise SaaS product.

The UI should feel suitable for:

* Fortune 500 companies
* PMOs
* Consulting firms
* Technology organizations
* Enterprise operations teams

Avoid:

* Student project designs
* Generic admin templates
* Excessive gradients
* Empty layouts
* Oversized icons
* Decorative-only dashboards
* Color-heavy interfaces
* Dribbble-style concepts without functionality

---

## Dashboard Standards

Dashboards must provide actionable business insights.

Include:

* KPIs
* Trends
* Analytics
* Filters
* Status Indicators
* Drill-down Actions

Avoid dashboards that contain only charts.

---

## Enterprise Tables

All tables should support:

* Search
* Filters
* Sorting
* Pagination
* Bulk Actions
* Column Visibility
* Row Actions

Tables are core business components.

---

## Forms

Forms must include:

* Validation
* Clear hierarchy
* Helpful descriptions
* Error handling
* Accessibility

Use multi-step forms when needed.

---

## Navigation

Must include:

* Sidebar Navigation (`AppShell` with Next.js Active Link states)
* Breadcrumbs
* Global Search
* Notifications
* User Menu

Navigation should be predictable and scalable.

---

## Component Standards

Create reusable components:

* KPI Cards
* Data Tables
* Charts
* Timelines
* Status Badges
* Progress Indicators
* Drawers
* Modals
* Forms
* Upload Components

Avoid duplicate implementations.

---

# Engineering Principles

## Code Quality

* Write clean, maintainable code.
* Follow Next.js best practices (App Router structures, Client vs. Server Components).
* Use strict TypeScript.
* Prefer composition over duplication.
* Keep components reusable.
* Use meaningful naming conventions.
* Follow SOLID principles where appropriate.

---

## File Creation Policy

DO NOT create unnecessary files.

Before creating a new file:

1. Check if a similar file exists.
2. Reuse existing components whenever possible.
3. Extend existing functionality before creating new files.

Avoid:

* Duplicate components
* Unused utility files
* Placeholder files
* Unnecessary abstractions

Only create files required for the requested feature.

---

## Performance

Optimize for:

* Fast page loads
* Small bundle sizes
* Minimal client-side JavaScript
* Efficient rendering

Guidelines:

* Prefer Server Components where interactivity is not required
* Use Client Components (`"use client"`) only when state, context, or browser APIs (like Recharts, event listeners) are needed
* Avoid unnecessary re-renders
* Use dynamic imports (`next/dynamic`) for heavy client modules
* Optimize images and assets

---

## Data Fetching

Use:

* React Server Components (RSC) for initial page data fetches
* standard `fetch` with Next.js tag-based or time-based caching
* Server Actions or Route Handlers for data mutations

Requirements:

* Proper caching
* Loading states (`loading.tsx`)
* Error handling (`error.tsx`)
* Optimistic updates where useful

Avoid duplicate API calls.

---

## State Management

Use:

* React state / Context for local and subtree UI state
* Zustand (if needed) for global state
* URL search parameters for filter and navigation states

Avoid unnecessary global state.

---

## Validation

Use:

* Zod
* React Hook Form

Validate:

* Forms
* API payloads
* Query parameters

---

## Security

Follow secure coding practices.

Requirements:

* RBAC (Role-Based Access Control)
* Input validation
* Authorization checks
* Secure API design
* Protection of sensitive data

---

## Scalability

Build for long-term growth.

Keep:

* Business logic separate from UI
* Feature-based architecture
* Reusable modules
* Extensible APIs

Avoid tightly coupled implementations.

---

# Folder Structure Philosophy

Maintain a clean and minimal structure.

Goals:

* Easy navigation
* Low complexity
* High maintainability
* Reusable architecture

Do not generate unnecessary folders.

Do not create deep nested structures without justification.

Keep the codebase organized and scalable:
* `src/app/` — routes, page layouts, groups, loading/error pages.
* `src/components/` — reusable layout, UI primitives (radix, shadcn), and dashboard components.
* `src/lib/` — helpers, hooks, models, mock data.

---

# AI Agent Rules

Before implementing any feature:

1. Understand existing architecture.
2. Reuse existing components.
3. Minimize file creation.
4. Follow design system standards.
5. Follow NexusFlow business rules.
6. Keep implementations optimized.
7. Ensure responsiveness.
8. Ensure accessibility.
9. Ensure production readiness.

---

# Future AI Assistant

## Nexo

Nexo is the intelligent assistant inside NexusFlow.

Capabilities:

* Project health analysis
* Risk prediction
* Resource recommendations
* Executive summaries
* Approval insights
* Portfolio intelligence

Example:

User:
Which projects are likely to miss deadlines?

Nexo:
Project Alpha, Project Mercury, and Project Orion have elevated risk due to resource shortages and pending approvals.

---

# Success Criteria

* Improved project visibility
* Centralized documentation
* Better resource utilization
* Reduced manual effort
* Automated billing
* Faster approvals
* Improved reporting
* Proactive risk management

---

# Golden Rule

Build the simplest, cleanest, most maintainable, and most scalable solution possible.

Every implementation should be:

* Production Ready
* Enterprise Grade
* Optimized
* Reusable
* Accessible
* Performant

If a Fortune 500 company would not confidently use the feature in production, refine it until it meets that standard.
