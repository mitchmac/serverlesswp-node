#!/bin/sh

rm ../php-files/php ../php-files/exts/* ../php-files/lib/*

docker build -t lambda-php81 .
container=$(docker create lambda-php81)

docker -D cp $container:/work/php-81-bin/bin/php ../php-files/php
docker -D cp $container:/work/php-81-bin/lib/php/extensions/no-debug-non-zts-20230831/opcache.so ../php-files/exts/

docker -D cp -L $container:/usr/lib64/libsqlite3.so.0.8.6 ../php-files/lib/libsqlite3.so.0
docker -D cp -L $container:/usr/lib64/libcrypt.so.2 ../php-files/lib/libcrypt.so.2
docker -D cp -L $container:/usr/lib64/libpng16.so.16 ../php-files/lib/libpng16.so.16
docker -D cp -L $container:/usr/lib64/libfreetype.so.6 ../php-files/lib/libfreetype.so.6
docker -D cp -L $container:/usr/lib64/libonig.so.5 ../php-files/lib/libonig.so.5
docker -D cp -L $container:/usr/lib64/libzip.so.5 ../php-files/lib/libzip.so.5
docker -D cp -L $container:/usr/lib64/libharfbuzz.so.0 ../php-files/lib/libharfbuzz.so.0
docker -D cp -L $container:/usr/lib64/libbrotlidec.so.1 ../php-files/lib/libbrotlidec.so.1
docker -D cp -L $container:/usr/lib64/libgraphite2.so.3 ../php-files/lib/libgraphite2.so.3
docker -D cp -L $container:/usr/lib64/libbrotlicommon.so.1 ../php-files/lib/libbrotlicommon.so.1

docker rm $container

strip ../php-files/php
strip ../php-files/lib/*.so.*
strip ../php-files/exts/*.so