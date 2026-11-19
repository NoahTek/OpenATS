---
sidebar_position: 1
title: Set Up Your Company
sidebar_label: Set Up Your Company
description: Sign in to OpenATS for the first time, add your company profile, logo and time zone, and create the departments your jobs will belong to.
keywords: [OpenATS setup, ATS company profile, first login, recruitment software setup]
---

# Set Up Your Company

This is the first thing to do in a new OpenATS installation. It only takes a few minutes, and the rest of the dashboard stays locked until you've done it.

## Sign in for the first time

Open OpenATS and sign in with your email and password.

- **If you set OpenATS up yourself**, use the Super Admin you created at the end of `make setup` (or with `make admin`).
- **If someone else set it up**, a Super Admin creates your account. You either receive an email with a link to choose your password, or they give you a password directly.

There are no default credentials, and nobody can sign themselves up. If you have forgotten your password, select **Forgot password?** on the sign-in page. How accounts, roles and passwords work is explained in [Sign-in and users](../administration/authentication).

## Complete the required company setup

After your first successful sign-in, OpenATS sends you to **Settings > General**. This is required setup, not an optional profile page. You cannot continue to the rest of the dashboard until you save your organization profile.

The setup gate checks that:

1. A company profile exists with a name and valid contact email.

Only **Settings > General** remains available until this profile is saved.

### Enter the company profile

{/* SCREENSHOT: company-setup/company-profile.png - Settings > General with the Company Profile form filled in */}

In the **Company Profile** section, complete the required fields:

- **Company Name**: the organization name used throughout OpenATS.
- **Contact Email**: a valid email address for company contact and public hiring information.

The following fields are optional, but adding them gives your careers page and job listings more useful information:

- **Website**: include the full URL, such as `https://example.com`.
- **Phone**: the company contact number.
- **Address**: the company or hiring office address.
- **Tagline**: a short description shown on the careers page. It accepts up to 500 characters.
- **Company Logo**: upload a PNG, JPG, WebP, GIF, or SVG file up to 5 MB.
- **Company time zone**: interview times and other dates in emails to candidates are written in this time zone. It starts on your browser's own zone; check it is where your company works, such as `Asia/Colombo`.

Select **Create** when the profile is new, or **Save** when updating an existing profile. Once the profile is saved, the setup gate is cleared and OpenATS takes you to the dashboard.

## Turn on AI CV analysis (optional)

You'll also see an **AI CV analysis** switch on this page. It's off by default, and you can safely leave it that way. If you're thinking of turning it on, read [what it does](./jobs-and-candidates#ai-analysis-optional) first, because it sends CVs to Google Gemini.

## If you are redirected again

Being sent back to **Settings > General** means the required setup check is still incomplete:

- The company profile was not saved successfully.
- The company name or contact email is missing or invalid.
- The session is connected to a different database than the one where setup was completed.

## Next step

Your company is set up. Now [add your team](./users-and-roles).
