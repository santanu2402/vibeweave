<#
.SYNOPSIS
  Vibeweave installer for Windows — a thin wrapper around the cross-platform Node installer (bin/vibeweave.mjs).

.EXAMPLE
  .\install.ps1                                    # detect IDEs in the current project and install for them
  .\install.ps1 -Agent cursor,copilot,codex        # specific IDEs (see -List)
  .\install.ps1 -Agent all -Global                 # every supported IDE, user-wide
  .\install.ps1 -Project C:\dev\app                # into another project
  .\install.ps1 -Skills vibeweave,ui-test -Link    # subset of skills, as junctions (git pull updates them)
  .\install.ps1 -NoAgents -NoRules -NoUsage        # skip subagents / rule files / Claude usage hook
  .\install.ps1 -DryRun · -Uninstall · -List · -Force (replace same-named files Vibeweave didn't create)
  Same as: npx vibeweave ...      If scripts are blocked: powershell -ExecutionPolicy Bypass -File .\install.ps1 ...
#>
[CmdletBinding()]
param(
  [string[]]$Agent, [switch]$Global, [string]$Project, [string[]]$Skills, [switch]$Link,
  [switch]$Uninstall, [switch]$List, [switch]$NoAgents, [switch]$NoRules, [switch]$NoUsage, [switch]$DryRun, [switch]$Force
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Node.js 18+ is required: https://nodejs.org"; exit 2 }
$a = @()
if ($Agent)     { $a += "--agent";   $a += (($Agent | ForEach-Object { $_ -split "," }) -join ",") }
if ($Skills)    { $a += "--skills";  $a += (($Skills | ForEach-Object { $_ -split "," }) -join ",") }
if ($Project)   { $a += "--project"; $a += (Resolve-Path $Project).Path }
if ($Global)    { $a += "--global" }
if ($Link)      { $a += "--link" }
if ($Uninstall) { $a += "--uninstall" }
if ($List)      { $a += "--list" }
if ($NoAgents)  { $a += "--no-agents" }
if ($NoRules)   { $a += "--no-rules" }
if ($NoUsage)   { $a += "--no-usage" }
if ($DryRun)    { $a += "--dry-run" }
if ($Force)     { $a += "--force" }
& node (Join-Path $PSScriptRoot "bin\vibeweave.mjs") @a
exit $LASTEXITCODE
