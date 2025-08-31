# Git Repository Cleanup Script
# This script cleans up the Git repository without requiring GPG signing

Write-Host "Git Repository Cleanup Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Step 1: Show current state
Write-Host "`n📊 Current Repository State:" -ForegroundColor Yellow
Write-Host "Current branch: $(git branch --show-current)"
Write-Host "Total commits: $(git rev-list --count HEAD)"
Write-Host "Local branches: $(git branch | Measure-Object -Line | Select-Object -ExpandProperty Lines)"
Write-Host "Remote branches: $(git branch -r | Measure-Object -Line | Select-Object -ExpandProperty Lines)"

# Step 2: Clean up local branches
Write-Host "`n🧹 Cleaning up merged branches..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
$branches = git branch --merged | Where-Object { $_ -notmatch "^\*" -and $_ -notmatch "main" -and $_ -notmatch "master" }
foreach ($branch in $branches) {
    $branch = $branch.Trim()
    if ($branch -and $branch -ne $currentBranch) {
        Write-Host "  Deleting merged branch: $branch"
        git branch -d $branch 2>$null
    }
}

# Step 3: Clean up remote tracking branches
Write-Host "`n🔄 Pruning remote branches..." -ForegroundColor Yellow
git remote prune origin
git remote prune upstream 2>$null

# Step 4: Remove upstream remote if desired
$removeUpstream = Read-Host "`nDo you want to remove the upstream remote? (y/n)"
if ($removeUpstream -eq 'y') {
    Write-Host "Removing upstream remote..." -ForegroundColor Yellow
    git remote remove upstream
    Write-Host "Upstream remote removed" -ForegroundColor Green
}

# Step 5: Optimize repository
Write-Host "`n⚡ Optimizing repository..." -ForegroundColor Yellow
git gc --aggressive --prune=now
git repack -a -d --depth=250 --window=250

# Step 6: Show cleanup results
Write-Host "`n✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "`n📊 New Repository State:" -ForegroundColor Yellow
Write-Host "Current branch: $(git branch --show-current)"
Write-Host "Total commits: $(git rev-list --count HEAD)"
Write-Host "Local branches: $(git branch | Measure-Object -Line | Select-Object -ExpandProperty Lines)"
Write-Host "Remote branches: $(git branch -r | Where-Object { $_ -notmatch "upstream" } | Measure-Object -Line | Select-Object -ExpandProperty Lines)"

# Get repository size
$repoSize = (Get-ChildItem -Path . -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Repository size: $([math]::Round($repoSize, 2)) MB"

Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan
Write-Host "1. Install GPG for Windows from: https://gnupg.org/download/"
Write-Host "2. Setup commit signing for verified commits"
Write-Host "3. Use 'git commit -S' for signed commits"
Write-Host "4. Add GPG key to GitHub for verified badge"

Write-Host "`n📝 Your backup branch 'backup-main-20250131' has been created" -ForegroundColor Green
