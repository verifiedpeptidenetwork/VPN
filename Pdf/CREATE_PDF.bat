@echo off
echo Looking for Python...

where python >nul 2>&1
if %errorlevel%==0 (
    set PYTHON=python
    goto :found
)

where python3 >nul 2>&1
if %errorlevel%==0 (
    set PYTHON=python3
    goto :found
)

where py >nul 2>&1
if %errorlevel%==0 (
    set PYTHON=py
    goto :found
)

for /f "delims=" %%i in ('dir /b /s "C:\Users\%USERNAME%\AppData\Local\Programs\Python\python.exe" 2^>nul') do set PYTHON=%%i
if defined PYTHON goto :found

echo ERROR: Python not found. Please install Python from python.org
pause
exit /b 1

:found
echo Found Python: %PYTHON%
echo Installing Pillow...
%PYTHON% -m pip install Pillow --quiet
echo Building PDF...
%PYTHON% "%~dp0make_pdf.py"

if exist "%~dp0VPN_Peptide_Guide.pdf" (
    echo.
    echo SUCCESS! Opening PDF...
    start "" "%~dp0VPN_Peptide_Guide.pdf"
) else (
    echo.
    echo PDF was not created - check errors above.
)
pause
