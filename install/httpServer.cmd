@echo off

::nodejs�ļ�
set js=%~d0%~p0..\server.js

::����
set argument=%~f1

::ִ�г���
echo node %js% %argument%
node --debug %js% %argument%

pause
