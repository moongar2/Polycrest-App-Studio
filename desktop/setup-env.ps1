# PolyCrest App Studio - Automatic Environment Variable Setup Script
# Run with: powershell -ExecutionPolicy Bypass -File setup-env.ps1

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "      POLYCREST APP STUDIO - AUTOMATIC ENVIRONMENT SETUP (POWERSHELL) " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$javaHome = $null

# 1. Check existing environment
if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $javaHome = $env:JAVA_HOME
    Write-Host "[INFO] Detected existing JAVA_HOME: $javaHome" -ForegroundColor Yellow
}

# 2. Deep search candidates
if (-not $javaHome) {
    $searchLocations = @(
        "$env:ProgramFiles\Eclipse Adoptium",
        "$env:ProgramFiles\Java",
        "$env:ProgramFiles\Microsoft",
        "$env:ProgramFiles\Amazon Corretto",
        "$env:ProgramFiles\BellSoft",
        "$env:ProgramFiles\Zulu",
        "$env:ProgramFiles\Android\Android Studio\jbr",
        "$env:ProgramFiles(x86)\Java",
        "$env:LOCALAPPDATA\Programs\Eclipse Adoptium",
        "$env:USERPROFILE\.jdks"
    )

    foreach ($loc in $searchLocations) {
        if (Test-Path $loc) {
            # Check direct
            if (Test-Path "$loc\bin\java.exe") {
                $javaHome = $loc
                break
            }
            # Check child directories
            $subdirs = Get-ChildItem -Path $loc -Directory -ErrorAction SilentlyContinue
            foreach ($sub in $subdirs) {
                if (Test-Path "$($sub.FullName)\bin\java.exe") {
                    $javaHome = $sub.FullName
                    break
                }
            }
            if ($javaHome) { break }
        }
    }
}

# 3. Check where.exe
if (-not $javaHome) {
    $whereJava = (Get-Command java -ErrorAction SilentlyContinue).Source
    if ($whereJava -and (Test-Path $whereJava)) {
        $parent = Split-Path (Split-Path $whereJava -Parent) -Parent
        if (Test-Path "$parent\bin\java.exe") {
            $javaHome = $parent
        }
    }
}

if (-not $javaHome) {
    Write-Host "[ERROR] No Java 17+ installation detected on this PC." -ForegroundColor Red
    Write-Host "Please download and install Java 17 (Adoptium Temurin) from:" -ForegroundColor White
    Write-Host "https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "[OK] Found JDK at: $javaHome" -ForegroundColor Green

# Set User JAVA_HOME permanently
[Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, [EnvironmentVariableTarget]::User)
$env:JAVA_HOME = $javaHome
Write-Host "[OK] Permanent JAVA_HOME configured." -ForegroundColor Green

# Add to User PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
$binPath = "$javaHome\bin"

if ($userPath -notlike "*$binPath*") {
    $newPath = if ($userPath) { "$userPath;$binPath" } else { $binPath }
    [Environment]::SetEnvironmentVariable("Path", $newPath, [EnvironmentVariableTarget]::User)
    $env:Path = "$env:Path;$binPath"
    Write-Host "[OK] Added $binPath to User PATH." -ForegroundColor Green
} else {
    Write-Host "[OK] $binPath is already in User PATH." -ForegroundColor Green
}

# Check Android SDK
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path "$androidSdk\platform-tools\adb.exe") {
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdk, [EnvironmentVariableTarget]::User)
    $env:ANDROID_HOME = $androidSdk
    $adbPath = "$androidSdk\platform-tools"
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
    if ($currentPath -notlike "*$adbPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$adbPath", [EnvironmentVariableTarget]::User)
        $env:Path = "$env:Path;$adbPath"
        Write-Host "[OK] Added Android platform-tools (adb) to User PATH." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                        VERIFICATION RESULTS                         " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "JAVA_HOME = $env:JAVA_HOME" -ForegroundColor White
Write-Host ""
& "$javaHome\bin\java.exe" -version
Write-Host ""
Write-Host "[SUCCESS] PolyCrest App Studio environment variables configured successfully!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit..."
