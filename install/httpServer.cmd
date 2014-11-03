@echo off

::nodejs文件
set js=%~d0%~p0..\server.js

::参数
set argument=%~f1

::执行程序
echo node %js% %argument%
node --debug %js% %argument%

pause
