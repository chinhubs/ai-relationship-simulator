# Start the AI Relationship Simulator backend
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example — add your OPENAI_API_KEY" -ForegroundColor Yellow
}

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv venv
}

& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt -q

Write-Host "Starting server at http://localhost:8000" -ForegroundColor Green
Write-Host "API docs: http://localhost:8000/docs" -ForegroundColor Green
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
