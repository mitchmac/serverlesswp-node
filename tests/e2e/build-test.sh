#!/bin/bash

mkdir temp || rm -rf temp/*

cp -r ../../src/ ../../php-files ../../package.json ../../package-lock.json index.php router.php static.css rss.png temp

docker build --no-cache --progress=plain -t docker-lambda-serverlesswp .

rm -rf temp