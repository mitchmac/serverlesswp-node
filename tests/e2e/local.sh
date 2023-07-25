#!/bin/bash

./build-test.sh

docker run -p 9000:8080 -d --name serverlesswp-local docker-lambda-serverlesswp

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/index.php"}'

curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"path":"/static.css"}'

docker stop serverlesswp-local
docker rm serverlesswp-local