$root = "C:\Users\Saidk\OneDrive\Desktop\vpn"

# Create destination folders
$adminDocs   = Join-Path $root "admin-docs"
$unusedMedia = Join-Path $root "unused-media"
New-Item -ItemType Directory -Force -Path $adminDocs   | Out-Null
New-Item -ItemType Directory -Force -Path $unusedMedia | Out-Null

# Admin / operational files
$adminFiles = @(
    "HOW-TO-GUIDE INCASE THE WEBSITE COSTS ALOT PER UPLOAD.html",
    "COA_Upload_Guide.html",
    "coa upload admin instructions.pdf",
    "Every time you have a new COA to ad.txt",
    "VPN_Cloudflare_Setup_Guide.pdf",
    "Verified_Peptide_Network_GLP1_Guide.pdf",
    "VPN_Peptide_Research_Guide.html"
)
foreach ($f in $adminFiles) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Move-Item -Path $src -Destination (Join-Path $adminDocs $f) -Force
        Write-Host "Moved to admin-docs: $f"
    } else {
        Write-Host "SKIP (not found): $f"
    }
}

# Unused media
$mediaFiles = @(
    "test.jpg",
    "TESTSFORMEN.png",
    "videovpn.mp4",
    "Private Pricing Inner circle .png",
    "Private Pricing for the inner circle.png"
)
foreach ($f in $mediaFiles) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Move-Item -Path $src -Destination (Join-Path $unusedMedia $f) -Force
        Write-Host "Moved to unused-media: $f"
    } else {
        Write-Host "SKIP (not found): $f"
    }
}

Write-Host "`nDone! You can delete this script file now."
Read-Host "Press Enter to close"
