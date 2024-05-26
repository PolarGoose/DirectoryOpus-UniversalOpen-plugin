Function Info($msg) {
  Write-Host -ForegroundColor DarkGreen "`nINFO: $msg`n"
}

Function Error($msg) {
  Write-Host `n`n
  Write-Error $msg
  exit 1
}

Function CheckReturnCodeOfPreviousCommand($msg) {
  if(-Not $?) {
    Error "${msg}. Error code: $LastExitCode"
  }
}

Function GetVersion() {
  $gitCommand = Get-Command -ErrorAction Stop -Name git

  $tag = & $gitCommand describe --exact-match --tags HEAD
  if(-Not $?) {
      $tag = "v0.0-dev"
      Info "The commit is not tagged. Use '$tag' as a version instead"
  }

  $commitHash = & $gitCommand rev-parse --short HEAD
  CheckReturnCodeOfPreviousCommand "Failed to get git commit hash"

  return "$($tag.Substring(1))~$commitHash"
}

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$root = Resolve-Path "$PSScriptRoot"
$buildDir = "$root/build"
$version = GetVersion

Info "Copy the script to the build directory"
New-Item -Force -ItemType "directory" $buildDir > $null
Copy-Item -Force -Path $root/src/universal-open.js -Destination $buildDir > $null

Info "Insert the version=$version in the script"
(Get-Content $buildDir/universal-open.js).Replace(
    "  data.version = `"0.0-dev`"",
    "  data.version = `"$version`"") | Set-Content $buildDir/universal-open.js

Info "Create zip archive"
Compress-Archive -Path $buildDir/universal-open.js -DestinationPath $buildDir/universal-open.zip
