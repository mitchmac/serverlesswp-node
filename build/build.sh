#!/bin/sh

rm ../php-files/php ../php-files/exts/opcache.so ../php-files/lib/*

docker build -t lambda-php81 .
container=$(docker create lambda-php81)
docker -D cp $container:/work/php-81-bin/bin/php ../php-files/php
docker -D cp $container:/work/php-81-bin/lib/php/extensions/no-debug-non-zts-20210902/opcache.so ../php-files/exts/
docker -D cp -L $container:/usr/lib64/libcrypt-2.26.so ../php-files/lib/libcrypt.so.1
docker -D cp -L $container:/usr/lib64/libonig.so.2.0.0 ../php-files/lib/libonig.so.2
docker -D cp -L $container:/usr/lib64/libcurl.so.4.8.0 ../php-files/lib/libcurl.so.4
docker -D cp -L $container:/usr/lib64/libzip.so.5.0.0 ../php-files/lib/libzip.so.5
docker -D cp -L $container:/usr/lib64/libxml2.so.2 ../php-files/lib/libxml2.so.2
docker -D cp -L $container:/usr/lib64/libssl3.so ../php-files/lib/libssl3.so
docker -D cp -L $container:/usr/lib64/libssh2.so.1 ../php-files/lib/libssh2.so.1
docker -D cp -L $container:/usr/lib64/libsqlite3.so.0.8.6 ../php-files/lib/libsqlite3.so.0
docker -D cp -L $container:/usr/lib64/libsmime3.so ../php-files/lib/libsmime3.so
docker -D cp -L $container:/usr/lib64/libsasl2.so.3 ../php-files/lib/libsasl2.so.3
docker -D cp -L $container:/usr/lib64/libnss3.so ../php-files/lib/libnss3.so
docker -D cp -L $container:/usr/lib64/liblzma.so.5 ../php-files/lib/liblzma.so.5
docker -D cp -L $container:/usr/lib64/libnghttp2.so.14 ../php-files/lib/libnghttp2.so.14
docker -D cp -L $container:/usr/lib64/libidn2.so.0 ../php-files/lib/libidn2.so.0
docker -D cp -L $container:/usr/lib64/libldap-2.4.so.2 ../php-files/lib/libldap-2.4.so.2
docker -D cp -L $container:/usr/lib64/liblber-2.4.so.2 ../php-files/lib/liblber-2.4.so.2
docker -D cp -L $container:/usr/lib64/libunistring.so.0 ../php-files/lib/libunistring.so.0

docker rm $container
