#!/bin/sh
# Build PHP in Amazon Linux 2023 (build/Dockerfile) and copy the binary, the
# opcache extension and the shared libraries it needs into php-files/.

set -eu

cd "$(dirname "$0")"

image=lambda-php81

docker build -t "$image" .
container=$(docker create "$image")
trap 'docker rm "$container" > /dev/null' EXIT

# The extension directory name carries PHP's API version
# (no-debug-non-zts-20230831 for 8.3), so ask the build for it.
ext_dir=$(docker run --rm "$image" /work/php-81-bin/bin/php-config --extension-dir)

rm -f ../php-files/php ../php-files/exts/* ../php-files/lib/*
mkdir -p ../php-files/exts ../php-files/lib

docker cp "$container:/work/php-81-bin/bin/php" ../php-files/php
docker cp "$container:$ext_dir/opcache.so" ../php-files/exts/

for lib in \
  libsqlite3.so.0 \
  libcrypt.so.2 \
  libpng16.so.16 \
  libfreetype.so.6 \
  libonig.so.5 \
  libzip.so.5 \
  libharfbuzz.so.0 \
  libbrotlidec.so.1 \
  libgraphite2.so.3 \
  libbrotlicommon.so.1 \
  libjpeg.so.62 \
  libwebp.so.7
do
  docker cp -L "$container:/usr/lib64/$lib" "../php-files/lib/$lib"
done

strip ../php-files/php
strip ../php-files/lib/*.so.*
strip ../php-files/exts/*.so
