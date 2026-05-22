param(
  [string]$ManifestUrl = "https://oilpriceapi.github.io/excel-energy-addin/manifest.xml",
  [string]$ShareName = "OilPriceAPIAddins",
  [switch]$ClearOfficeCache
)

$ErrorActionPreference = "Stop"

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this PowerShell script as Administrator so it can create the local SMB share."
  }
}

Assert-Administrator

$catalogId = "{f402ea85-7778-41f3-8cee-c3465c49ca8d}"
$catalogDir = Join-Path $env:USERPROFILE "Documents\OfficeAddins\OilPriceAPI"
$manifestPath = Join-Path $catalogDir "manifest.xml"
$catalogUrl = "\\$env:COMPUTERNAME\$ShareName"
$registryPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\$catalogId"

Write-Host "Creating Office add-in catalog folder: $catalogDir"
New-Item -ItemType Directory -Force -Path $catalogDir | Out-Null

Write-Host "Downloading manifest: $ManifestUrl"
Invoke-WebRequest -Uri $ManifestUrl -OutFile $manifestPath

Write-Host "Creating or updating local SMB share: $catalogUrl"
$existingShare = Get-SmbShare -Name $ShareName -ErrorAction SilentlyContinue
if ($existingShare) {
  if ($existingShare.Path -ne $catalogDir) {
    throw "Share $ShareName already exists at $($existingShare.Path). Remove it or choose a different -ShareName."
  }
} else {
  New-SmbShare -Name $ShareName -Path $catalogDir -ReadAccess $env:USERNAME | Out-Null
}

Write-Host "Registering Excel trusted add-in catalog: $catalogUrl"
New-Item -Path $registryPath -Force | Out-Null
New-ItemProperty -Path $registryPath -Name "Id" -Value $catalogId -PropertyType String -Force | Out-Null
New-ItemProperty -Path $registryPath -Name "Url" -Value $catalogUrl -PropertyType String -Force | Out-Null
New-ItemProperty -Path $registryPath -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null

if ($ClearOfficeCache) {
  Write-Host "Clearing Office web add-in cache for current Windows user"
  $cachePaths = @(
    (Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\Wef"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\WebServiceCache")
  )
  foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
      Remove-Item -Path $cachePath -Recurse -Force
    }
  }
}

Write-Host ""
Write-Host "Desktop Excel sideload setup complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Close all Excel windows."
Write-Host "2. Reopen Excel Desktop."
Write-Host "3. Go to Insert > My Add-ins > Shared Folder."
Write-Host "4. Select OilPrice Excel Add-in."
Write-Host "5. Test =OILPRICE.PRICE(""BRENT_CRUDE_USD"")."
Write-Host ""
Write-Host "Catalog URL registered: $catalogUrl"
Write-Host "Manifest path: $manifestPath"
