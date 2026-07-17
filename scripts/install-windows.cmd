@echo off
REM OilPrice Excel Add-in - one-click Windows desktop setup.
REM Downloads the official setup script from this repository and runs it
REM with administrator rights (needed once, to register the add-in catalog).

setlocal
set "PS1_URL=https://raw.githubusercontent.com/OilpriceAPI/excel-energy-addin/main/scripts/setup-windows-desktop-sideload.ps1"
set "PS1_PATH=%TEMP%\oilprice-addin-setup.ps1"

echo Downloading the OilPrice add-in setup script...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%PS1_URL%' -OutFile '%PS1_PATH%'"
if not exist "%PS1_PATH%" (
  echo Download failed. Check your internet connection and try again.
  pause
  exit /b 1
)

echo Requesting administrator approval (choose Yes on the prompt)...
powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%PS1_PATH%','-ClearOfficeCache'"

echo.
echo Done. Restart Excel, then go to: Insert ^> My Add-ins ^> Shared Folder ^> OilPrice.
pause
