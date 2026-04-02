@echo off
echo Building widget.js from source files...
type src\widget-config.js src\widget-content.js src\widget-routing.js src\widget-styles.js src\widget-engine-render.js src\widget-engine.js > widget.js
echo Done! widget.js rebuilt from source files.
pause
