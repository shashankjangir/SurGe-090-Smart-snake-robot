param([int]$Port = 5001)
$ErrorActionPreference = 'Stop'
conda run --no-capture-output -n surge python "$PSScriptRoot/backend/web_dashboard/web_app.py" --port $Port
exit $LASTEXITCODE
