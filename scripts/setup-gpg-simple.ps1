# GPG Signing Setup Script for Git
# Simple and robust version

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "GPG Signing Setup for Git" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Set GPG path
$gpgPath = "C:\Program Files (x86)\GnuPG\bin\gpg.exe"

# Check if GPG is installed
if (-not (Test-Path $gpgPath)) {
    Write-Host "ERROR: GPG not found. Please install GPG4Win first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "GPG found at: $gpgPath" -ForegroundColor Green

# Configure Git to use GPG
Write-Host ""
Write-Host "Configuring Git to use GPG..." -ForegroundColor Yellow
git config --global gpg.program "$gpgPath"

# Get user information
$userName = git config --global user.name
$userEmail = git config --global user.email

if (-not $userName -or -not $userEmail) {
    Write-Host ""
    Write-Host "Git user not configured. Setting up..." -ForegroundColor Yellow
    $userName = Read-Host "Enter your name"
    $userEmail = Read-Host "Enter your email"
    git config --global user.name "$userName"
    git config --global user.email "$userEmail"
}

Write-Host ""
Write-Host "Git User: $userName [$userEmail]" -ForegroundColor Cyan

# Check if GPG key exists
Write-Host ""
Write-Host "Checking for existing GPG keys..." -ForegroundColor Yellow

# Suppress error output when checking for keys
$ErrorActionPreference = "SilentlyContinue"
$existingKeys = & $gpgPath --list-secret-keys --keyid-format=long $userEmail 2>$null
$ErrorActionPreference = "Continue"

if ($existingKeys) {
    Write-Host "Found existing GPG key" -ForegroundColor Green
    # Extract key ID from output using simple string matching
    $lines = $existingKeys -split "`n"
    foreach ($line in $lines) {
        if ($line -match "sec.*rsa.*\/([0-9A-F]+)") {
            $keyId = $matches[1]
            break
        }
    }
    
    if ($keyId) {
        Write-Host "Key ID: $keyId" -ForegroundColor Cyan
    }
} else {
    Write-Host "No existing GPG key found. Creating new key..." -ForegroundColor Yellow
    
    # Create GPG key batch file content
    $batchContent = @"
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
    
    # Save batch file
    $batchContent | Out-File -FilePath "gpg-batch.txt" -Encoding ASCII
    
    Write-Host ""
    Write-Host "Generating GPG key (this may take a moment)..." -ForegroundColor Yellow
    & $gpgPath --batch --generate-key gpg-batch.txt
    
    # Clean up batch file
    if (Test-Path "gpg-batch.txt") {
        Remove-Item "gpg-batch.txt" -Force
    }
    
    # Get the new key ID
    $existingKeys = & $gpgPath --list-secret-keys --keyid-format=long $userEmail 2>$null
    $lines = $existingKeys -split "`n"
    foreach ($line in $lines) {
        if ($line -match "sec.*rsa.*\/([0-9A-F]+)") {
            $keyId = $matches[1]
            break
        }
    }
    
    if ($keyId) {
        Write-Host "GPG key created successfully!" -ForegroundColor Green
        Write-Host "Key ID: $keyId" -ForegroundColor Cyan
    }
}

if ($keyId) {
    # Configure Git to use the GPG key
    Write-Host ""
    Write-Host "Configuring Git to use GPG key..." -ForegroundColor Yellow
    git config --global user.signingkey $keyId
    git config --global commit.gpgsign true
    git config --global tag.gpgsign true
    
    Write-Host "Git configured for GPG signing" -ForegroundColor Green
    
    # Export public key for GitHub
    Write-Host ""
    Write-Host "Exporting public key for GitHub..." -ForegroundColor Yellow
    $publicKey = & $gpgPath --armor --export $keyId
    
    if ($publicKey) {
        # Save to file
        $publicKey | Out-File -FilePath "gpg-public-key.asc" -Encoding ASCII
        
        Write-Host "Public key exported to: gpg-public-key.asc" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Copy the contents of gpg-public-key.asc" -ForegroundColor White
        Write-Host "2. Go to GitHub Settings -> SSH and GPG keys" -ForegroundColor White
        Write-Host "3. Click 'New GPG key'" -ForegroundColor White
        Write-Host "4. Paste the key and save" -ForegroundColor White
    }
    
    # Test signing
    Write-Host ""
    Write-Host "Testing GPG signing..." -ForegroundColor Yellow
    
    # Create a test commit
    $testOutput = git commit --allow-empty -S -m "test: GPG signing verification" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "GPG signing test successful!" -ForegroundColor Green
        # Remove test commit
        git reset --soft HEAD~1
    } else {
        Write-Host "GPG signing test failed. Error:" -ForegroundColor Yellow
        Write-Host $testOutput -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Setup complete!" -ForegroundColor Green
    Write-Host "All future commits will be signed with GPG" -ForegroundColor Cyan
    
    # Show current configuration
    Write-Host ""
    Write-Host "Current Configuration:" -ForegroundColor Yellow
    $gpgProgram = git config --global gpg.program
    $signingKey = git config --global user.signingkey
    $commitSign = git config --global commit.gpgsign
    $tagSign = git config --global tag.gpgsign
    
    Write-Host "GPG Program: $gpgProgram" -ForegroundColor White
    Write-Host "Signing Key: $signingKey" -ForegroundColor White
    Write-Host "Auto-sign commits: $commitSign" -ForegroundColor White
    Write-Host "Auto-sign tags: $tagSign" -ForegroundColor White
} else {
    Write-Host "Failed to get GPG key ID" -ForegroundColor Red
    Write-Host "Please try running the script again or create a GPG key manually" -ForegroundColor Yellow
}
