@echo off
setlocal EnableDelayedExpansion
title PolyCrest App Studio - Automatic Environment Setup

echo =====================================================================
echo       POLYCREST APP STUDIO - AUTOMATIC ENVIRONMENT SETUP
echo =====================================================================
echo.
echo Searching for installed Java Development Kit (JDK 17+)...

set "FOUND_JAVA_HOME="

:: 1. Check existing JAVA_HOME
if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" (
        set "FOUND_JAVA_HOME=%JAVA_HOME%"
        echo [INFO] Detected existing JAVA_HOME: !FOUND_JAVA_HOME!
        goto :CONFIRM_JAVA
    )
)

:: 2. Search common Windows JDK installation directories
set "SEARCH_PATHS="
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles%\Eclipse Adoptium""
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles%\Java""
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles%\Microsoft""
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles%\Amazon Corretto""
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles%\BellSoft""
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles%\Zulu""
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles%\Android\Android Studio\jbr""
set "SEARCH_PATHS=%SEARCH_PATHS% "%ProgramFiles(x86)%\Java""
set "SEARCH_PATHS=%SEARCH_PATHS% "%LOCALAPPDATA%\Programs\Eclipse Adoptium""
set "SEARCH_PATHS=%SEARCH_PATHS% "%USERPROFILE%\.jdks""

for %%P in (%SEARCH_PATHS%) do (
    if exist "%%~P" (
        if exist "%%~P\bin\java.exe" (
            set "FOUND_JAVA_HOME=%%~P"
            goto :CONFIRM_JAVA
        )
        for /d %%D in ("%%~P\*") do (
            if exist "%%~D\bin\java.exe" (
                set "FOUND_JAVA_HOME=%%~D"
                goto :CONFIRM_JAVA
            )
        )
    )
)

:: 3. Try where java
for /f "delims=" %%I in ('where java 2^>nul') do (
    set "JAVA_EXE_PATH=%%~dpI"
    :: Strip trailing \bin\
    if exist "!JAVA_EXE_PATH!..\bin\java.exe" (
        pushd "!JAVA_EXE_PATH!.."
        set "FOUND_JAVA_HOME=!CD!"
        popd
        goto :CONFIRM_JAVA
    )
)

:CONFIRM_JAVA
if not defined FOUND_JAVA_HOME (
    echo [ERROR] No Java 17+ installation could be found on your computer!
    echo.
    echo Please install Java 17 (Adoptium OpenJDK) from:
    echo https://adoptium.net/temurin/releases/?version=17
    echo.
    pause
    exit /b 1
)

echo [OK] Found JDK at: "%FOUND_JAVA_HOME%"
echo.

:: Set JAVA_HOME permanently
echo Setting JAVA_HOME environment variable...
setx JAVA_HOME "%FOUND_JAVA_HOME%" >nul 2>&1
set "JAVA_HOME=%FOUND_JAVA_HOME%"

:: Add to User PATH if not already present
echo Adding %%JAVA_HOME%%\bin to PATH...
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%B"

echo !USER_PATH! | find /i "%JAVA_HOME%\bin" >nul 2>&1
if errorlevel 1 (
    if defined USER_PATH (
        setx Path "%USER_PATH%;%JAVA_HOME%\bin" >nul 2>&1
    ) else (
        setx Path "%JAVA_HOME%\bin" >nul 2>&1
    )
    echo [OK] Added %%JAVA_HOME%%\bin to User PATH.
) else (
    echo [OK] %%JAVA_HOME%%\bin is already in PATH.
)

:: Search and configure ANDROID_HOME / ADB
echo.
echo Checking Android SDK / ADB tools...
set "FOUND_ANDROID_SDK="
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "FOUND_ANDROID_SDK=%LOCALAPPDATA%\Android\Sdk"
) else if exist "C:\Android\Sdk\platform-tools\adb.exe" (
    set "FOUND_ANDROID_SDK=C:\Android\Sdk"
)

if defined FOUND_ANDROID_SDK (
    echo [OK] Found Android SDK at: "%FOUND_ANDROID_SDK%"
    setx ANDROID_HOME "%FOUND_ANDROID_SDK%" >nul 2>&1
    echo !USER_PATH! | find /i "%FOUND_ANDROID_SDK%\platform-tools" >nul 2>&1
    if errorlevel 1 (
        setx Path "!USER_PATH!;%FOUND_ANDROID_SDK%\platform-tools" >nul 2>&1
        echo [OK] Added platform-tools (adb) to PATH.
    )
)

echo.
echo =====================================================================
echo             VERIFYING SYSTEM ENVIRONMENT
echo =====================================================================
echo JAVA_HOME = %JAVA_HOME%
echo.
echo Java Version Check:
"%JAVA_HOME%\bin\java.exe" -version
echo.
echo =====================================================================
echo  [SUCCESS] All environment variables are permanently configured!
echo  You can now launch PolyCrest App Studio without errors.
echo =====================================================================
echo.
pause
