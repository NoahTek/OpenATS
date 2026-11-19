---
title: Manage Clients and Departments
sidebar_label: Manage Clients
description: Manage client companies, configure their departments, brand profiles, time zones, and view client-specific careers pages in OpenATS.
keywords: [client management, recruitment agency, client departments, client careers page, OpenATS clients]
---

# Manage Clients and Departments

If you use OpenATS as a recruitment agency or manage hiring for multiple distinct companies or business units, you can create and manage them as **Clients**.

## Why use Clients?

Clients allow you to:
- Group jobs and departments under specific client organizations.
- Brand each client with their own logo, description, website, contact info, and time zone.
- Host distinct, client-branded careers pages at `/careers/clients/:slug`.
- Filter jobs and applications in your dashboard by client.

## Create a Client

You need the **Super Admin** or **Hiring Manager** role to create and manage clients.

1. In the sidebar, select **Clients**.
2. Select **Create Client** (or navigate to `/clients/new`).
3. Fill in the client details:
   - **Name**: The client company's display name.
   - **Slug**: Unique URL identifier used for public careers pages (e.g. `acme-corp`).
   - **Contact Email**, **Phone**, and **Website**: Client contact details.
   - **Time Zone**: The IANA time zone for scheduling interviews and dates for this client.
   - **Description** & **Address**: Optional background info.
   - **Logo**: Upload a brand logo for the client.
4. Select **Save Client**.

## Add Client Departments

Departments are configured per-client so that organizational structures remain clean and separate:

1. Open a client from the **Clients** list.
2. Under the **Departments** panel, select **Add Department**.
3. Enter the department name (e.g., `Engineering`, `Product`, `Sales`).
4. Select **Add**.

When creating a new job, selecting this client will display only its associated departments in the department dropdown.

## Client Careers Pages

OpenATS automatically provides a dedicated public careers page for each client at:

```text
https://your-domain.com/careers/clients/<client-slug>
```

This page displays the client's branding, logo, and active published jobs associated with that client.
