#!/bin/bash

mkdir temp || rm -rf temp/*

cp -r ../../src/ ../../php-files ../../package.json ../../package-lock.json index.php router.php static.css temp

docker build --progress=plain -t docker-lambda-serverlesswp .

rm -rf temp