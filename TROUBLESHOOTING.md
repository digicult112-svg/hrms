# Troubleshooting: "Failed to fetch" Error

## Error Message
```
Error: Failed to fetch (api.supabase.com)
```

## Possible Causes & Solutions

### 1. **Supabase Project is Paused** (Most Common)
Free tier Supabase projects pause after 7 days of inactivity.

**Solution:**
1. Go to https://supabase.com/dashboard
2. Log in to your account
3. Find your project: `umbgifensoxcvoonxjng`
4. If you see a "Resume" or "Restore" button, click it
5. Wait for the project to become active (may take 1-2 minutes)

### 2. **Internet Connection Issue**
**Solution:**
- Check your internet connection
- Try accessing https://umbgifensoxcvoonxjng.supabase.co in your browser
- If it doesn't load, check your network/firewall

### 3. **Dev Server Not Restarted**
If you just created/modified the `.env` file, the dev server needs a restart.

**Solution:**
1. Stop the dev server (Ctrl+C)
2. Run `npm run dev` again
3. The environment variables will be loaded fresh

### 4. **CORS or Firewall Blocking**
**Solution:**
- Check if your antivirus/firewall is blocking `supabase.co`
- Try disabling VPN if you're using one
- Check browser console for CORS errors

### 5. **Supabase Service Outage**
**Solution:**
- Check Supabase status: https://status.supabase.com/
- Wait for service to be restored

## Quick Test
Open your browser console and run:
```javascript
fetch('https://umbgifensoxcvoonxjng.supabase.co/rest/v1/')
  .then(r => console.log('Connected!', r.status))
  .catch(e => console.error('Failed:', e))
```

If this fails, the issue is with Supabase connectivity, not your code.

## Your Supabase Project Details
- **URL**: https://umbgifensoxcvoonxjng.supabase.co
- **Project ID**: umbgifensoxcvoonxjng
- **Dashboard**: https://supabase.com/dashboard/project/umbgifensoxcvoonxjng
