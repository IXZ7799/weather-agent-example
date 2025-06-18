# PowerShell script to deploy user management Edge Functions to Supabase
# Uses npx to run Supabase CLI commands

Write-Host "Deploying user management Edge Functions to Supabase..." -ForegroundColor Green

# Navigate to the project directory
Set-Location $PSScriptRoot

# Deploy the list-users function
Write-Host "Deploying list-users function..." -ForegroundColor Cyan
npx supabase functions deploy list-users --project-ref "obarfcyegijjejvbsdml" --no-verify-jwt

# Deploy the update-user-role function
Write-Host "Deploying update-user-role function..." -ForegroundColor Cyan
npx supabase functions deploy update-user-role --project-ref "obarfcyegijjejvbsdml" --no-verify-jwt

Write-Host "Deployment complete!" -ForegroundColor Green
