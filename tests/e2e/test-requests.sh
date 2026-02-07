#!/bin/bash
set -eo pipefail

BASE_URL="http://localhost:9000/2015-03-31/functions/function/invocations"

echo "==> Check body is returned"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/hi"}' | jq -e 'has("body")'

echo "==> Check binary file is handled correctly"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/rss.png"}' | jq -e '.headers["x-serverlesswp-binary"] == "true"'

echo "==> Check CSS body is returned"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/static.css"}' | jq -e 'has("body")'

echo "==> Check cookies are returned"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php"}' | jq -e 'has("cookies") or (.headers | has("set-cookie")) or has("multiValueHeaders")'

echo "==> Check preRequest plugin"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "preRequestPlugin": "1"}' | jq -e '.body == "Foo"'

echo "==> Check postRequest plugin"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "postRequestPlugin": "1"}' | jq -e '.statusCode == 302'

echo "==> Check postRequest retry"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "retry": "1"}' | jq -e '.body == 2'

echo "==> Check streaming response"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "streaming": true}' | jq -e '.streaming == true'

echo "==> Check streaming body"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "streaming": true}' | jq -e '.body == "hello"'

echo "==> Check streaming cookies"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "streaming": true}' | jq -e 'if (.cookies | length == 2) then true else false end'

echo "==> Check streaming cache-control"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/static.css", "streaming": true}' | jq -e '.headers["cache-control"] != null'

echo "==> Check streaming preRequest plugin"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "streaming": true, "preRequestPlugin": "1"}' | jq -e '.body == "Foo"'

echo "==> Check streaming postRequest plugin"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "streaming": true, "postRequestPlugin": "1"}' | jq -e '.statusCode == 302'

echo "==> Check streaming retry"
curl -sf -XPOST "$BASE_URL" -d '{"path":"/index.php", "streaming": true, "retry": "1"}' | jq -e '.streaming == true'

echo "All tests passed!"
