param([string]$OutputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
$projectRoot=[IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
if(-not $OutputPath){$OutputPath=Join-Path (Split-Path $projectRoot -Parent) 'SunReminder-v3.zip'}
$OutputPath=[IO.Path]::GetFullPath($OutputPath)
if(Test-Path -LiteralPath $OutputPath){throw 'Output already exists; choose a different OutputPath to preserve previous releases.'}
$allowedDirectories=@('App-v3','src','tests','scripts','docs','web','Preview','cloudflare')
$allowedRootFiles=@('README.md','.gitignore','Build.cmd','Install.cmd','Launch-SunReminder.cmd','Start-Web.cmd','Start-Web.command','Start-Group4.cmd','SunReminder.sln','package.json','package-lock.json','wrangler.jsonc')
$zip=[IO.Compression.ZipFile]::Open($OutputPath,[IO.Compression.ZipArchiveMode]::Create)
try{
  foreach($file in Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Force){
    $relative=[IO.Path]::GetRelativePath($projectRoot,$file.FullName).Replace('\','/')
    $parts=$relative.Split('/')
    if($parts.Count -eq 1){if($relative -notin $allowedRootFiles){continue}}
    elseif($parts[0] -notin $allowedDirectories){continue}
    if($relative.StartsWith('cloudflare/public/')){continue}
    if($parts[0] -eq 'Preview' -and $file.Extension -ne '.png'){continue}
    if($parts | Where-Object {$_ -in @('node_modules','.wrangler','bin','obj','server-data','qa-profile','.git','.codex','.agents')}){continue}
    if($file.Name -match '^(ADMIN-LOGIN|admin-auth|sharing|statistics)\.(txt|json|sqlite)' -or $file.Name -like '.env*' -or $file.Name -like '.dev.vars*' -or $file.Extension -in @('.tmp','.pdb','.sqlite')){continue}
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,'SunReminder/'+$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
}finally{$zip.Dispose()}
Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256
