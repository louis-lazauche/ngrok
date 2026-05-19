$ErrorActionPreference = "Stop"

Write-Host "== DEPLOY START =="

if (-not (Test-Path "$env:DEPLOY_DIR\.git")) {
  git clone --branch $env:TARGET_BRANCH $env:REPO_URL $env:DEPLOY_DIR
} else {
  git -C $env:DEPLOY_DIR pull
}

Set-Location $env:DEPLOY_DIR

npm install

$npmScripts = npm run

if ($npmScripts -match "dev") {
  Start-Process npm "run dev -- --host 0.0.0.0"
} else {
  Start-Process npm "start"
}

Write-Host "== DEPLOY DONE =="