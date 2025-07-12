# Setting Up Plaid Integration

To properly connect bank accounts to Finance Leaderboard, you'll need to set up Plaid API credentials.

## Steps to Get Plaid API Credentials

1. **Sign up for a Plaid developer account**:

   - Go to [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
   - Complete the registration process
   - This is free for development purposes

2. **Get your API credentials**:

   - After signing in to your Plaid dashboard
   - Navigate to Team Settings > Keys
   - You'll see your Client ID and Sandbox Secret

3. **Configure your application**:

   - Open the `.env` file in your `backend` directory
   - Replace the placeholder values with your actual credentials:

   ```
   PLAID_CLIENT_ID=your_client_id_here
   PLAID_SECRET=your_sandbox_secret_here
   PLAID_ENV=sandbox
   ```

4. **Restart your server**:
   - After updating the environment variables, restart your backend server
   - The Plaid connection should now work properly

## Testing Plaid Integration

In sandbox mode, you can use the following test credentials:

- Username: `user_good`
- Password: `pass_good`
- Any other information can be made up

## Going to Production

When moving to production:

1. Request Production API access from Plaid
2. Update your `.env` file with production credentials
3. Change `PLAID_ENV` to `development` or `production` as appropriate

For more information, refer to the [Plaid Documentation](https://plaid.com/docs/).
