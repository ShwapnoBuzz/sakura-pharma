#!/bin/sh
cd "$(dirname "$0")"
echo "Sakura Pharma: http://localhost:8765"
(sleep 1; xdg-open http://localhost:8765/index.html 2>/dev/null || open http://localhost:8765/index.html 2>/dev/null) &
python3 -m http.server 8765
