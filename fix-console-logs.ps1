# Fix console.log syntax errors
$files = @(
    "src/components/ci-settings.tsx",
    "src/ipc/ipc_client.ts"
)

# Search for pattern: // followed by whitespace and console.log(
$pattern = '//\s+console\.log\('
$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match $pattern) {
        Write-Host "Fixing $($file.FullName)"
        
        # Fix the pattern - remove the comment slashes before console.log
        $content = $content -replace '//(\s+)console\.log\(', '$1console.log('
        
        # Save the fixed content
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "Console.log fixes completed"
