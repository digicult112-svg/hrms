# IMPORTANT SECURITY NOTE FOR EMPLOYEE CREATION
#
# The CreateEmployeeModal uses supabase.auth.admin.createUser() which requires
# the service role key. This is a SECURITY RISK in production because the service
# role key bypasses all RLS policies.
#
# RECOMMENDED SOLUTIONS:
# 1. Use Supabase Edge Functions (RECOMMENDED for production)
# 2. Use a backend API endpoint that securely creates users
# 3. Only use this in development/testing environments
#
# For now, you need to add your Supabase service role key:
# VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
#
# You can find this in: Supabase Dashboard → Settings → API → service_role key
#
# WARNING: Never commit the service role key to version control!
# Add .env to .gitignore immediately!
