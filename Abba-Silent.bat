@echo off
if not DEFINED IS_MINIMIZED set IS_MINIMIZED=1 && start "" /min "%~dpnx0" %* && exit
cd /d "C:\Users\yosiw\dyad-enhanced"
npm start
exit
