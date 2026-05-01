# =============================================================================
# GCP First-Time Setup — AI Relationship Simulator
# Run this ONCE before first deployment.
# Prerequisites: gcloud CLI installed + logged in (gcloud auth login)
# =============================================================================

# ─── FILL IN THESE VALUES ────────────────────────────────────────────────────
$PROJECT_ID    = "your-project-id"          # gcloud projects list
$REGION        = "asia-southeast1"           # Singapore (closest to Thailand)
$SERVICE       = "ai-relationship-simulator"
$REPO          = "ai-sim-repo"
$SQL_INSTANCE  = "ai-sim-db"
$DB_NAME       = "simulator"
$DB_USER       = "sim_user"
$SA_NAME       = "ai-sim-runner"
$OPENAI_KEY    = "sk-..."                   # Your OpenAI API key
$APP_SECRET    = -join ((65..90)+(97..122)+(48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
# ─────────────────────────────────────────────────────────────────────────────

$SA_EMAIL      = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
$IMAGE_PATH    = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/ai-sim-backend"
$SQL_CONN_NAME = "$PROJECT_ID`:$REGION`:$SQL_INSTANCE"

Write-Host "`n=== AI Relationship Simulator — GCP Setup ===" -ForegroundColor Cyan
Write-Host "Project : $PROJECT_ID"
Write-Host "Region  : $REGION"
Write-Host "Service : $SERVICE"
Write-Host ""

# ── 1. Set active project ──────────────────────────────────────────────────
Write-Host "[1/9] Setting project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# ── 2. Enable required APIs ───────────────────────────────────────────────
Write-Host "[2/9] Enabling APIs (takes ~1 min)..." -ForegroundColor Yellow
gcloud services enable `
    run.googleapis.com `
    sqladmin.googleapis.com `
    secretmanager.googleapis.com `
    artifactregistry.googleapis.com `
    cloudbuild.googleapis.com `
    iam.googleapis.com

# ── 3. Artifact Registry repository ──────────────────────────────────────
Write-Host "[3/9] Creating Artifact Registry repo..." -ForegroundColor Yellow
gcloud artifacts repositories create $REPO `
    --repository-format=docker `
    --location=$REGION `
    --description="AI Relationship Simulator images"

gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# ── 4. Cloud SQL — PostgreSQL 15 ──────────────────────────────────────────
Write-Host "[4/9] Creating Cloud SQL instance (takes 5-10 min)..." -ForegroundColor Yellow
gcloud sql instances create $SQL_INSTANCE `
    --database-version=POSTGRES_15 `
    --region=$REGION `
    --tier=db-f1-micro `
    --storage-type=SSD `
    --storage-size=10GB `
    --backup-start-time=02:00 `
    --no-assign-ip `
    --enable-google-private-path

# Generate DB password and store in Secret Manager
$DB_PASSWORD = -join ((65..90)+(97..122)+(48..57) | Get-Random -Count 28 | ForEach-Object {[char]$_})

Write-Host "[4/9] Creating database and user..." -ForegroundColor Yellow
gcloud sql databases create $DB_NAME --instance=$SQL_INSTANCE
gcloud sql users create $DB_USER `
    --instance=$SQL_INSTANCE `
    --password=$DB_PASSWORD

# Build DATABASE_URL for Cloud SQL Unix socket
$DB_URL = "postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${SQL_CONN_NAME}"

# ── 5. Secret Manager ─────────────────────────────────────────────────────
Write-Host "[5/9] Storing secrets..." -ForegroundColor Yellow

$OPENAI_KEY    | gcloud secrets create openai-api-key    --data-file=- --replication-policy=automatic
$DB_URL        | gcloud secrets create database-url      --data-file=- --replication-policy=automatic
$APP_SECRET    | gcloud secrets create app-secret-key    --data-file=- --replication-policy=automatic

Write-Host "  ✓ Secrets stored in Secret Manager" -ForegroundColor Green

# ── 6. Service Account ────────────────────────────────────────────────────
Write-Host "[6/9] Creating service account..." -ForegroundColor Yellow
gcloud iam service-accounts create $SA_NAME `
    --display-name="AI Simulator Cloud Run Runner"

# Grant Cloud SQL access
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/cloudsql.client"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/secretmanager.secretAccessor"

# Grant Artifact Registry read
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/artifactregistry.reader"

# Grant Cloud Build to deploy Cloud Run
$BUILD_SA = "$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$BUILD_SA" `
    --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$BUILD_SA" `
    --role="roles/iam.serviceAccountUser"

# ── 7. First Docker build & push ──────────────────────────────────────────
Write-Host "[7/9] Building and pushing Docker image..." -ForegroundColor Yellow
Set-Location (Split-Path $PSScriptRoot -Parent)
docker build -t "${IMAGE_PATH}:latest" .
docker push "${IMAGE_PATH}:latest"

# ── 8. First Cloud Run deployment ─────────────────────────────────────────
Write-Host "[8/9] Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE `
    --image="${IMAGE_PATH}:latest" `
    --region=$REGION `
    --platform=managed `
    --allow-unauthenticated `
    --add-cloudsql-instances="$SQL_CONN_NAME" `
    --set-secrets="OPENAI_API_KEY=openai-api-key:latest,DATABASE_URL=database-url:latest,APP_SECRET_KEY=app-secret-key:latest" `
    --set-env-vars="DEBUG=false" `
    --service-account="$SA_EMAIL" `
    --memory=512Mi `
    --cpu=1 `
    --min-instances=0 `
    --max-instances=5 `
    --concurrency=80 `
    --timeout=300

# ── 9. Connect Cloud Build trigger to GitHub (optional) ───────────────────
Write-Host "[9/9] Setup complete!" -ForegroundColor Green

$SERVICE_URL = gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Deployment successful!                              ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  App URL   : $SERVICE_URL" -ForegroundColor Cyan
Write-Host "║  API Docs  : $SERVICE_URL/docs" -ForegroundColor Cyan
Write-Host "║  Health    : $SERVICE_URL/health" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Next: Connect GitHub repo to Cloud Build trigger    ║" -ForegroundColor Cyan
Write-Host "║  gcloud builds triggers create github ...            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "DB Password (save this!):" -ForegroundColor Red
Write-Host $DB_PASSWORD -ForegroundColor Red
