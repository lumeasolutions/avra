@echo off
echo Generating Prisma client (using local prisma v5)...

REM Use the local prisma binary from apps/api to avoid global version conflicts
if exist "apps\api\node_modules\.bin\prisma.CMD" (
    call apps\api\node_modules\.bin\prisma.CMD generate --schema=prisma\schema.prisma
) else (
    echo Local prisma binary not found. Running pnpm install first...
    pnpm install
    if exist "apps\api\node_modules\.bin\prisma.CMD" (
        call apps\api\node_modules\.bin\prisma.CMD generate --schema=prisma\schema.prisma
    ) else (
        echo ERROR: Could not find prisma binary. Please run pnpm install first.
        pause
        exit /b 1
    )
)

if %errorlevel% neq 0 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)

echo Done! Prisma client generated successfully.
