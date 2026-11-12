# Puja Readiness Portal User Guide

This guide explains how to use the Puja Readiness Portal to maintain the ghat
register, record readiness inspections, and review outstanding actions.

## Sign in

1. Open the portal in your browser. The home page takes you to the sign-in
   screen.
2. Enter the username and password provided by your administrator.
3. Select **Sign in**. If your session expires, sign in again.

If you cannot sign in, check your username and password with an administrator.
Usernames are case-insensitive.

## Navigate the portal

After signing in, use the header to open:

- **Dashboard** — an overview of registered ghats, inspections, pending
  deficiencies, and blocks covered.
- **Ghats** — the ghat register and readiness inspections.
- **Action Taken Report** — inspection coverage and actions that are pending
  or rectified.
- **Change password** — update your own password.
- **Users** — available to administrators for managing accounts.

Select **Sign out** when you are finished.

## Maintain the ghat register

1. Open **Ghats** and select **Add Ghat**.
2. Enter the ghat name, select its waterbody type, sub-division, and block.
   The district is provided by the portal.
3. If a Nodal Officer is required, enable that option and enter the officer's
   name and contact details.
4. Select **Save ghat**.

Use the search field to find ghats by name, district, or officer. To change a
record, open its actions menu and select **Edit**. Deleting a ghat also
permanently deletes its inspection history, so confirm the correct record
before proceeding.

## Record or update an inspection

1. In **Ghats**, open the actions menu for the relevant ghat and choose the
   inspection action.
2. Select the festival or occasion and enter the period from and to dates.
3. Enter the ghat's latitude and longitude, or use the location button if
   location access is available in your browser.
4. Assess each readiness area:
   - Approach roads and pathways
   - Ghat lighting and backup power
   - Crowd management
   - Safety
   - Police and women police deployment
   - CCTV and public address
   - Rescue team
   - Drinking water and sanitation
   - Women's changing facilities and signage
   - Emergency response
   - Cleanliness and upkeep
5. Mark each area **Ready**, **Pending**, or **Not applicable**. For a Pending
   item, describe the deficiency. When recording a rectified item, mark it as
   rectified and provide the action taken.
6. Optionally attach up to two JPEG, PNG, or WebP photos (up to 2 MB each).
7. Select **Save inspection**.

The ghat list shows the latest inspection and its readiness status. Use the
ghat's actions menu to edit an existing ghat or inspection.

## Review the Action Taken Report

Open **Action Taken Report** to review registered and inspected ghats,
inspection coverage, ghats awaiting inspection, and pending or rectified
actions. Search the report by ghat, area, or officer. Select **Download CSV**
to export the report data.

The report's deadline is calculated as seven days after its order date.

## Manage accounts (administrators)

Administrators can open **Users** to search the account list and add, edit, or
delete accounts.

- To add an account, select **Add user**, enter a unique username, name, role,
  and password, then select **Create user**.
- To edit an account, open its actions menu and select **Edit**. Leave the new
  password field blank to keep the existing password.
- To delete an account, select **Delete** from its actions menu and confirm.
  You cannot delete your own account.

Roles are **User** and **Administrator**. Administrators can manage accounts;
all signed-in users can use the ghat register, inspections, and reports. Give
new users their initial password securely and ask them to change it after
signing in.

## Change your password

Open **Change password**, enter your current password, then enter and confirm
your new password. Passwords must be at least 8 characters and no more than
72 bytes. The new password must differ from the current password.

## Development demo mode

If the portal displays a development demo notice, it is running in demo mode.
Demo accounts and changes are stored only in that browser and are not saved to
the production database. Use an account provided for the live portal to make
changes to production data.
