$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
try {
    if (Get-Process -Name 'SunReminder' -ErrorAction SilentlyContinue) { throw 'Please exit SunReminder from its tray menu before uninstalling.' }
    $choice = [System.Windows.Forms.MessageBox]::Show('Remove SunReminder? Your settings and history will be preserved.', 'Uninstall SunReminder', 'YesNo', 'Question')
    if ($choice -ne 'Yes') { exit 0 }
    $destination = Join-Path $env:LOCALAPPDATA 'Programs\SunReminder'
    $key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    if (Get-ItemProperty -Path $key -Name SunReminder -ErrorAction SilentlyContinue) { Remove-ItemProperty -Path $key -Name SunReminder }
    $desktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) 'SunReminder.lnk'
    if (Test-Path -LiteralPath $desktopLink) { Remove-Item -LiteralPath $desktopLink }
    $menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'SunReminder'
    foreach ($name in @('SunReminder.lnk', 'Uninstall SunReminder.lnk')) {
        $link = Join-Path $menu $name
        if (Test-Path -LiteralPath $link) { Remove-Item -LiteralPath $link }
    }
    if ((Test-Path -LiteralPath $menu) -and -not (Get-ChildItem -LiteralPath $menu)) { Remove-Item -LiteralPath $menu }
    # Only remove the three files created by this installer. Never recursively delete user files.
    foreach ($name in @('SunReminder.exe', 'uninstall.ps1', 'Uninstall.cmd')) {
        $file = Join-Path $destination $name
        if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }
    }
    if ((Test-Path -LiteralPath $destination) -and -not (Get-ChildItem -LiteralPath $destination)) { Remove-Item -LiteralPath $destination }
    [System.Windows.Forms.MessageBox]::Show('SunReminder has been removed. Settings and history remain in %LOCALAPPDATA%\SunReminder.', 'Completed') | Out-Null
} catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'SunReminder uninstall') | Out-Null
    exit 1
}
