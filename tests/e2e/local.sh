#!/bin/bash

./build-test.sh

HOST=${HOST:-Vercel}

docker run -e HOST=$HOST -p 9000:8080 -d --name serverlesswp-test docker-lambda-serverlesswp

./test-requests.sh

docker stop serverlesswp-test
docker logs serverlesswp-test
docker rm serverlesswp-test
