$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
try {
    $source = Join-Path (Split-Path $PSScriptRoot -Parent) 'App-v3\SunReminder.exe'
    $destination = Join-Path $env:LOCALAPPDATA 'Programs\SunReminder'
    if (-not (Test-Path -LiteralPath $source)) { throw 'SunReminder.exe is missing. Extract the complete ZIP before installing.' }
    if (Get-Process -Name 'SunReminder' -ErrorAction SilentlyContinue) { throw 'Please exit SunReminder from its tray menu before installing or updating.' }
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination (Join-Path $destination 'SunReminder.exe') -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'uninstall.ps1') -Destination $destination -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Uninstall.cmd') -Destination $destination -Force
    $shell = New-Object -ComObject WScript.Shell
    $startMenu = Join-Path ([Environment]::GetFolderPath('Programs')) 'SunReminder'
    New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
    foreach ($linkPath in @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'SunReminder.lnk'), (Join-Path $startMenu 'SunReminder.lnk'))) {
        $shortcut = $shell.CreateShortcut($linkPath)
        $shortcut.TargetPath = Join-Path $destination 'SunReminder.exe'
        $shortcut.WorkingDirectory = $destination
        $shortcut.IconLocation = (Join-Path $destination 'SunReminder.exe') + ',0'
        $shortcut.Save()
    }
    $remove = $shell.CreateShortcut((Join-Path $startMenu 'Uninstall SunReminder.lnk'))
    $remove.TargetPath = Join-Path $destination 'Uninstall.cmd'
    $remove.WorkingDirectory = $destination
    $remove.Save()
    [System.Windows.Forms.MessageBox]::Show('SunReminder is ready. A shortcut has been added to your Desktop and Start menu.','Installation complete') | Out-Null
    Start-Process -FilePath (Join-Path $destination 'SunReminder.exe')
} catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'SunReminder setup') | Out-Null
    exit 1
}

