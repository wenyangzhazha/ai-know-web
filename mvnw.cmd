@echo off
setlocal
set MAVEN_WRAPPER_JAR=%~dp0.mvn\wrapper\maven-wrapper.jar
if not exist "%MAVEN_WRAPPER_JAR%" (
    echo Downloading Maven Wrapper...
    powershell -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar' -OutFile '%MAVEN_WRAPPER_JAR%'"
)
set MAVEN_OPTS=-Xmx1024m -XX:MaxMetaspaceSize=256m
call "%MAVEN_WRAPPER_JAR%" %*
endlocal
