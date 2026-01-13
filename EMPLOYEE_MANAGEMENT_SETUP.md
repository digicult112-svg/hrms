# Employee Management Setup Guide

## Overview
The HRMS now includes full employee management capabilities for HR users:
- ✅ Create new employees
- ✅ Edit employee details
- ✅ Delete employees
- ✅ Search and filter employees
- ✅ Role-based access control

## Setup Instructions

### 1. Add Service Role Key (REQUIRED)

To enable employee creation and deletion, you need to add your Supabase service role key to the `.env` file:

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Copy the `service_role` key (NOT the anon key)
4. Add it to your `.env` file:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Your `.env` file should now look like:
```env
VITE_SUPABASE_URL=https://umbgifensoxcvoonxjng.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Add this line
```

### 2. Restart the Dev Server

After adding the service role key, restart your development server:
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 3. Run Database Migrations

Make sure you've run these SQL files in your Supabase SQL Editor:

1. **Main Schema** (`supabase/schema.sql`) - Creates all tables
2. **Auto-create Profile Trigger** (`supabase/auto-create-profile.sql`) - Automatically creates profiles on signup

## Features

### For HR Users

#### Create Employee
1. Navigate to `/employees`
2. Click "Create Employee" button
3. Fill in the form:
   - Full Name (required)
   - Email (required, must be unique)
   - Temporary Password (required, min 6 characters)
   - Phone (optional)
   - Designation (optional)
   - Role (HR or Employee)
4. Click "Create Employee"

The system will:
- Create an auth user in Supabase
- Automatically create a profile via database trigger
- Send the employee their login credentials (you'll need to communicate the password)

#### Edit Employee
1. Click "Edit" button on any employee card
2. Update the fields (email cannot be changed)
3. Click "Update Employee"

#### Delete Employee
1. Click "Delete" button on any employee card
2. Confirm the deletion
3. All associated data (attendance, leaves, etc.) will be cascade deleted

#### Search & Filter
- **Search**: Type in the search box to filter by name, email, or designation
- **Filter by Role**: Use the dropdown to show only HR or Employee users

### For Regular Employees

Regular employees can:
- View the employee list (read-only)
- See basic information about other employees
- Cannot create, edit, or delete employees

## Security Considerations

### ⚠️ IMPORTANT SECURITY WARNING

The current implementation uses the service role key in the frontend, which is **NOT RECOMMENDED for production**. This is only suitable for:
- Development environments
- Internal tools with trusted users
- Proof of concept applications

### Production Recommendations

For production, you should:

1. **Use Supabase Edge Functions** (Recommended)
   - Create an Edge Function that handles user creation
   - Call the Edge Function from your frontend
   - Keep the service role key secure on the server

2. **Use a Backend API**
   - Create a secure backend endpoint
   - Handle user creation server-side
   - Authenticate requests from your frontend

3. **Alternative: Invite-based System**
   - Use Supabase's built-in invite functionality
   - Send email invitations to new employees
   - They set their own password on first login

## Troubleshooting

### "Missing service role key" Error
- Make sure you've added `VITE_SUPABASE_SERVICE_ROLE_KEY` to your `.env` file
- Restart the dev server after adding the key

### "User already exists" Error
- The email is already registered in Supabase
- Use a different email or delete the existing user from Supabase Dashboard

### Profile Not Created
- Make sure you've run the `auto-create-profile.sql` trigger
- Check Supabase logs for any errors

### Permission Denied
- Ensure you're logged in as an HR user
- Check that RLS policies are correctly set up

## File Structure

```
src/
├── components/
│   ├── CreateEmployeeModal.tsx   # Employee creation form
│   ├── EditEmployeeModal.tsx     # Employee edit form
│   └── DeleteEmployeeDialog.tsx  # Delete confirmation
├── pages/
│   └── EmployeeList.tsx          # Main employee management page
└── lib/
    └── supabase.ts               # Supabase clients (regular + admin)
```

## Next Steps

After setting up employee management, you can:
1. Test creating a few employees
2. Implement employee detail page with tabs
3. Add bulk operations (import/export)
4. Add employee onboarding workflow
5. Integrate with attendance and leave systems
