#!/bin/bash

./build-test.sh

HOST=${HOST:-Vercel}

docker run -e HOST=$HOST -p 9000:8080 -d --name serverlesswp-test docker-lambda-serverlesswp

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/rss.png"}' | jq -e '.headers["x-serverlesswp-binary"] == "true"'

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php"}' | jq -e 'has("body")'

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/static.css"}' | jq -e 'has("body")'

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php"}' | jq -e 'if (.headers["set-cookie"] | length == 2) then true else false end'

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php"}' | jq '.headers["set-cookie"]'

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php", "preRequestPlugin": "1" }' | jq -e '.body == "Foo"'

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php", "postRequestPlugin": "1" }' | jq -e '.statusCode == 201'

docker stop serverlesswp-test
docker rm serverlesswp-test