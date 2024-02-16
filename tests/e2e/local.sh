#!/bin/bash

./build-test.sh

docker run -p 9000:8080 -d --name serverlesswp-local docker-lambda-serverlesswp

curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php"}' | grep -q '{"statusCode":200,"headers"' || echo 'fail 1'

curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php", "postRequestPlugin": "1"}' | grep -q '{"statusCode":201,"body":"Foo"}' || echo 'fail 2'

curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php", "preRequestPlugin": "1"}' | grep -q '{"statusCode":200,"body":"Foo"}' || echo 'fail 3'

curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/static.css"}' | grep -q 'background-color: blue' || echo 'fail 4'

docker stop serverlesswp-local
docker rm serverlesswp-local