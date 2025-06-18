# PowerShell script to deploy consolidated user management SQL functions to Supabase

Write-Host "Deploying consolidated user management SQL functions to Supabase..." -ForegroundColor Green

# Navigate to the project directory
Set-Location $PSScriptRoot

# Project reference ID
$projectRef = "obarfcyegijjejvbsdml"

# Deploy the consolidated user management SQL functions
Write-Host "Deploying user_management.sql functions..." -ForegroundColor Cyan
npx supabase db execute --project-ref $projectRef --file ".\supabase\sql\user_management.sql"

Write-Host "SQL function deployment complete!" -ForegroundColor Green
Write-Host "You can now refresh your application to verify the functions are working correctly." -ForegroundColor Yellow
