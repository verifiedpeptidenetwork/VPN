@echo off
cd /d "C:\Users\Saidk\OneDrive\Desktop\WEBSITES\RUIVPNDATA"
echo Adding all files...
git add .
git commit -m "Update site"
echo Pushing to GitHub...
git push origin main
echo Done! Site will update in 2-3 minutes.
pause
