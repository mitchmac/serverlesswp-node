#!/bin/bash

HOST=${HOST:-Vercel}

docker run -e HOST=$HOST -p 9000:8080 -d --name serverlesswp-test docker-lambda-serverlesswp