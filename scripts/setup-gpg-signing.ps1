# GPG Signing Setup Script for Git
# This script sets up GPG signing for verified Git commits

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "GPG Signing Setup for Git" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Set GPG path
$gpgPath = "C:\Program Files (x86)\GnuPG\bin\gpg.exe"

# Check if GPG is installed
if (!(Test-Path $gpgPath)) {
    Write-Host "❌ GPG not found. Please install GPG4Win first." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ GPG found at: $gpgPath" -ForegroundColor Green

# Configure Git to use GPG
Write-Host "`n📝 Configuring Git to use GPG..." -ForegroundColor Yellow
git config --global gpg.program $gpgPath

# Get user information
$userName = git config --global user.name
$userEmail = git config --global user.email

if (!$userName -or !$userEmail) {
    Write-Host "`n⚠️ Git user not configured. Setting up..." -ForegroundColor Yellow
    $userName = Read-Host "Enter your name"
    $userEmail = Read-Host "Enter your email"
    git config --global user.name $userName
    git config --global user.email $userEmail
}

Write-Host "`nGit User: $userName [$userEmail]" -ForegroundColor Cyan

# Check if GPG key exists
Write-Host "`n🔍 Checking for existing GPG keys..." -ForegroundColor Yellow
$existingKeys = & $gpgPath --list-secret-keys --keyid-format=long $userEmail 2>$null

if ($existingKeys) {
    Write-Host "✅ Found existing GPG key" -ForegroundColor Green
    $keyId = ($existingKeys | Select-String -Pattern "sec\s+\w+/(\w+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }) | Select-Object -First 1
    
    if ($keyId) {
        Write-Host "Key ID: $keyId" -ForegroundColor Cyan
    }
} else {
    Write-Host "No existing GPG key found. Creating new key..." -ForegroundColor Yellow
    
    # Create GPG key batch file
    $batchFile = @"
%echo Generating GPG key
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: $userName
Name-Email: $userEmail
Expire-Date: 2y
%no-protection
%commit
%echo done
"@
    
    $batchFile | Out-File -FilePath "gpg-batch.txt" -Encoding ASCII
    
    Write-Host "`n🔐 Generating GPG key (this may take a moment)..." -ForegroundColor Yellow
    & $gpgPath --batch --generate-key gpg-batch.txt
    
    # Clean up batch file
    Remove-Item "gpg-batch.txt" -Force
    
    # Get the new key ID
    $existingKeys = & $gpgPath --list-secret-keys --keyid-format=long $userEmail
    $keyId = ($existingKeys | Select-String -Pattern "sec\s+\w+/(\w+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }) | Select-Object -First 1
    
    Write-Host "✅ GPG key created successfully!" -ForegroundColor Green
    Write-Host "Key ID: $keyId" -ForegroundColor Cyan
}

if ($keyId) {
    # Configure Git to use the GPG key
    Write-Host "`n⚙️ Configuring Git to use GPG key..." -ForegroundColor Yellow
    git config --global user.signingkey $keyId
    git config --global commit.gpgsign true
    git config --global tag.gpgsign true
    
    Write-Host "✅ Git configured for GPG signing" -ForegroundColor Green
    
    # Export public key for GitHub
    Write-Host "`n📤 Exporting public key for GitHub..." -ForegroundColor Yellow
    $publicKey = & $gpgPath --armor --export $keyId
    
    # Save to file
    $publicKey | Out-File -FilePath "gpg-public-key.asc" -Encoding ASCII
    
    Write-Host "✅ Public key exported to: gpg-public-key.asc" -ForegroundColor Green
    Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Copy the contents of gpg-public-key.asc" -ForegroundColor White
    Write-Host "2. Go to GitHub Settings -> SSH and GPG keys" -ForegroundColor White
    Write-Host "3. Click 'New GPG key'" -ForegroundColor White
    Write-Host "4. Paste the key and save" -ForegroundColor White
    
    # Test signing
    Write-Host "`n🧪 Testing GPG signing..." -ForegroundColor Yellow
    $testResult = git commit --allow-empty -S -m "test: GPG signing verification" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GPG signing test successful!" -ForegroundColor Green
        # Remove test commit
        git reset --soft HEAD~1
    } else {
        Write-Host "⚠️ GPG signing test failed. Error:" -ForegroundColor Yellow
        Write-Host $testResult -ForegroundColor Red
    }
    
    Write-Host "`n✨ Setup complete!" -ForegroundColor Green
    Write-Host "All future commits will be signed with GPG" -ForegroundColor Cyan
    
    # Show current configuration
    Write-Host "`n📊 Current Configuration:" -ForegroundColor Yellow
    Write-Host "GPG Program: $(git config --global gpg.program)" -ForegroundColor White
    Write-Host "Signing Key: $(git config --global user.signingkey)" -ForegroundColor White
    Write-Host "Auto-sign commits: $(git config --global commit.gpgsign)" -ForegroundColor White
    Write-Host "Auto-sign tags: $(git config --global tag.gpgsign)" -ForegroundColor White
} else {
    Write-Host "❌ Failed to get GPG key ID" -ForegroundColor Red
}
